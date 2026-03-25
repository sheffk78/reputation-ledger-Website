import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, outcomesAPI } from "../lib/api";
import { formatDateTime, getTierColorClass, getResultColorClass, copyToClipboard } from "../lib/utils";
import { Button } from "../components/ui/button";
import { ArrowLeft, RefreshCw, LogOut, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Tier badge component
function TierBadge({ tier, size = "default" }) {
  const sizeClasses = {
    small: "px-2 py-0.5 text-[10px]",
    default: "px-3 py-1 text-xs",
    large: "px-4 py-1.5 text-sm",
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
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  // Badge URL
  const badgeUrl = `${BACKEND_URL}/api/v1/agents/${agentId}/badge.svg`;
  const embedSnippet = `<img src="${badgeUrl}" alt="RepLedger score badge" />`;

  useEffect(() => {
    loadData();
  }, [agentId]);

  const loadData = async () => {
    try {
      const [agentData, outcomesData] = await Promise.all([
        agentsAPI.get(agentId),
        outcomesAPI.list(agentId),
      ]);
      setAgent(agentData);
      setOutcomes(outcomesData);
    } catch (error) {
      console.error("Failed to load agent:", error);
      toast.error("Failed to load agent details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text, field) => {
    await copyToClipboard(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
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
          <h2 className="text-xl text-white mb-4">Agent not found</h2>
          <Link to="/dashboard" className="text-[#01696F] hover:underline">
            Back to dashboard
          </Link>
        </div>
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
          {/* Back link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {/* Agent header */}
          <div className="bg-[#0C1116] border border-white/10 rounded-sm p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-2xl font-semibold text-white">{agent.name}</h1>
                  <TierBadge tier={agent.tier} size="large" />
                </div>
                <code className="text-sm text-[#6B7280] font-mono">
                  {agent.agent_id}
                </code>
                {agent.description && (
                  <p className="text-[#9CA3AF] mt-4 max-w-xl">{agent.description}</p>
                )}
              </div>

              <div className="text-right">
                <div className="text-5xl font-mono font-bold text-white" data-testid="agent-score">
                  {agent.score}
                </div>
                <div className="text-sm text-[#6B7280] mt-1">RepLedger Score</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/10">
              <div>
                <div className="text-3xl font-mono font-bold text-white">
                  {agent.outcome_count}
                </div>
                <div className="text-sm text-[#6B7280]">Total Outcomes</div>
              </div>
              <div>
                <div className="text-3xl font-mono font-bold text-white">
                  {agent.success_rate}%
                </div>
                <div className="text-sm text-[#6B7280]">Success Rate</div>
              </div>
              <div>
                <div className="text-3xl font-mono font-bold text-white">
                  {agent.tier}
                </div>
                <div className="text-sm text-[#6B7280]">Trust Tier</div>
              </div>
            </div>
          </div>

          {/* Badge section */}
          <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Embeddable Badge</h2>
            
            {/* Badge preview */}
            <div className="flex items-center justify-center p-6 mb-6 rounded-sm" style={{
              background: "repeating-linear-gradient(45deg, #0C1116, #0C1116 10px, #151B23 10px, #151B23 20px)"
            }}>
              <img 
                src={badgeUrl} 
                alt="RepLedger Badge" 
                data-testid="badge-preview"
                className="h-7"
              />
            </div>

            {/* Badge URL */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#6B7280] mb-2 block">Badge URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#050709] border border-white/10 rounded-sm px-4 py-2.5 text-sm text-[#9CA3AF] font-mono truncate">
                    {badgeUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(badgeUrl, "url")}
                    data-testid="copy-badge-url"
                    className="border-white/10 text-white hover:bg-white/5 h-10 px-3"
                  >
                    {copiedField === "url" ? (
                      <Check className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <a
                    href={badgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-10 px-3 rounded-sm border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-[#9CA3AF]" />
                  </a>
                </div>
              </div>

              {/* HTML Embed */}
              <div>
                <label className="text-sm text-[#6B7280] mb-2 block">HTML Embed</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#050709] border border-white/10 rounded-sm px-4 py-2.5 text-sm text-[#9CA3AF] font-mono overflow-x-auto">
                    {embedSnippet}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(embedSnippet, "embed")}
                    data-testid="copy-embed-snippet"
                    className="border-white/10 text-white hover:bg-white/5 h-10 px-3"
                  >
                    {copiedField === "embed" ? (
                      <Check className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Outcomes table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Outcomes</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                data-testid="refresh-outcomes"
                className="text-[#9CA3AF] hover:text-white hover:bg-white/5"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {outcomes.length === 0 ? (
              <div className="bg-[#0C1116] border border-white/10 rounded-sm p-12 text-center">
                <p className="text-[#6B7280]">No outcomes recorded yet</p>
                <p className="text-sm text-[#4B5563] mt-2">
                  Submit outcomes via the API to build this agent's track record
                </p>
              </div>
            ) : (
              <div className="bg-[#0C1116] border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full" data-testid="outcomes-table">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Task Type
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Result
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                        Submitter
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomes.map((outcome) => (
                      <tr
                        key={outcome.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        data-testid={`outcome-row-${outcome.id}`}
                      >
                        <td className="px-6 py-4 text-sm text-[#9CA3AF]">
                          {formatDateTime(outcome.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {outcome.task_type}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium capitalize ${getResultColorClass(outcome.result)}`}>
                            {outcome.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#9CA3AF] capitalize">
                          {outcome.submitter_type}
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
