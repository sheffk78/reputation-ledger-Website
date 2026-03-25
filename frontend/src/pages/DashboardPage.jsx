import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, apiKeyAPI } from "../lib/api";
import { copyToClipboard, getTierColorClass } from "../lib/utils";
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
  Zap
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

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
  
  const [apiKey, setApiKey] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    owner_handle: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [apiKeyData, agentsData] = await Promise.all([
        apiKeyAPI.get(),
        agentsAPI.list(),
      ]);
      setApiKey(apiKeyData);
      setAgents(agentsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
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
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await agentsAPI.create({
        name: formData.name,
        description: formData.description || null,
        owner_handle: formData.owner_handle || null,
      });
      const agentsData = await agentsAPI.list();
      setAgents(agentsData);
      setDialogOpen(false);
      setFormData({ name: "", description: "", owner_handle: "" });
      toast.success("Agent registered");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to create agent";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#050709]">
        <div className="container-app flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
            <span className="text-[11px] font-medium text-[#01696F] uppercase tracking-wider">Dashboard</span>
          </div>
          
          <div className="flex items-center gap-5">
            <span className="text-[13px] text-[#6B7280]">{user?.email}</span>
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
                {apiKey?.api_key}
              </code>
              
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
                  <form onSubmit={handleCreateAgent} className="space-y-5 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="form-label">
                        Agent Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., research-agent-v2"
                        required
                        data-testid="agent-name-input"
                        className="form-input"
                      />
                    </div>

                    <div className="space-y-2">
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

                    <div className="space-y-2">
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
                <Button
                  onClick={() => setDialogOpen(true)}
                  data-testid="create-first-agent-btn"
                  className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Register First Agent
                </Button>
              </div>
            ) : (
              <div className="card-surface overflow-hidden">
                <table className="data-table" data-testid="agents-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Tier</th>
                      <th>Score</th>
                      <th>Outcomes</th>
                      <th>Success Rate</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.agent_id} data-testid={`agent-row-${agent.agent_id}`}>
                        <td>
                          <div>
                            <div className="text-white font-medium text-[13px]">{agent.name}</div>
                            <code className="text-[11px] text-[#6B7280] font-mono">
                              {agent.agent_id}
                            </code>
                          </div>
                        </td>
                        <td>
                          <TierBadge tier={agent.tier} />
                        </td>
                        <td>
                          <span className="score-display-md">
                            {agent.score}
                          </span>
                        </td>
                        <td>
                          <span className="text-[#9CA3AF] font-mono text-[13px]">
                            {agent.outcome_count}
                          </span>
                        </td>
                        <td>
                          <span className="text-[#9CA3AF] font-mono text-[13px]">
                            {agent.success_rate}%
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/agents/${agent.agent_id}`}
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
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
