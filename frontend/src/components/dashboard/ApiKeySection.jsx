import React, { useState } from "react";
import { Button } from "../ui/button";
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
import { Key, Copy, Check, RefreshCw, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../../lib/utils";
import { apiKeyAPI } from "../../lib/api";

export function ApiKeySection({ apiKey, onApiKeyUpdate }) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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
      onApiKeyUpdate(data);
      toast.success("API key regenerated");
    } catch (error) {
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
    }
  };

  const maskedKey = apiKey?.api_key 
    ? `${apiKey.api_key.substring(0, 8)}${'•'.repeat(32)}${apiKey.api_key.substring(apiKey.api_key.length - 4)}`
    : '';

  return (
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
          {showApiKey ? apiKey?.api_key : maskedKey}
        </code>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowApiKey(!showApiKey)}
          data-testid="toggle-api-key-visibility"
          className="border-white/[0.08] bg-transparent text-white hover:bg-white/5 h-10 px-3"
        >
          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        
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
  );
}
