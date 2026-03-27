import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
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
} from "../ui/alert-dialog";
import { Plus, Loader2, Webhook, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { webhooksAPI } from "../../lib/api";
import { parseApiError, validateUrl } from "../../lib/utils";
import { FieldError } from "./SkeletonBlock";

export function WebhooksSection({ webhooks, onWebhooksUpdate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState({
    url: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const validateWebhookForm = () => {
    const errors = {};
    const urlError = validateUrl(formData.url);
    if (urlError) errors.url = urlError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    
    if (!validateWebhookForm()) {
      return;
    }
    
    setCreating(true);

    try {
      const newWebhook = await webhooksAPI.create({
        url: formData.url,
        description: formData.description || undefined,
        events: ["outcome.created"],
      });
      
      onWebhooksUpdate([...webhooks, newWebhook]);
      setDialogOpen(false);
      setFormData({ url: "", description: "" });
      setFormErrors({});
      toast.success("Webhook created successfully");
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    setDeletingId(webhookId);
    try {
      await webhooksAPI.delete(webhookId);
      onWebhooksUpdate(webhooks.filter((w) => w.id !== webhookId));
      toast.success("Webhook deleted");
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-[#01696F]" />
          <h2 className="text-[15px] font-semibold text-white">Webhooks</h2>
          <span className="text-[12px] text-[#6B7280] ml-1">({webhooks.length})</span>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  value={formData.url}
                  onChange={(e) => {
                    setFormData({ ...formData, url: e.target.value });
                    if (formErrors.url) setFormErrors({ ...formErrors, url: null });
                  }}
                  placeholder="https://your-server.com/webhook"
                  data-testid="webhook-url-input"
                  className={`form-input ${formErrors.url ? "border-red-400 focus:border-red-400" : ""}`}
                  aria-invalid={formErrors.url ? "true" : "false"}
                />
                <FieldError message={formErrors.url} />
                {!formErrors.url && (
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
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                  onClick={() => setDialogOpen(false)}
                  className="text-[#9CA3AF] hover:text-white hover:bg-white/5 text-[13px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !formData.url}
                  data-testid="submit-webhook-btn"
                  className="bg-[#01696F] hover:bg-[#028C94] text-white text-[13px]"
                >
                  {creating ? (
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
            onClick={() => setDialogOpen(true)}
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
                    disabled={deletingId === webhook.id}
                  >
                    {deletingId === webhook.id ? (
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
  );
}
