import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Plus, Bot, Loader2, ChevronRight, Zap, Sparkles, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { agentsAPI } from "../../lib/api";
import { parseApiError, validateRequired } from "../../lib/utils";
import { trackEvent, EventNames } from "../../lib/analytics";
import { TierBadge } from "./TierBadge";
import { FieldError } from "./SkeletonBlock";

export function AgentsSection({ agents, onAgentsUpdate, hasDemoAgent, onDemoAgentCreated }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    owner_handle: "",
  });
  const [formErrors, setFormErrors] = useState({});

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
        description: formData.description || undefined,
        owner_handle: formData.owner_handle || undefined,
      });
      
      onAgentsUpdate([...agents, newAgent]);
      setDialogOpen(false);
      setFormData({ name: "", description: "", owner_handle: "" });
      setFormErrors({});
      toast.success("Agent registered successfully");
      trackEvent(EventNames.AGENT_CREATED, { agent_id: newAgent.agent_id });
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.code === "PLAN_LIMIT_REACHED") {
        toast.error(parsed.message);
      } else {
        toast.error(parsed.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDemoAgent = async () => {
    setCreatingDemo(true);
    try {
      const demoAgent = await agentsAPI.createDemo();
      onAgentsUpdate([...agents, demoAgent]);
      onDemoAgentCreated();
      toast.success("Demo agent created with sample outcomes!");
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setCreatingDemo(false);
    }
  };

  return (
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
  );
}
