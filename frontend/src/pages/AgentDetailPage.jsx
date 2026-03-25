import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, outcomesAPI, flagsAPI } from "../lib/api";
import { formatDateTime, getTierColorClass, getResultColorClass, copyToClipboard, parseApiError } from "../lib/utils";
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
} from "../components/ui/dialog";
import { ArrowLeft, RefreshCw, LogOut, Copy, Check, ExternalLink, ChevronLeft, ChevronRight, Flag, AlertTriangle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PAGE_SIZE = 20;

// Tier badge component
function TierBadge({ tier, size = "default" }) {
  const sizeClasses = {
    small: "px-2 py-0.5 text-[9px]",
    default: "px-2.5 py-1 text-[10px]",
    large: "px-3 py-1.5 text-[11px]",
  };

  return (
    <span className={`tier-badge ${getTierColorClass(tier)} ${sizeClasses[size]}`}>
      {tier}
    </span>
  );
}

export default function AgentDetailPage() {
  const { agentId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOutcomes, setTotalOutcomes] = useState(0);
  const [outcomesLoading, setOutcomesLoading] = useState(false);
  
  // Flags state
  const [showFlagsDialog, setShowFlagsDialog] = useState(false);
  const [showCreateFlagDialog, setShowCreateFlagDialog] = useState(false);
  const [flaggingOutcome, setFlaggingOutcome] = useState(null);
  const [creatingFlag, setCreatingFlag] = useState(false);
  const [flagForm, setFlagForm] = useState({ reason: "", notes: "" });

  const badgeUrl = `${BACKEND_URL}/api/v1/agents/${agentId}/badge.svg`;
  const embedSnippet = `<img src="${badgeUrl}" alt="RepLedger score badge" />`;

  const totalPages = Math.ceil(totalOutcomes / PAGE_SIZE);

  useEffect(() => {
    loadData();
  }, [agentId]);

  useEffect(() => {
    if (agent) {
      loadOutcomes(currentPage);
    }
  }, [currentPage]);

  const loadData = async () => {
    try {
      const [agentData, outcomesData, flagsData] = await Promise.all([
        agentsAPI.get(agentId),
        outcomesAPI.list(agentId, 1, PAGE_SIZE),
        flagsAPI.list(agentId),
      ]);
      setAgent(agentData);
      setOutcomes(outcomesData.data || []);
      setTotalOutcomes(outcomesData.total || 0);
      setFlags(flagsData.flags || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to load agent:", error);
      toast.error("Agent not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadOutcomes = async (page) => {
    setOutcomesLoading(true);
    try {
      const outcomesData = await outcomesAPI.list(agentId, page, PAGE_SIZE);
      setOutcomes(outcomesData.data || []);
      setTotalOutcomes(outcomesData.total || 0);
    } catch (error) {
      console.error("Failed to load outcomes:", error);
      toast.error("Failed to load outcomes");
    } finally {
      setOutcomesLoading(false);
    }
  };

  const loadFlags = async () => {
    try {
      const flagsData = await flagsAPI.list(agentId);
      setFlags(flagsData.flags || []);
    } catch (error) {
      console.error("Failed to load flags:", error);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    loadOutcomes(currentPage);
  };

  const openFlagDialog = (outcomeId = null) => {
    setFlaggingOutcome(outcomeId);
    setFlagForm({ reason: "", notes: "" });
    setShowCreateFlagDialog(true);
  };

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    if (!flagForm.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    
    setCreatingFlag(true);
    try {
      await flagsAPI.create(agentId, {
        outcome_id: flaggingOutcome || null,
        reason: flagForm.reason.trim(),
        notes: flagForm.notes.trim() || null,
      });
      toast.success("Flag created");
      setShowCreateFlagDialog(false);
      setFlagForm({ reason: "", notes: "" });
      setFlaggingOutcome(null);
      await loadFlags();
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setCreatingFlag(false);
    }
  };

  const handleCopy = async (text, field) => {
    await copyToClipboard(text);
    setCopiedField(field);
    toast.success("Copied");
    setTimeout(() => setCopiedField(null), 2000);
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

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[15px] text-white mb-3">Agent not found</h2>
          <Link to="/dashboard" className="text-[13px] text-[#01696F] hover:underline">
            Back to dashboard
          </Link>
        </div>
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
            <span className="text-[11px] font-medium text-[#01696F] uppercase tracking-wider">Agent Detail</span>
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
          {/* Back link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>

          {/* Agent header card with prominent score */}
          <div className="card-surface p-6">
            <div className="flex items-start gap-8">
              {/* Left: Agent info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-[20px] font-semibold text-white tracking-tight">{agent.name}</h1>
                  <TierBadge tier={agent.tier} size="large" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <code className="text-[12px] text-[#6B7280] font-mono">{agent.agent_id}</code>
                  <button
                    onClick={() => handleCopy(agent.agent_id, "id")}
                    className="p-1 rounded hover:bg-white/5"
                  >
                    {copiedField === "id" ? (
                      <Check className="w-3 h-3 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#6B7280]" />
                    )}
                  </button>
                </div>
                {agent.description && (
                  <p className="text-[13px] text-[#9CA3AF] max-w-md leading-relaxed">{agent.description}</p>
                )}
                {agent.owner_handle && (
                  <p className="text-[12px] text-[#6B7280] mt-2">Owner: {agent.owner_handle}</p>
                )}
              </div>

              {/* Right: Score display */}
              <div className="text-right">
                <div className="score-display-xl" data-testid="agent-score">
                  {agent.score}
                </div>
                <div className="text-[11px] text-[#6B7280] uppercase tracking-wider mt-2">
                  RepLedger Score
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/[0.06]">
              <div className="stat-card">
                <div className="stat-card-value">{agent.outcome_count}</div>
                <div className="stat-card-label">Total Outcomes</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{agent.success_rate}%</div>
                <div className="stat-card-label">Success Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{agent.tier}</div>
                <div className="stat-card-label">Trust Tier</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">
                  {agent.outcome_count >= 50 ? "✓" : `${50 - agent.outcome_count}`}
                </div>
                <div className="stat-card-label">
                  {agent.outcome_count >= 50 ? "Platinum Eligible" : "To Platinum"}
                </div>
              </div>
            </div>
          </div>

          {/* Badge section */}
          <div className="card-surface p-6">
            <h2 className="text-[14px] font-semibold text-white mb-5">Embeddable Badge</h2>
            
            <div className="badge-preview-area mb-5">
              <img 
                src={badgeUrl} 
                alt="RepLedger Badge" 
                data-testid="badge-preview"
                className="h-7"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Badge URL</label>
                <div className="flex items-center gap-2">
                  <code className="code-snippet flex-1 truncate">{badgeUrl}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(badgeUrl, "url")}
                    data-testid="copy-badge-url"
                    className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-9 px-3"
                  >
                    {copiedField === "url" ? (
                      <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <a
                    href={badgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-9 px-3 rounded-sm border border-white/[0.08] hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                  </a>
                </div>
              </div>

              <div>
                <label className="form-label">HTML Embed</label>
                <div className="flex items-center gap-2">
                  <code className="code-snippet flex-1 text-[11px]">{embedSnippet}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(embedSnippet, "embed")}
                    data-testid="copy-embed-snippet"
                    className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-9 px-3"
                  >
                    {copiedField === "embed" ? (
                      <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Flags Card */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-[#F59E0B]/15 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-white">Flags</h2>
                  <p className="text-[12px] text-[#6B7280]">
                    {flags.length === 0 
                      ? "No flags reported" 
                      : `${flags.length} flag${flags.length === 1 ? '' : 's'} reported`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {flags.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFlagsDialog(true)}
                    data-testid="view-flags-btn"
                    className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-8 px-3 text-[12px]"
                  >
                    View flags
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openFlagDialog(null)}
                  data-testid="add-flag-btn"
                  className="border-[#F59E0B]/30 bg-transparent text-[#F59E0B] hover:bg-[#F59E0B]/10 h-8 px-3 text-[12px]"
                >
                  <Flag className="w-3 h-3 mr-1.5" />
                  Add Flag
                </Button>
              </div>
            </div>
          </div>

          {/* Outcomes table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-white">Outcome History</h2>
                {totalOutcomes > 0 && (
                  <span className="text-[11px] sm:text-[12px] text-[#6B7280]">
                    ({totalOutcomes} total)
                  </span>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={outcomesLoading}
                data-testid="refresh-outcomes"
                className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${outcomesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {outcomes.length === 0 && !outcomesLoading ? (
              <div className="card-surface empty-state">
                <p className="text-[#6B7280] text-[13px]">No outcomes recorded</p>
                <p className="text-[#4B5563] text-[12px] mt-1">
                  Submit outcomes via POST /v1/agents/{agent.agent_id}/outcomes
                </p>
              </div>
            ) : (
              <div className="card-surface overflow-hidden">
                <div className={`overflow-x-auto ${outcomesLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <table className="data-table min-w-[450px]" data-testid="outcomes-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Task Type</th>
                        <th>Result</th>
                        <th className="hidden sm:table-cell">Submitter</th>
                        <th className="w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {outcomes.map((outcome) => (
                        <tr key={outcome.id} data-testid={`outcome-row-${outcome.id}`}>
                          <td>
                            <span className="text-[#9CA3AF] font-mono text-[11px] sm:text-[12px]">
                              {formatDateTime(outcome.created_at)}
                            </span>
                          </td>
                          <td>
                            <span className="text-white text-[12px] sm:text-[13px]">{outcome.task_type}</span>
                          </td>
                          <td>
                            <span className={`text-[12px] sm:text-[13px] font-medium capitalize ${getResultColorClass(outcome.result)}`}>
                              {outcome.result}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell">
                            <span className="text-[#9CA3AF] text-[13px] capitalize">
                              {outcome.submitter_type}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => openFlagDialog(outcome.id)}
                              className="p-1.5 rounded-sm text-[#6B7280] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
                              title="Flag this outcome"
                              data-testid={`flag-outcome-${outcome.id}`}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-t border-white/[0.06]">
                    <div className="text-[11px] sm:text-[12px] text-[#6B7280]">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1 || outcomesLoading}
                        data-testid="pagination-prev"
                        className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-8 px-2 sm:px-3 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages || outcomesLoading}
                        data-testid="pagination-next"
                        className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-8 px-2 sm:px-3 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5 sm:ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* View Flags Dialog */}
      <Dialog open={showFlagsDialog} onOpenChange={setShowFlagsDialog}>
        <DialogContent className="bg-[#0C1116] border-white/[0.08] text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-[16px] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#F59E0B]" />
              Flags ({flags.length})
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF] text-[13px]">
              Flags reported for this agent
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
            {flags.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#6B7280] text-[13px]">No flags reported</p>
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((flag) => (
                  <div 
                    key={flag.id} 
                    className="p-3 bg-[#1F2933]/50 rounded-sm border border-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
                          <span className="text-[13px] font-medium text-white">
                            {flag.reason}
                          </span>
                        </div>
                        {flag.notes && (
                          <p className="text-[12px] text-[#9CA3AF] mt-1 ml-5">
                            {flag.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 ml-5 text-[11px] text-[#6B7280]">
                          <span>{formatDateTime(flag.created_at)}</span>
                          {flag.outcome_id && (
                            <span className="px-1.5 py-0.5 bg-[#01696F]/20 text-[#01696F] rounded text-[10px] font-mono">
                              Outcome: {flag.outcome_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Flag Dialog */}
      <Dialog open={showCreateFlagDialog} onOpenChange={setShowCreateFlagDialog}>
        <DialogContent className="bg-[#0C1116] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-[16px] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#F59E0B]" />
              Create Flag
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF] text-[13px]">
              {flaggingOutcome 
                ? "Flag this specific outcome for review." 
                : "Flag this agent for general review."
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateFlag} className="space-y-4 mt-4">
            {flaggingOutcome && (
              <div className="p-2 bg-[#1F2933]/50 rounded-sm">
                <span className="text-[11px] text-[#6B7280]">Flagging outcome:</span>
                <code className="ml-2 text-[11px] text-[#01696F] font-mono">
                  {flaggingOutcome.substring(0, 16)}...
                </code>
              </div>
            )}
            
            <div className="space-y-1">
              <Label htmlFor="flag-reason" className="form-label">
                Reason <span className="text-red-400">*</span>
              </Label>
              <Input
                id="flag-reason"
                value={flagForm.reason}
                onChange={(e) => setFlagForm({ ...flagForm, reason: e.target.value })}
                placeholder="e.g., unsafe output, policy violation"
                maxLength={100}
                data-testid="flag-reason-input"
                className="form-input"
              />
              <p className="text-[10px] text-[#6B7280]">
                Brief description of the issue (max 100 chars)
              </p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="flag-notes" className="form-label">
                Notes (optional)
              </Label>
              <Textarea
                id="flag-notes"
                value={flagForm.notes}
                onChange={(e) => setFlagForm({ ...flagForm, notes: e.target.value })}
                placeholder="Additional details about the issue..."
                maxLength={1000}
                rows={3}
                data-testid="flag-notes-input"
                className="form-input min-h-[80px] resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateFlagDialog(false)}
                className="text-[#9CA3AF] hover:text-white hover:bg-white/5 text-[13px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingFlag || !flagForm.reason.trim()}
                data-testid="submit-flag-btn"
                className="bg-[#F59E0B] hover:bg-[#D97706] text-black text-[13px]"
              >
                {creatingFlag ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5 mr-1.5" />
                    Create Flag
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
