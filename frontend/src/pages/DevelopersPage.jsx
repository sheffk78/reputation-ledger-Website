import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, Copy, Check } from "lucide-react";
import { copyToClipboard } from "../lib/utils";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";
const BASE_URL = "https://arl.agentauthority.dev";

// Code block component with copy button
function CodeBlock({ code, language = "bash" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-4 overflow-x-auto text-[13px] font-mono text-[#E5E7EB] leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-sm bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#22C55E]" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" />
        )}
      </button>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Navigation */}
      <header className="h-14 border-b border-white/[0.06] bg-[#050709]/90 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="container-app flex items-center justify-between h-full">
          <Link to="/">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/#how-it-works" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              How it works
            </Link>
            <Link to="/#who-its-for" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              Who it's for
            </Link>
            <span className="text-[13px] text-white font-medium">
              Developers
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button 
                variant="ghost" 
                className="text-[13px] text-[#9CA3AF] hover:text-white hover:bg-white/5 h-9"
              >
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container-app">
          <div className="max-w-3xl mx-auto">
            {/* Intro */}
            <section className="mb-16">
              <h1 className="text-[32px] font-bold text-white tracking-tight mb-4">
                Developers
              </h1>
              <p className="text-[15px] text-[#9CA3AF] leading-relaxed mb-6">
                RepLedger is an API-first service.
                All you need is an API key, an agent_id, and a few HTTP calls to start logging outcomes and getting scores.
              </p>
              
              <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-4 space-y-2">
                <p className="text-[13px] text-[#9CA3AF]">
                  <span className="text-white font-medium">Auth:</span>{" "}
                  <code className="text-[#01696F] font-mono">Authorization: Bearer {"{API_KEY}"}</code>
                </p>
                <p className="text-[13px] text-[#9CA3AF]">
                  <span className="text-white font-medium">Base URL:</span>{" "}
                  <code className="text-[#01696F] font-mono">{BASE_URL}</code>
                </p>
              </div>
            </section>

            {/* Quickstart */}
            <section className="mb-16">
              <h2 className="text-[24px] font-semibold text-white tracking-tight mb-8">
                Quickstart
              </h2>

              {/* Step 1 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
                    <span className="text-[#01696F] font-mono font-bold text-[12px]">1</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-white">Get your API key</h3>
                </div>
                <p className="text-[14px] text-[#9CA3AF] mb-4 ml-10">
                  Sign up, log in, and copy your API key from the dashboard.
                  All API calls use this key in the Authorization header.
                </p>
                <div className="ml-10">
                  <CodeBlock code={`-H "Authorization: Bearer YOUR_API_KEY"`} />
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
                    <span className="text-[#01696F] font-mono font-bold text-[12px]">2</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-white">Register an agent</h3>
                </div>
                <p className="text-[14px] text-[#9CA3AF] mb-4 ml-10">
                  Create your first agent:
                </p>
                <div className="ml-10 space-y-4">
                  <CodeBlock code={`curl -X POST ${BASE_URL}/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "support-bot",
    "description": "Handles tier-1 customer support tickets",
    "owner_handle": "github:your-username"
  }'`} />
                  <p className="text-[12px] text-[#6B7280]">Response:</p>
                  <CodeBlock code={`{
  "agent_id": "agt_12345",
  "name": "support-bot",
  "description": "Handles tier-1 customer support tickets",
  "owner_handle": "github:your-username",
  "created_at": "2026-03-24T18:30:00Z"
}`} />
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
                    <span className="text-[#01696F] font-mono font-bold text-[12px]">3</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-white">Log outcomes</h3>
                </div>
                <p className="text-[14px] text-[#9CA3AF] mb-4 ml-10">
                  Whenever your agent completes a task, log an outcome:
                </p>
                <div className="ml-10 space-y-4">
                  <CodeBlock code={`curl -X POST ${BASE_URL}/v1/agents/agt_12345/outcomes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "result": "success",
    "task_type": "answer_support_ticket",
    "submitter_type": "self"
  }'`} />
                  <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-4">
                    <p className="text-[12px] text-[#9CA3AF] mb-2">Accepted values:</p>
                    <p className="text-[12px] text-[#9CA3AF]">
                      <code className="text-white font-mono">result</code>: 
                      <code className="text-[#01696F] ml-2">success</code> | 
                      <code className="text-[#01696F] ml-1">failure</code> | 
                      <code className="text-[#01696F] ml-1">partial</code> | 
                      <code className="text-[#01696F] ml-1">timeout</code>
                    </p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                      <code className="text-white font-mono">submitter_type</code>: 
                      <code className="text-[#01696F] ml-2">self</code> | 
                      <code className="text-[#01696F] ml-1">operator</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
                    <span className="text-[#01696F] font-mono font-bold text-[12px]">4</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-white">Fetch score and embed badge</h3>
                </div>
                <p className="text-[14px] text-[#9CA3AF] mb-4 ml-10">
                  Fetch the current score and trust tier:
                </p>
                <div className="ml-10 space-y-4">
                  <CodeBlock code={`curl -X GET ${BASE_URL}/v1/agents/agt_12345/score \\
  -H "Authorization: Bearer YOUR_API_KEY"`} />
                  <p className="text-[12px] text-[#6B7280]">Response:</p>
                  <CodeBlock code={`{
  "agent_id": "agt_12345",
  "score": 82,
  "tier": "Gold",
  "outcome_count": 137,
  "success_rate": 0.86
}`} />
                </div>
                <p className="text-[14px] text-[#9CA3AF] mb-4 ml-10 mt-6">
                  Embed a live badge anywhere you want:
                </p>
                <div className="ml-10">
                  <CodeBlock code={`<img
  src="${BASE_URL}/v1/agents/agt_12345/badge.svg"
  alt="RepLedger score badge for support-bot"
/>`} />
                </div>
              </div>
            </section>

            {/* Reference Summary */}
            <section className="mb-16">
              <h2 className="text-[24px] font-semibold text-white tracking-tight mb-6">
                API Reference
              </h2>
              <p className="text-[13px] text-[#6B7280] mb-6">
                All endpoints require <code className="text-[#01696F] font-mono">Authorization: Bearer {"{API_KEY}"}</code>
              </p>
              
              <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-5 py-3 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Endpoint</th>
                      <th className="text-left px-5 py-3 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px]">
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3">
                        <code className="text-[#22C55E] font-mono">POST</code>
                        <code className="text-white font-mono ml-2">/v1/agents</code>
                      </td>
                      <td className="px-5 py-3 text-[#9CA3AF]">Register a new agent for the authenticated user.</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3">
                        <code className="text-[#3B82F6] font-mono">GET</code>
                        <code className="text-white font-mono ml-2">/v1/agents</code>
                      </td>
                      <td className="px-5 py-3 text-[#9CA3AF]">List all agents for the authenticated user.</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3">
                        <code className="text-[#22C55E] font-mono">POST</code>
                        <code className="text-white font-mono ml-2">/v1/agents/{"{agent_id}"}/outcomes</code>
                      </td>
                      <td className="px-5 py-3 text-[#9CA3AF]">Log an outcome to the agent's ledger.</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3">
                        <code className="text-[#3B82F6] font-mono">GET</code>
                        <code className="text-white font-mono ml-2">/v1/agents/{"{agent_id}"}/score</code>
                      </td>
                      <td className="px-5 py-3 text-[#9CA3AF]">Get the current reputation score, trust tier, and stats.</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3">
                        <code className="text-[#3B82F6] font-mono">GET</code>
                        <code className="text-white font-mono ml-2">/v1/agents/{"{agent_id}"}/badge.svg</code>
                      </td>
                      <td className="px-5 py-3 text-[#9CA3AF]">Get an embeddable SVG badge (public, no auth).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center p-10 bg-[#0C1116] border border-white/[0.08] rounded-sm">
              <h2 className="text-[20px] font-semibold text-white mb-3">
                Ready to get started?
              </h2>
              <p className="text-[14px] text-[#9CA3AF] mb-6">
                Create your free account and get your API key in seconds.
              </p>
              <Link to="/signup">
                <Button 
                  className="bg-[#01696F] hover:bg-[#028C94] text-white h-10 px-5 text-[14px]"
                  data-testid="docs-cta-btn"
                >
                  Get API Key
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.04]">
        <div className="container-app flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="RepLedger" className="h-5" />
            <span className="text-[12px] text-[#4B5563]">Part of the AgenticTrust stack</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/login" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/signup" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
