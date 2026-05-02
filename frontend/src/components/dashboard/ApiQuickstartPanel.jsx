import React, { useState } from "react";
import { Link } from "react-router-dom";
import { copyToClipboard } from "../../lib/utils";
import { trackEvent, EventNames } from "../../lib/analytics";
import { BookOpen, ChevronDown, ChevronUp, ChevronRight, Eye, EyeOff, Terminal } from "lucide-react";
import { toast } from "sonner";
import { CodeSnippet } from "./CodeSnippet";

const BASE_URL = "https://reputationledger.dev";

export function ApiQuickstartPanel({ apiKey }) {
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem("repledger_quickstart_expanded");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showKey, setShowKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  
  const maskedKey = apiKey ? `${apiKey.substring(0, 8)}${'•'.repeat(32)}${apiKey.substring(apiKey.length - 4)}` : '';
  const displayKey = showKey ? apiKey : maskedKey;
  
  const handleCopySnippet = async (code, snippetId) => {
    await copyToClipboard(code);
    setCopiedSnippet(snippetId);
    toast.success("Copied to clipboard");
    // Track badge copy event
    if (snippetId === "badge") {
      trackEvent(EventNames.BADGE_COPIED);
    }
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem("repledger_quickstart_expanded", JSON.stringify(newExpanded));
    if (newExpanded) {
      trackEvent(EventNames.QUICKSTART_OPENED);
    }
  };
  
  const snippets = {
    register: `curl -X POST ${BASE_URL}/v1/agents \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-agent", "description": "My first agent"}'`,
    
    outcome: `curl -X POST ${BASE_URL}/v1/agents/agt_YOUR_AGENT_ID/outcomes \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"result": "success", "task_type": "api-call", "submitter_type": "self"}'`,
    
    score: `curl -X GET ${BASE_URL}/v1/agents/agt_YOUR_AGENT_ID/score \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"`,
    
    badge: `<img src="${BASE_URL}/v1/agents/agt_YOUR_AGENT_ID/badge.svg" alt="Agent Badge" />`
  };

  return (
    <section className="card-surface" data-testid="api-quickstart-panel">
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between p-5"
        data-testid="quickstart-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#01696F]" />
          </div>
          <div className="text-left">
            <h2 className="text-[14px] font-semibold text-white">API Quickstart</h2>
            <p className="text-[12px] text-[#6B7280]">
              Get started with 4 simple API calls
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#6B7280]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6B7280]" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-5 pb-5 space-y-6">
          {/* Step 1: API Key */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">1</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Get your API key</h3>
            </div>
            <div className="ml-7">
              <p className="text-[12px] text-[#6B7280] mb-2">
                Your API key is ready to use. Include it in the Authorization header:
              </p>
              <div className="relative">
                <div className="bg-[#050709] border border-white/[0.06] rounded-sm p-3 flex items-center justify-between gap-2">
                  <code className="text-[12px] font-mono text-[#01696F] break-all">
                    Authorization: Bearer {displayKey}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1 rounded hover:bg-white/5 text-[#6B7280] hover:text-white transition-colors flex-shrink-0"
                    data-testid="toggle-key-visibility"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Register Agent */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">2</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Register an agent</h3>
            </div>
            <div className="ml-7">
              <p className="text-[12px] text-[#6B7280] mb-2">
                Create an identity for your agent in the ledger:
              </p>
              <CodeSnippet 
                code={snippets.register} 
                onCopy={handleCopySnippet}
                copiedId={copiedSnippet}
                snippetId="register"
              />
              <p className="text-[11px] text-[#4B5563] mt-2">
                Response includes your <code className="text-[#01696F]">agent_id</code> — save it for the next steps.
              </p>
            </div>
          </div>

          {/* Step 3: Log Outcomes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">3</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Log outcomes</h3>
            </div>
            <div className="ml-7">
              <p className="text-[12px] text-[#6B7280] mb-2">
                Submit outcomes as your agent completes tasks:
              </p>
              <CodeSnippet 
                code={snippets.outcome} 
                onCopy={handleCopySnippet}
                copiedId={copiedSnippet}
                snippetId="outcome"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] font-mono">success</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-mono">failure</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-mono">partial</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#6B7280]/10 text-[#6B7280] font-mono">timeout</span>
              </div>
            </div>
          </div>

          {/* Step 4: Fetch Score & Badge */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#01696F]">4</span>
              </div>
              <h3 className="text-[13px] font-medium text-white">Fetch score & badge</h3>
            </div>
            <div className="ml-7 space-y-4">
              <div>
                <p className="text-[12px] text-[#6B7280] mb-2">
                  Get the current reputation score and tier:
                </p>
                <CodeSnippet 
                  code={snippets.score} 
                  onCopy={handleCopySnippet}
                  copiedId={copiedSnippet}
                  snippetId="score"
                />
              </div>
              <div>
                <p className="text-[12px] text-[#6B7280] mb-2">
                  Embed a live badge anywhere:
                </p>
                <CodeSnippet 
                  code={snippets.badge} 
                  onCopy={handleCopySnippet}
                  copiedId={copiedSnippet}
                  snippetId="badge"
                />
              </div>
            </div>
          </div>

          {/* Link to full docs */}
          <div className="ml-7 pt-2 border-t border-white/[0.04]">
            <Link 
              to="/developers" 
              className="inline-flex items-center gap-1.5 text-[12px] text-[#01696F] hover:text-[#028C94] transition-colors"
              data-testid="view-full-docs-link"
            >
              <Terminal className="w-3.5 h-3.5" />
              View full API documentation
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
