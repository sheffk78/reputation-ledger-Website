import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, apiKeyAPI } from "../lib/api";
import { formatDateTime, copyToClipboard, getTierColorClass } from "../lib/utils";
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
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

// Tier badge component
function TierBadge({ tier }) {
  return (
    <span className={`tier-badge ${getTierColorClass(tier)}`} data-testid={`tier-badge-${tier.toLowerCase()}`}>
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
      toast.success("API key copied to clipboard");
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
      // Reload agents to get computed fields
      const agentsData = await agentsAPI.list();
      setAgents(agentsData);
      setDialogOpen(false);
      setFormData({ name: "", description: "", owner_handle: "" });
      toast.success("Agent created successfully");
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
      <header className="h-16 border-b border-white/10 bg-[#0C1116]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-full">
          <img src={LOGO_URL} alt="RepLedger" className="h-7" />
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9CA3AF]">{user?.email}</span>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-150"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="text-[#9CA3AF] mt-1">
              Manage your API key and agents
            </p>
          </div>

          {/* API Key Section */}
          <section className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-[#01696F]" />
              </div>
              <div>
                <h2 className="text-white font-medium">Your API Key</h2>
                <p className="text-sm text-[#6B7280]">
                  Use this key to authenticate API requests
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <code
                className="flex-1 bg-[#050709] border border-white/10 rounded-sm px-4 py-3 text-sm text-[#9CA3AF] font-mono truncate"
                data-testid="api-key-display"
              >
                {apiKey?.api_key}
              </code>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyKey}
                data-testid="copy-api-key-btn"
                className="border-white/10 text-white hover:bg-white/5 h-12 w-12 shrink-0"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-[#22C55E]" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="regenerate-key-btn"
                    className="border-white/10 text-white hover:bg-white/5 h-12 shrink-0"
                  >
                    {regenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-2">Regenerate</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0C1116] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                      Regenerate API Key?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9CA3AF]">
                      This will immediately invalidate your current API key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerate}
                      className="bg-[#01696F] text-white hover:bg-[#028C94]"
                      data-testid="confirm-regenerate-btn"
                    >
                      Yes, regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>

          {/* Agents Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Agents</h2>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="new-agent-btn"
                    className="bg-[#01696F] hover:bg-[#028C94] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0C1116] border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Register New Agent</DialogTitle>
                    <DialogDescription className="text-[#9CA3AF]">
                      Create a new agent identity in RepLedger.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAgent} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#9CA3AF]">
                        Agent Name <span className="text-red-500">*</span>
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
                        className="bg-[#050709] border-white/10 text-white placeholder:text-[#6B7280]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[#9CA3AF]">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="What does this agent do?"
                        data-testid="agent-description-input"
                        className="bg-[#050709] border-white/10 text-white placeholder:text-[#6B7280] min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_handle" className="text-[#9CA3AF]">
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
                        className="bg-[#050709] border-white/10 text-white placeholder:text-[#6B7280]"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDialogOpen(false)}
                        className="text-[#9CA3AF] hover:text-white hover:bg-white/5"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={creating || !formData.name}
                        data-testid="submit-agent-btn"
                        className="bg-[#01696F] hover:bg-[#028C94] text-white"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Agent"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {agents.length === 0 ? (
              <div className="bg-[#0C1116] border border-white/10 rounded-sm p-12 text-center">
                <Bot className="w-12 h-12 text-[#4B5563] mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">No agents yet</h3>
                <p className="text-[#9CA3AF] text-sm mb-6">
                  Register your first agent to get started
                </p>
                <Button
                  onClick={() => setDialogOpen(true)}
                  data-testid="create-first-agent-btn"
                  className="bg-[#01696F] hover:bg-[#028C94] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first agent
                </Button>
              </div>
            ) : (
              <div className="bg-[#0C1116] border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full" data-testid="agents-table">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Score
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Outcomes
                      </th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr
                        key={agent.agent_id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        data-testid={`agent-row-${agent.agent_id}`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-white font-medium">{agent.name}</div>
                            <code className="text-xs text-[#6B7280] font-mono">
                              {agent.agent_id}
                            </code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <TierBadge tier={agent.tier} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-white font-semibold">
                            {agent.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#9CA3AF]">
                          {agent.outcome_count}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/agents/${agent.agent_id}`}
                            className="text-[#01696F] hover:text-[#028C94] transition-colors"
                            data-testid={`view-agent-${agent.agent_id}`}
                          >
                            <ChevronRight className="w-5 h-5" />
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
