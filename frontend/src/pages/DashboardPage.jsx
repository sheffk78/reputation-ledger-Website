import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, apiKeyAPI, webhooksAPI, usageStatsAPI } from "../lib/api";
import { parseApiError } from "../lib/utils";
import { trackEvent, EventNames } from "../lib/analytics";
import FeedbackModal from "../components/FeedbackModal";
import PlanCard from "../components/PlanCard";
import { EcosystemIntegrationCard } from "../components/CrossToolComponents";
import { 
  LogOut, 
  Loader2, 
  BookOpen, 
  FlaskConical, 
  Settings, 
  MessageSquare 
} from "lucide-react";
import { toast } from "sonner";

// Dashboard components
import {
  SkeletonBlock,
  UsageStatsSection,
  ApiKeySection,
  ApiQuickstartPanel,
  AgentsSection,
  WebhooksSection,
  WhatsNewSection,
} from "../components/dashboard";

const LOGO_URL = "/repledger-logo-dark.svg";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [apiKey, setApiKey] = useState(null);
  const [agents, setAgents] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState(null);
  const [hasDemoAgent, setHasDemoAgent] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  useEffect(() => {
    loadData();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709]">
        <header className="h-14 border-b border-white/[0.08] bg-[#050709]">
          <div className="container-app flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <Link to="/">
                <img src={LOGO_URL} alt="RepLedger" className="h-6" />
              </Link>
              <span className="text-[11px] font-medium text-[#01696F] uppercase tracking-wider">Dashboard</span>
            </div>
          </div>
        </header>
        <main className="container-app py-8 space-y-6">
          <SkeletonBlock className="h-8 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="h-24" />)}
          </div>
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-48" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#050709]">
        <div className="container-app flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={LOGO_URL} alt="RepLedger" className="h-6" />
            </Link>
            <span className="text-[11px] font-medium text-[#01696F] uppercase tracking-wider">Dashboard</span>
          </div>
          
          <div className="flex items-center gap-5">
            <span className="text-[13px] text-[#6B7280] hidden sm:block">{user?.email}</span>
            
            <Link
              to="/docs"
              data-testid="docs-link"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </Link>
            
            <Link
              to="/playground"
              data-testid="playground-link"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Playground</span>
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
              <span className="hidden sm:inline">Feedback</span>
            </button>
            
            <Link
              to="/settings"
              data-testid="settings-link"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-[20px] font-semibold text-white tracking-tight">
              Agent Reputation Ledger
            </h1>
            <p className="text-[13px] text-[#6B7280] mt-1">
              Manage API access and monitor agent track records
            </p>
          </div>

          {/* Usage Overview */}
          <UsageStatsSection usageStats={usageStats} />

          {/* API Key Section */}
          <ApiKeySection apiKey={apiKey} onApiKeyUpdate={setApiKey} />

          {/* API Quickstart Panel */}
          <ApiQuickstartPanel apiKey={apiKey?.api_key} />

          {/* Plan Card */}
          <PlanCard />
          
          {/* Ecosystem Integration Card */}
          <EcosystemIntegrationCard user={user} agents={agents} />

          {/* Agents Section */}
          <AgentsSection 
            agents={agents} 
            onAgentsUpdate={setAgents}
            hasDemoAgent={hasDemoAgent}
            onDemoAgentCreated={() => setHasDemoAgent(true)}
          />

          {/* Webhooks Section */}
          <WebhooksSection 
            webhooks={webhooks} 
            onWebhooksUpdate={setWebhooks}
          />

          {/* What's New Panel */}
          <WhatsNewSection />
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
