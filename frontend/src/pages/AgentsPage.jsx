import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { TierBadge } from "../components/TierBadge";
import { agentsAPI } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Bot, Plus, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    owner_handle: "",
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await agentsAPI.list();
      setAgents(data);
    } catch (error) {
      console.error("Failed to load agents:", error);
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const newAgent = await agentsAPI.create({
        name: formData.name,
        description: formData.description || null,
        owner_handle: formData.owner_handle || null,
      });
      setAgents([newAgent, ...agents]);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Agents
            </h1>
            <p className="text-[#9CA3AF] mt-1">
              Register and manage your AI agents
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="create-agent-btn"
                className="bg-[#01696F] hover:bg-[#028C94] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0C1116] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Register New Agent</DialogTitle>
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
                    placeholder="e.g., Customer Support Bot"
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
                    placeholder="e.g., @github-username"
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

        {/* Agents list */}
        {agents.length === 0 ? (
          <div className="bg-[#0C1116] border border-white/10 rounded-sm p-12 text-center">
            <Bot className="w-12 h-12 text-[#4B5563] mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">No agents yet</h3>
            <p className="text-[#9CA3AF] text-sm mb-6">
              Register your first agent to start building its track record
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              data-testid="create-first-agent-btn-empty"
              className="bg-[#01696F] hover:bg-[#028C94] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create your first agent
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map((agent) => (
              <Link
                key={agent.agent_id}
                to={`/dashboard/agents/${agent.agent_id}`}
                className="block"
                data-testid={`agent-card-${agent.agent_id}`}
              >
                <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {agent.name}
                        </h3>
                        <TierBadge tier={agent.tier} size="small" />
                      </div>
                      <code className="text-xs text-[#6B7280] font-mono">
                        {agent.agent_id}
                      </code>
                      {agent.description && (
                        <p className="text-[#9CA3AF] text-sm mt-2 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-8 text-right">
                      <div>
                        <div className="text-2xl font-mono font-bold text-white">
                          {agent.score}
                        </div>
                        <div className="text-xs text-[#6B7280] uppercase tracking-wider">
                          Score
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-bold text-white">
                          {agent.outcome_count}
                        </div>
                        <div className="text-xs text-[#6B7280] uppercase tracking-wider">
                          Outcomes
                        </div>
                      </div>
                      <div className="text-[#9CA3AF]">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
                    <span className="text-[#6B7280]">
                      {agent.owner_handle && (
                        <span className="mr-4">Owner: {agent.owner_handle}</span>
                      )}
                      Success rate: {agent.success_rate}%
                    </span>
                    <span className="text-[#6B7280]">
                      Last updated: {formatRelativeTime(agent.last_updated)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
