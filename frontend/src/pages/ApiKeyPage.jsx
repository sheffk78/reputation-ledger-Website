import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { apiKeyAPI } from "../lib/api";
import { formatDateTime, copyToClipboard } from "../lib/utils";
import { Button } from "../components/ui/button";
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
import { Key, Copy, Check, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ApiKeyPage() {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const data = await apiKeyAPI.get();
      setApiKey(data);
    } catch (error) {
      console.error("Failed to load API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
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
      toast.success("API key regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
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
      <div className="max-w-2xl space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            API Key
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Use this key to authenticate API requests
          </p>
        </div>

        {/* API Key card */}
        <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-sm bg-[#01696F]/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-[#01696F]" />
            </div>
            <div>
              <h2 className="text-white font-medium">Your API Key</h2>
              <p className="text-sm text-[#6B7280]">
                Created {formatDateTime(apiKey?.created_at)}
              </p>
            </div>
          </div>

          {/* Key display */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <code
                className="flex-1 api-key-display"
                data-testid="api-key-display"
              >
                {apiKey?.api_key}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                data-testid="copy-api-key-btn"
                className="border-white/10 text-white hover:bg-white/5 h-12 w-12"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-[#22C55E]" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Regenerate section */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-medium mb-1">Regenerate Key</h3>
                <p className="text-sm text-[#6B7280]">
                  Generate a new API key. Your current key will stop working immediately.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="regenerate-key-btn"
                    className="border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10 hover:border-[#EF4444]"
                  >
                    {regenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0C1116] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                      Regenerate API Key?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9CA3AF]">
                      This will immediately invalidate your current API key. Any applications
                      using this key will stop working until you update them with the new key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerate}
                      className="bg-[#EF4444] text-white hover:bg-[#DC2626]"
                      data-testid="confirm-regenerate-btn"
                    >
                      Yes, regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Usage instructions */}
        <div className="bg-[#0C1116] border border-white/10 rounded-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Usage</h2>
          <p className="text-[#9CA3AF] mb-4">
            Include your API key in the Authorization header of your requests:
          </p>
          <div className="code-block">
            <code>
              <span className="text-[#6B7280]">Authorization:</span>{" "}
              <span className="text-[#22C55E]">Bearer your_api_key_here</span>
            </code>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
