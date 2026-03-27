import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, apiKeyAPI, webhooksAPI, usageStatsAPI } from "../lib/api";
import { copyToClipboard, getTierColorClass, parseApiError, validateRequired, validateUrl } from "../lib/utils";
import { trackEvent, EventNames } from "../lib/analytics";
import FeedbackModal from "../components/FeedbackModal";
import PlanCard from "../components/PlanCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  Bot,
  LogOut,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Zap,
  Sparkles,
  Webhook,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Terminal,
  AlertCircle,
  FlaskConical,
  Settings,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { changelog } from "../data/changelog";
import { EcosystemIntegrationCard } from "../components/CrossToolComponents";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";
const BASE_URL = "https://arl.agentauthority.dev";

// Inline field error component
function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1" role="alert">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

// Skeleton loading block
function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse bg-white/[0.06] rounded-sm ${className}`} />
  );
}

// Code snippet with copy button
function CodeSnippet({ code, onCopy, copiedId, snippetId }) {
  const isCopied = copiedId === snippetId;
  
  return (
    <div className="relative group">
      <pre className="bg-[#050709] border border-white/[0.06] rounded-sm p-3 overflow-x-auto text-[12px] font-mono text-[#E5E7EB] leading-relaxed whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code, snippetId)}
        className="absolute top-2 right-2 p-1.5 rounded-sm bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
        data-testid={`copy-snippet-${snippetId}`}
      >
        {isCopied ? (
          <Check className="w-3 h-3 text-[#22C55E]" />
        ) : (
          <Copy className="w-3 h-3 text-[#9CA3AF]" />
        )}
      </button>
    </div>
  );
}

// API Quickstart Panel Component
function ApiQuickstartPanel({ apiKey }) {
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem("repledger_quickstart_expanded");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showKey, setShowKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  
  const maskedKey = apiKey ? `${apiKey.substring(0, 8)}${'•'.repeat(32)}${apiKey.substring(apiKey.length - 4)}` : '';
  const displayKey = showKey ? apiKey : maskedKey;
  
  const handleCopySnippet = async (code, snippetId) => {
    await copyToClipboard(code);
    setCopiedSnippet(snippetId);
    toast.success("Copied to clipboard");
    // Track badge copy event
    if (snippetId === "badge") {
      trackEvent(EventNames.BADGE_COPIED);
    }
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem("repledger_quickstart_expanded", JSON.stringify(newExpanded));
    if (newExpanded) {
      trackEvent(EventNames.QUICKSTART_OPENED);
    }
  };
  
  const snippets = {
    register: `curl -X POST ${BASE_URL}/v1/agents \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-agent", "description": "My first agent"}'`,
    
    outcome: `curl -X POST ${BASE_URL}/v1/agents/agt_YOUR_AGENT_ID/outcomes \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"result": "success", "task_type": "api-call", "submitter_type": "self"}'`,
    
    score: `curl -X GET ${BASE_URL}/v1/agents/agt_YOUR_AGENT_ID/score \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"`,
    
    badge: `<img src="${BASE_URL}/v1/agents/agt_YOUR_AGENT_ID/badge.svg" alt="Agent Badge" />`
  };

  return (
    <section className="card-surface" data-testid="api-quickstart-panel">
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between p-5"
        data-testid="quickstart-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#01696F]" />
          </div>
          <div className="text-left">
            <h2 className="text-[14px] font-semibold text-white">API Quickstart</h2>
            <p className="text-[12px] text-[#6B7280]">
              Get started with 4 simple API calls
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#6B7280]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6B7280]" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-5 pb-5 space-y-6">
          {/* Step 1: API Key */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">1</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Get your API key</h3>
            </div>
            <div className="ml-7">
              <p className="text-[12px] text-[#6B7280] mb-2">
                Your API key is ready to use. Include it in the Authorization header:
              </p>
              <div className="relative">
                <div className="bg-[#050709] border border-white/[0.06] rounded-sm p-3 flex items-center justify-between gap-2">
                  <code className="text-[12px] font-mono text-[#01696F] break-all">
                    Authorization: Bearer {displayKey}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1 rounded hover:bg-white/5 text-[#6B7280] hover:text-white transition-colors flex-shrink-0"
                    data-testid="toggle-key-visibility"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Register Agent */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">2</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Register an agent</h3>
            </div>
            <div className="ml-7">
              <p className="text-[12px] text-[#6B7280] mb-2">
                Create an identity for your agent in the ledger:
              </p>
              <CodeSnippet 
                code={snippets.register} 
                onCopy={handleCopySnippet}
                copiedId={copiedSnippet}
                snippetId="register"
              />
              <p className="text-[11px] text-[#4B5563] mt-2">
                Response includes your <code className="text-[#01696F]">agent_id</code> — save it for the next steps.
              </p>
            </div>
          </div>

          {/* Step 3: Log Outcomes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">3</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Log outcomes</h3>
            </div>
            <div className="ml-7">
              <p className="text-[12px] text-[#6B7280] mb-2">
                Submit outcomes as your agent completes tasks:
              </p>
              <CodeSnippet 
                code={snippets.outcome} 
                onCopy={handleCopySnippet}
                copiedId={copiedSnippet}
                snippetId="outcome"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] font-mono">success</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-mono">failure</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-mono">partial</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#6B7280]/10 text-[#6B7280] font-mono">timeout</span>
              </div>
            </div>
          </div>

          {/* Step 4: Fetch Score & Badge */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">4</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Fetch score & badge</h3>
            </div>
            <div className="ml-7 space-y-4">
              <div>
                <p className="text-[12px] text-[#6B7280] mb-2">
                  Get the current reputation score and tier:
                </p>
                <CodeSnippet 
                  code={snippets.score} 
                  onCopy={handleCopySnippet}
                  copiedId={copiedSnippet}
                  snippetId="score"
                />
              </div>
              <div>
                <p className="text-[12px] text-[#6B7280] mb-2">
                  Embed a live badge anywhere:
                </p>
                <CodeSnippet 
                  code={snippets.badge} 
                  onCopy={handleCopySnippet}
                  copiedId={copiedSnippet}
                  snippetId="badge"
                />
              </div>
            </div>
          </div>

          {/* Link to full docs */}
          <div className="ml-7 pt-2 border-t border-white/[0.04]">
            <Link 
              to="/developers" 
              className="inline-flex items-center gap-1.5 text-[12px] text-[#01696F] hover:text-[#028C94] transition-colors"
              data-testid="view-full-docs-link"
            >
              <Terminal className="w-3.5 h-3.5" />
              View full API documentation
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// Tier badge component
function TierBadge({ tier, size = "default" }) {
  const sizeClasses = {
    small: "px-2 py-0.5 text-[9px]",
    default: "px-2.5 py-1 text-[10px]",
    large: "px-3 py-1.5 text-[11px]",
  };

  return (
    <span 
      className={`tier-badge ${getTierColorClass(tier)} ${sizeClasses[size]}`}
      data-testid={`tier-badge-${tier.toLowerCase()}`}
    >
      {tier}
    </span>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [apiKey, setApiKey] = useState(null);
  const [agents, setAgents] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [deletingWebhook, setDeletingWebhook] = useState(null);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [hasDemoAgent, setHasDemoAgent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    owner_handle: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [webhookFormData, setWebhookFormData] = useState({
    url: "",
    description: "",
  });
  const [webhookFormErrors, setWebhookFormErrors] = useState({});
  const [usageStats, setUsageStats] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadData();
    // Track dashboard loaded event
    trackEvent(EventNames.DASHBOARD_LOADED);
    
    // Check for billing success/cancel params
    const billingStatus = searchParams.get("billing");
    if (billingStatus === "success") {
      toast.success("Subscription activated! Your new plan is now active.");
      searchParams.delete("billing");
      setSearchParams(searchParams, { replace: true });
    } else if (billingStatus === "cancelled") {
      toast.info("Checkout cancelled. No changes made.");
      searchParams.delete("billing");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const loadData = async () => {
    try {
      const [apiKeyData, agentsData, webhooksData, statsData] = await Promise.all([
        apiKeyAPI.get(),
        agentsAPI.list(),
        webhooksAPI.list(),
        usageStatsAPI.get(),
      ]);
      setApiKey(apiKeyData);
      setAgents(agentsData);
      setWebhooks(webhooksData.webhooks || []);
      setUsageStats(statsData);
      // Check if user already has a demo agent
      const demoExists = agentsData.some(a => a.name === "Sample Support Bot");
      setHasDemoAgent(demoExists);
    } catch (error) {
      console.error("Failed to load data:", error);
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = async () => {
    if (apiKey) {
      await copyToClipboard(apiKey.api_key);
      setCopied(true);
      toast.success("API key copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const data = await apiKeyAPI.regenerate();
      setApiKey(data);
      toast.success("API key regenerated");
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setRegenerating(false);
    }
  };

  const validateAgentForm = () => {
    const errors = {};
    const nameError = validateRequired(formData.name, "Name");
    if (nameError) errors.name = nameError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    
    if (!validateAgentForm()) {
      return;
    }
    
    setCreating(true);

    try {
      const newAgent = await agentsAPI.create({
        name: formData.name,
        description: formData.description || null,
        owner_handle: formData.owner_handle || null,
      });
      // Track agent created event
      trackEvent(EventNames.AGENT_CREATED, { agent_id: newAgent.agent_id });
      const agentsData = await agentsAPI.list();
      setAgents(agentsData);
      setDialogOpen(false);
      setFormData({ name: "", description: "", owner_handle: "" });
      setFormErrors({});
      toast.success("Agent registered");
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.fields && Object.keys(parsed.fields).length > 0) {
        setFormErrors(parsed.fields);
      } else {
        toast.error(parsed.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const validateWebhookForm = () => {
    const errors = {};
    const urlError = validateUrl(webhookFormData.url);
    if (urlError) errors.url = urlError;
    setWebhookFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    
    if (!validateWebhookForm()) {
      return;
    }
    
    setCreatingWebhook(true);

    try {
      await webhooksAPI.create({
        url: webhookFormData.url,
        events: ["outcome.created"],
        description: webhookFormData.description || null,
      });
      const webhooksData = await webhooksAPI.list();
      setWebhooks(webhooksData.webhooks || []);
      setWebhookDialogOpen(false);
      setWebhookFormData({ url: "", description: "" });
      setWebhookFormErrors({});
      toast.success("Webhook created");
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.fields && Object.keys(parsed.fields).length > 0) {
        setWebhookFormErrors(parsed.fields);
      } else {
        toast.error(parsed.message);
      }
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    setDeletingWebhook(webhookId);
    try {
      await webhooksAPI.delete(webhookId);
      setWebhooks(webhooks.filter((w) => w.id !== webhookId));
      toast.success("Webhook deleted");
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setDeletingWebhook(null);
    }
  };

  const handleCreateDemoAgent = async () => {
    setCreatingDemo(true);
    try {
      const result = await agentsAPI.createDemo();
      if (result.is_new) {
        toast.success("Demo agent created with sample outcomes!");
      } else {
        toast.info("You already have a demo agent.");
      }
      // Refresh agents list
      const agentsData = await agentsAPI.list();
      setAgents(agentsData);
      setHasDemoAgent(true);
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setCreatingDemo(false);
    }
  };

  // Skeleton loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709]">
        {/* Header skeleton */}
        <header className="h-14 border-b border-white/[0.08] bg-[#050709]">
          <div className="container-app flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-6 h-6" />
              <SkeletonBlock className="w-20 h-3" />
            </div>
            <div className="flex items-center gap-4">
              <SkeletonBlock className="w-32 h-4" />
              <SkeletonBlock className="w-16 h-4" />
              <SkeletonBlock className="w-16 h-4" />
            </div>
          </div>
        </header>

        <main className="container-app py-8">
          <div className="space-y-8">
            {/* Title skeleton */}
            <div>
              <SkeletonBlock className="w-64 h-7 mb-2" />
              <SkeletonBlock className="w-80 h-4" />
            </div>

            {/* Usage stats skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-surface p-4">
                  <SkeletonBlock className="w-20 h-3 mb-3" />
                  <SkeletonBlock className="w-12 h-8" />
                </div>
              ))}
            </div>

            {/* API Key skeleton */}
            <div className="card-surface p-6">
              <div className="flex items-center justify-between mb-5">
                <SkeletonBlock className="w-24 h-5" />
                <SkeletonBlock className="w-20 h-4" />
              </div>
              <SkeletonBlock className="w-full h-10" />
            </div>

            {/* Agents skeleton */}
            <div className="card-surface p-6">
              <SkeletonBlock className="w-32 h-5 mb-5" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-white/[0.08] rounded-sm p-4">
                    <SkeletonBlock className="w-3/4 h-5 mb-2" />
                    <SkeletonBlock className="w-1/2 h-4 mb-4" />
                    <SkeletonBlock className="w-16 h-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#050709]">
        <div className="container-app flex items-center justify-between h-full">
          <Link to="/" className="flex items-center gap-3">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
            <span className="text-[11px] font-medium text-[#01696F] uppercase tracking-wider">Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-5">
            <span className="text-[13px] text-[#6B7280]">{user?.email}</span>
            <Link
              to="/docs"
              data-testid="docs-link"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Docs
            </Link>
            <Link
              to="/playground"
              data-testid="playground-link"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Playground
            </Link>
            <button
              onClick={() => {
                setFeedbackModalOpen(true);
                trackEvent(EventNames.FEEDBACK_OPENED);
              }}
              data-testid="feedback-btn"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </button>
            <Link
              to="/settings"
              data-testid="settings-link"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        <div className="space-y-8">
          {/* Page header */}
          <div>
            <h1 className="text-[22px] font-semibold text-white tracking-tight">
              Agent Reputation Ledger
            </h1>
            <p className="text-[13px] text-[#6B7280] mt-1">
              Manage API access and monitor agent track records
            </p>
          </div>

          {/* Usage Overview - Moved to top for immediate visibility */}
          {usageStats && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="usage-overview">
              <div className="card-surface p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4 text-[#01696F]" />
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Agents</span>
                </div>
                <p className="text-2xl font-semibold text-white" data-testid="stat-total-agents">
                  {usageStats.total_agents}
                </p>
              </div>
              
              <div className="card-surface p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-[#01696F]" />
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Total Outcomes</span>
                </div>
                <p className="text-2xl font-semibold text-white" data-testid="stat-total-outcomes">
                  {usageStats.total_outcomes}
                </p>
              </div>
              
              <div className="card-surface p-4">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-[#01696F]" />
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Last 7 Days</span>
                </div>
                <p className="text-2xl font-semibold text-white" data-testid="stat-outcomes-7d">
                  {usageStats.outcomes_last_7_days}
                </p>
              </div>
              
              <div className="card-surface p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#01696F]" />
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Avg. Score</span>
                </div>
                <p className={`text-2xl font-semibold ${usageStats.avg_score > 0 ? "text-white" : "text-[#6B7280]"}`} data-testid="stat-avg-score">
                  {usageStats.avg_score > 0 ? usageStats.avg_score : "—"}
                </p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">Agents with 5+ outcomes</p>
              </div>
            </section>
          )}

          {/* API Key Section */}
          <section className="api-key-block">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
                  <Key className="w-4 h-4 text-[#01696F]" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-white">API Key</h2>
                  <p className="text-[12px] text-[#6B7280]">
                    Use this key for all v1 API requests
                  </p>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    data-testid="regenerate-key-btn"
                    className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    {regenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Regenerate
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0C1116] border-white/[0.08]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#F97316]" />
                      Regenerate API Key?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9CA3AF] text-[13px]">
                      Your current key will be revoked immediately. Update all integrations with the new key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/[0.08] text-white hover:bg-white/5 text-[13px]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerate}
                      className="bg-[#01696F] text-white hover:bg-[#028C94] text-[13px]"
                      data-testid="confirm-regenerate-btn"
                    >
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center gap-2">
              <code className="api-key-value flex-1" data-testid="api-key-display">
                {showApiKey
                  ? apiKey?.api_key
                  : `${apiKey?.api_key?.substring(0, 8)}${'•'.repeat(32)}${apiKey?.api_key?.substring(apiKey?.api_key?.length - 4)}`
                }
              </code>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
                data-testid="toggle-api-key-visibility"
                className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-10 px-3"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyKey}
                data-testid="copy-api-key-btn"
                className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-10 px-3"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#22C55E]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </section>

          {/* API Quickstart Panel */}
          <ApiQuickstartPanel apiKey={apiKey?.api_key} />

          {/* Plan Card */}
          <PlanCard />
          
          {/* Ecosystem Integration Card (conditional - only shows if org is linked) */}
          <EcosystemIntegrationCard user={user} agents={agents} />

          {/* Agents Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#01696F]" />
                <h2 className="text-[15px] font-semibold text-white">Registered Agents</h2>
                <span className="text-[12px] text-[#6B7280] ml-1">({agents.length})</span>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="new-agent-btn"
                    className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Register Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0C1116] border-white/[0.08] text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white text-[16px]">Register New Agent</DialogTitle>
                    <DialogDescription className="text-[#9CA3AF] text-[13px]">
                      Create an identity for your agent in the ledger.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAgent} className="space-y-5 mt-4" noValidate>
                    <div className="space-y-1">
                      <Label htmlFor="name" className="form-label">
                        Agent Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                        }}
                        placeholder="e.g., research-agent-v2"
                        data-testid="agent-name-input"
                        className={`form-input ${formErrors.name ? "border-red-400 focus:border-red-400" : ""}`}
                        aria-invalid={formErrors.name ? "true" : "false"}
                      />
                      <FieldError message={formErrors.name} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="description" className="form-label">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Brief description of the agent's purpose"
                        data-testid="agent-description-input"
                        className="form-input min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="owner_handle" className="form-label">
                        Owner Handle
                      </Label>
                      <Input
                        id="owner_handle"
                        value={formData.owner_handle}
                        onChange={(e) =>
                          setFormData({ ...formData, owner_handle: e.target.value })
                        }
                        placeholder="e.g., @acme-labs"
                        data-testid="agent-owner-input"
                        className="form-input"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDialogOpen(false)}
                        className="text-[#9CA3AF] hover:text-white hover:bg-white/5 text-[13px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={creating || !formData.name}
                        data-testid="submit-agent-btn"
                        className="bg-[#01696F] hover:bg-[#028C94] text-white text-[13px]"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          "Register Agent"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {agents.length === 0 ? (
              <div className="card-surface empty-state">
                <Bot className="empty-state-icon" />
                <h3 className="empty-state-title">No agents registered</h3>
                <p className="empty-state-description">
                  Register your first agent to start building its track record
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Button
                    onClick={() => setDialogOpen(true)}
                    data-testid="create-first-agent-btn"
                    className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Register First Agent
                  </Button>
                  {!hasDemoAgent && (
                    <Button
                      onClick={handleCreateDemoAgent}
                      disabled={creatingDemo}
                      variant="outline"
                      data-testid="create-demo-agent-btn"
                      className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-9 px-4 text-[13px]"
                    >
                      {creatingDemo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                          Try with Demo Agent
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Demo Agent Banner */}
                {agents.some(a => a.name === "Sample Support Bot") && (
                  <div 
                    className="mb-4 p-3 bg-[#01696F]/10 border border-[#01696F]/20 rounded-md flex items-start gap-2"
                    data-testid="demo-agent-banner"
                  >
                    <Sparkles className="w-4 h-4 text-[#01696F] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] text-[#01696F] font-medium">Demo Data</p>
                      <p className="text-[12px] text-[#6B7280]">
                        "Sample Support Bot" is a demo agent with sample outcomes. Feel free to explore and then register your own agents!
                      </p>
                    </div>
                  </div>
                )}
                <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                <table className="data-table" data-testid="agents-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Tier</th>
                      <th className="hidden sm:table-cell">Score</th>
                      <th className="hidden md:table-cell">Outcomes</th>
                      <th className="hidden md:table-cell">Success Rate</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr 
                        key={agent.agent_id} 
                        data-testid={`agent-row-${agent.agent_id}`}
                        onClick={() => window.location.href = `/agents/${agent.agent_id}`}
                        className="cursor-pointer hover:bg-white/[0.02]"
                      >
                        <td>
                          <div>
                            <div className="text-white font-medium text-[13px]">{agent.name}</div>
                            <code className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono break-all">
                              {agent.agent_id}
                            </code>
                          </div>
                        </td>
                        <td>
                          <TierBadge tier={agent.tier} />
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className="score-display-md">
                            {agent.score}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-[#9CA3AF] font-mono text-[13px]">
                            {agent.outcome_count}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-[#9CA3AF] font-mono text-[13px]">
                            {agent.success_rate}%
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/agents/${agent.agent_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-[#6B7280] hover:text-white hover:bg-white/5 transition-colors"
                            data-testid={`view-agent-${agent.agent_id}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
              </>
            )}
          </section>

          {/* Webhooks Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#01696F]" />
                <h2 className="text-[15px] font-semibold text-white">Webhooks</h2>
                <span className="text-[12px] text-[#6B7280] ml-1">({webhooks.length})</span>
              </div>
              
              <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="new-webhook-btn"
                    className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0C1116] border-white/[0.08] text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white text-[16px]">Add Webhook</DialogTitle>
                    <DialogDescription className="text-[#9CA3AF] text-[13px]">
                      Receive HTTP POST notifications when outcomes are logged.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateWebhook} className="space-y-5 mt-4" noValidate>
                    <div className="space-y-1">
                      <Label htmlFor="webhook-url" className="form-label">
                        Webhook URL <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        value={webhookFormData.url}
                        onChange={(e) => {
                          setWebhookFormData({ ...webhookFormData, url: e.target.value });
                          if (webhookFormErrors.url) setWebhookFormErrors({ ...webhookFormErrors, url: null });
                        }}
                        placeholder="https://your-server.com/webhook"
                        data-testid="webhook-url-input"
                        className={`form-input ${webhookFormErrors.url ? "border-red-400 focus:border-red-400" : ""}`}
                        aria-invalid={webhookFormErrors.url ? "true" : "false"}
                      />
                      <FieldError message={webhookFormErrors.url} />
                      {!webhookFormErrors.url && (
                        <p className="text-[11px] text-[#6B7280]">
                          We'll POST a JSON payload to this URL for each outcome event.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="webhook-description" className="form-label">
                        Description
                      </Label>
                      <Input
                        id="webhook-description"
                        value={webhookFormData.description}
                        onChange={(e) =>
                          setWebhookFormData({ ...webhookFormData, description: e.target.value })
                        }
                        placeholder="e.g., Production monitoring"
                        data-testid="webhook-description-input"
                        className="form-input"
                      />
                    </div>

                    <div className="p-3 bg-[#1F2933]/50 rounded-md">
                      <p className="text-[11px] text-[#9CA3AF] font-medium mb-2">Event Type</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[#01696F]/20 text-[#01696F] text-[11px] font-mono rounded">
                          outcome.created
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setWebhookDialogOpen(false)}
                        className="text-[#9CA3AF] hover:text-white hover:bg-white/5 text-[13px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={creatingWebhook || !webhookFormData.url}
                        data-testid="submit-webhook-btn"
                        className="bg-[#01696F] hover:bg-[#028C94] text-white text-[13px]"
                      >
                        {creatingWebhook ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Webhook"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {webhooks.length === 0 ? (
              <div className="card-surface empty-state">
                <Webhook className="empty-state-icon" />
                <h3 className="empty-state-title">No webhooks configured</h3>
                <p className="empty-state-description">
                  Add a webhook to receive real-time notifications when outcomes are logged
                </p>
                <Button
                  onClick={() => setWebhookDialogOpen(true)}
                  data-testid="create-first-webhook-btn"
                  className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add First Webhook
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="card-surface p-4 flex items-center justify-between"
                    data-testid={`webhook-row-${webhook.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-[13px] text-white font-mono truncate max-w-[400px]">
                          {webhook.url}
                        </code>
                        <a
                          href={webhook.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6B7280] hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        {webhook.description && (
                          <span className="text-[12px] text-[#6B7280]">
                            {webhook.description}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          {webhook.events?.map((event) => (
                            <span
                              key={event}
                              className="px-1.5 py-0.5 bg-[#01696F]/20 text-[#01696F] text-[10px] font-mono rounded"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          data-testid={`delete-webhook-${webhook.id}`}
                          className="p-2 text-[#6B7280] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          disabled={deletingWebhook === webhook.id}
                        >
                          {deletingWebhook === webhook.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0C1116] border-white/[0.08]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            Delete Webhook?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-[#9CA3AF] text-[13px]">
                            This webhook will stop receiving notifications immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-white/[0.08] text-white hover:bg-white/5 text-[13px]">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            className="bg-red-500 text-white hover:bg-red-600 text-[13px]"
                            data-testid={`confirm-delete-webhook-${webhook.id}`}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* What's New Panel */}
          <section className="card-surface p-5" data-testid="whats-new-panel">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#01696F]" />
              <h2 className="text-[14px] font-semibold text-white">What's New</h2>
            </div>
            <div className="space-y-3">
              {changelog.slice(0, 5).map((item, index) => (
                <div key={index} className="flex gap-3 text-[12px]">
                  <span className="text-[#6B7280] font-mono whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div>
                    <span className="text-white">{item.title}</span>
                    {item.description && (
                      <span className="text-[#6B7280]"> — {item.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={feedbackModalOpen} 
        onClose={() => setFeedbackModalOpen(false)} 
      />
    </div>
  );
}
