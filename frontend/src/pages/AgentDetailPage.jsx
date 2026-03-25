import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { TierBadge } from "../components/TierBadge";
import { agentsAPI, outcomesAPI, getBadgeUrl } from "../lib/api";
import { formatDateTime, getResultColorClass, copyToClipboard } from "../lib/utils";
import { Button } from "../components/ui/button";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export default function AgentDetailPage() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    loadData();
  }, [agentId]);

  const loadData = async () => {
    try {
      const [agentData, outcomesData] = await Promise.all([
        agentsAPI.get(agentId),
        outcomesAPI.list(agentId, 1, 50),
      ]);
      setAgent(agentData);
      setOutcomes(outcomesData);
    } catch (error) {
      console.error("Failed to load agent:", error);
      toast.error("Failed to load agent details");
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

  const badgeUrl = getBadgeUrl(agentId);
  const embedCode = `<img src="${badgeUrl}" alt="RepLedger Badge" />`;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl text-white mb-2">Agent not found</h2>
          <Link to="/dashboard/agents" className="text-[#01696F]">
            Back to agents
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back link */}
        <Link
          to="/dashboard/agents"
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors"
          data-testid="back-to-agents"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to agents
        </Link>

        {/* Agent header */}
        <div className="bg-[#0C1116] border border-white/10 rounded-sm p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-semibold text-white">{agent.name}</h1>
                <TierBadge tier={agent.tier} size="large" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <code className="text-sm text-[#6B7280] font-mono">
                  {agent.agent_id}
                </code>
                <button
                  onClick={() => handleCopy(agent.agent_id, "id")}
                  className="p-1 rounded hover:bg-white/5"
                  data-testid="copy-agent-id"
                >
                  {copiedField === "id" ? (
                    <Check className="w-4 h-4 text-[#22C55E]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#6B7280]" />
                  )}
                </button>
              </div>
              {agent.description && (
                <p className="text-[#9CA3AF] max-w-xl">{agent.description}</p>
              )}
              {agent.owner_handle && (
                <p className="text-[#6B7280] text-sm mt-2">
                  Owner: {agent.owner_handle}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="stat-value" data-testid="agent-score">
                {agent.score}
              </div>
              <div className="stat-label">RepLedger Score</div>
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
          <h2 className="text-lg font-semibold text-white mb-4">
            Embeddable Badge
          </h2>
          
          <div className="badge-preview mb-4">
            <img 
              src={badgeUrl} 
              alt="RepLedger Badge"
              data-testid="badge-preview"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#6B7280] mb-2 block">Badge URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#050709] border border-white/10 rounded-sm px-4 py-2 text-sm text-[#9CA3AF] font-mono truncate">
                  {badgeUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(badgeUrl, "url")}
                  data-testid="copy-badge-url"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  {copiedField === "url" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <a
                  href={badgeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-sm border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-[#9CA3AF]" />
                </a>
              </div>
            </div>

            <div>
              <label className="text-sm text-[#6B7280] mb-2 block">HTML Embed</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#050709] border border-white/10 rounded-sm px-4 py-2 text-sm text-[#9CA3AF] font-mono">
                  {embedCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(embedCode, "embed")}
                  data-testid="copy-embed-code"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  {copiedField === "embed" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Outcomes table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Outcomes</h2>
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
              <table className="w-full">
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
                        <span
                          className={`text-sm font-medium capitalize ${getResultColorClass(
                            outcome.result
                          )}`}
                        >
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
        </div>
      </div>
    </DashboardLayout>
  );
}
