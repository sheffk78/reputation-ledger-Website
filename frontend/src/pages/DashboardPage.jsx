import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { TierBadge } from "../components/TierBadge";
import { agentsAPI, apiKeyAPI } from "../lib/api";
import { formatRelativeTime, copyToClipboard } from "../lib/utils";
import { Button } from "../components/ui/button";
import { 
  Bot, 
  Copy, 
  Check, 
  ChevronRight,
  Plus,
  Key
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [agents, setAgents] = useState([]);
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsData, apiKeyData] = await Promise.all([
        agentsAPI.list(),
        apiKeyAPI.get(),
      ]);
      setAgents(agentsData);
      setApiKey(apiKeyData);
    } catch (error) {
      console.error("Failed to load data:", error);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Manage your agents and track their reputation
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#01696F]" />
              </div>
              <span className="text-[#9CA3AF] text-sm font-medium">Total Agents</span>
            </div>
            <div className="stat-value" data-testid="total-agents-count">
              {agents.length}
            </div>
          </div>

          <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-[#22C55E]/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-[#22C55E]" />
              </div>
              <span className="text-[#9CA3AF] text-sm font-medium">Total Outcomes</span>
            </div>
            <div className="stat-value" data-testid="total-outcomes-count">
              {agents.reduce((sum, a) => sum + a.outcome_count, 0)}
            </div>
          </div>

          <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-[#FFD700]/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-[#FFD700]" />
              </div>
              <span className="text-[#9CA3AF] text-sm font-medium">API Key</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-[#9CA3AF] truncate max-w-[180px]">
                {apiKey?.api_key ? `${apiKey.api_key.slice(0, 16)}...` : "—"}
              </code>
              <button
                onClick={handleCopyKey}
                data-testid="copy-api-key-btn"
                className="p-1.5 rounded-sm hover:bg-white/5 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#22C55E]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#9CA3AF]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Agents section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Agents</h2>
            <Link to="/dashboard/agents">
              <Button
                variant="outline"
                size="sm"
                data-testid="new-agent-btn"
                className="bg-[#01696F] hover:bg-[#028C94] text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Agent
              </Button>
            </Link>
          </div>

          {agents.length === 0 ? (
            <div className="bg-[#0C1116] border border-white/10 rounded-sm p-12 text-center">
              <Bot className="w-12 h-12 text-[#4B5563] mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No agents yet</h3>
              <p className="text-[#9CA3AF] text-sm mb-6">
                Register your first agent to start building its track record
              </p>
              <Link to="/dashboard/agents">
                <Button
                  data-testid="create-first-agent-btn"
                  className="bg-[#01696F] hover:bg-[#028C94] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first agent
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-[#0C1116] border border-white/10 rounded-sm overflow-hidden">
              <table className="w-full">
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
                    <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                      Last Updated
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
                        <TierBadge tier={agent.tier} size="small" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-white font-semibold">
                          {agent.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">
                        {agent.outcome_count}
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF] text-sm">
                        {formatRelativeTime(agent.last_updated)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/dashboard/agents/${agent.agent_id}`}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
