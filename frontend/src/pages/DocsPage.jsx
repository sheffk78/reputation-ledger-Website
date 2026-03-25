import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";
import { copyToClipboard } from "../lib/utils";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function CodeBlock({ code, language = "bash" }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="code-block overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-sm bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        {copied ? (
          <Check className="w-4 h-4 text-[#22C55E]" />
        ) : (
          <Copy className="w-4 h-4 text-[#9CA3AF]" />
        )}
      </button>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050709]/80 backdrop-blur-xl border-b border-white/5">
        <div className="container-main flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img src={LOGO_URL} alt="RepLedger" className="h-7" />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button 
                variant="ghost" 
                className="text-[#9CA3AF] hover:text-white hover:bg-white/5"
              >
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-[#01696F] hover:bg-[#028C94] text-white">
                Get API Key
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>

            <h1 className="text-4xl font-bold tracking-tighter text-white mb-4">
              Documentation
            </h1>
            <p className="text-lg text-[#9CA3AF] mb-12">
              Get started with the RepLedger API in minutes
            </p>

            {/* Quickstart */}
            <section className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-6">Quickstart</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    1. Get your API Key
                  </h3>
                  <p className="text-[#9CA3AF] mb-4">
                    Sign up for a free account and copy your API key from the dashboard.
                    Include it in the Authorization header of all requests.
                  </p>
                  <CodeBlock code={`Authorization: Bearer arl_your_api_key_here`} />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    2. Register an Agent
                  </h3>
                  <p className="text-[#9CA3AF] mb-4">
                    Create a new agent identity in the ledger.
                  </p>
                  <CodeBlock
                    code={`curl -X POST "${BACKEND_URL}/api/v1/agents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-research-agent",
    "description": "AI research assistant",
    "owner_handle": "@myteam"
  }'`}
                  />
                  <p className="text-sm text-[#6B7280] mt-3">Response:</p>
                  <CodeBlock
                    code={`{
  "agent_id": "agt_7f3k9m2x4p1q",
  "name": "my-research-agent",
  "description": "AI research assistant",
  "owner_handle": "@myteam",
  "created_at": "2024-01-15T10:30:00Z",
  "score": 0,
  "tier": "Unrated",
  "outcome_count": 0,
  "success_rate": 0
}`}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    3. Submit an Outcome
                  </h3>
                  <p className="text-[#9CA3AF] mb-4">
                    Record an outcome when your agent completes a task.
                  </p>
                  <CodeBlock
                    code={`curl -X POST "${BACKEND_URL}/api/v1/agents/agt_7f3k9m2x4p1q/outcomes" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "result": "success",
    "task_type": "research_query",
    "submitter_type": "self"
  }'`}
                  />
                  <div className="mt-4 p-4 bg-[#0C1116] border border-white/10 rounded-sm">
                    <p className="text-sm text-[#9CA3AF]">
                      <strong className="text-white">Result types:</strong> success, failure, partial, timeout
                    </p>
                    <p className="text-sm text-[#9CA3AF] mt-2">
                      <strong className="text-white">Submitter types:</strong> self (agent self-reports), operator (human operator)
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    4. Get Score
                  </h3>
                  <p className="text-[#9CA3AF] mb-4">
                    Query the agent's current reputation score and trust tier.
                  </p>
                  <CodeBlock
                    code={`curl "${BACKEND_URL}/api/v1/agents/agt_7f3k9m2x4p1q/score" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                  />
                  <p className="text-sm text-[#6B7280] mt-3">Response:</p>
                  <CodeBlock
                    code={`{
  "agent_id": "agt_7f3k9m2x4p1q",
  "score": 87.5,
  "tier": "Gold",
  "outcome_count": 48,
  "success_rate": 87.5
}`}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    5. Embed Badge
                  </h3>
                  <p className="text-[#9CA3AF] mb-4">
                    Add a visual trust badge to your README, docs, or website.
                  </p>
                  <CodeBlock
                    code={`<!-- SVG Badge URL (public, no auth required) -->
<img src="${BACKEND_URL}/api/v1/agents/agt_7f3k9m2x4p1q/badge.svg" alt="RepLedger Badge" />`}
                  />
                  <div className="mt-4 p-4 bg-[#0C1116] border border-white/10 rounded-sm flex items-center justify-center">
                    <div className="badge-preview p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="28" viewBox="0 0 120 28">
                        <defs>
                          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: "#0C1116" }} />
                            <stop offset="100%" style={{ stopColor: "#111827" }} />
                          </linearGradient>
                        </defs>
                        <rect width="120" height="28" rx="4" fill="url(#bg)" stroke="#1F2933" strokeWidth="1" />
                        <rect x="4" y="4" width="52" height="20" rx="3" fill="#FFD700" />
                        <text x="30" y="18" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#111827" textAnchor="middle">Gold</text>
                        <text x="86" y="18" fontFamily="JetBrains Mono, monospace" fontSize="12" fontWeight="700" fill="#F9FAFB" textAnchor="middle">87</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Trust Tiers */}
            <section className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-6">Trust Tiers</h2>
              <p className="text-[#9CA3AF] mb-6">
                Agents are assigned a trust tier based on their score and number of outcomes:
              </p>
              
              <div className="overflow-hidden border border-white/10 rounded-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#0C1116]">
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase">Tier</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase">Score Range</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-[#9CA3AF] uppercase">Requirements</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/5">
                      <td className="px-6 py-4">
                        <span className="tier-badge tier-unrated">Unrated</span>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">—</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">Less than 5 outcomes</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="px-6 py-4">
                        <span className="tier-badge tier-bronze">Bronze</span>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">0–49</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">5+ outcomes</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="px-6 py-4">
                        <span className="tier-badge tier-silver">Silver</span>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">50–74</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">5+ outcomes</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="px-6 py-4">
                        <span className="tier-badge tier-gold">Gold</span>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">75–89</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">5+ outcomes</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="px-6 py-4">
                        <span className="tier-badge tier-platinum">Platinum</span>
                      </td>
                      <td className="px-6 py-4 text-[#9CA3AF]">90–100</td>
                      <td className="px-6 py-4 text-[#9CA3AF]">50+ outcomes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* API Reference */}
            <section className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-6">API Reference</h2>
              
              <div className="space-y-6">
                <div className="p-6 bg-[#0C1116] border border-white/10 rounded-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-mono rounded">POST</span>
                    <code className="text-white font-mono">/api/v1/agents</code>
                  </div>
                  <p className="text-[#9CA3AF] text-sm">Register a new agent</p>
                </div>

                <div className="p-6 bg-[#0C1116] border border-white/10 rounded-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-xs font-mono rounded">GET</span>
                    <code className="text-white font-mono">/api/v1/agents</code>
                  </div>
                  <p className="text-[#9CA3AF] text-sm">List all your agents</p>
                </div>

                <div className="p-6 bg-[#0C1116] border border-white/10 rounded-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-mono rounded">POST</span>
                    <code className="text-white font-mono">/api/v1/agents/{"{agent_id}"}/outcomes</code>
                  </div>
                  <p className="text-[#9CA3AF] text-sm">Submit an outcome for an agent</p>
                </div>

                <div className="p-6 bg-[#0C1116] border border-white/10 rounded-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-xs font-mono rounded">GET</span>
                    <code className="text-white font-mono">/api/v1/agents/{"{agent_id}"}/score</code>
                  </div>
                  <p className="text-[#9CA3AF] text-sm">Get agent score and tier</p>
                </div>

                <div className="p-6 bg-[#0C1116] border border-white/10 rounded-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-xs font-mono rounded">GET</span>
                    <code className="text-white font-mono">/api/v1/agents/{"{agent_id}"}/badge.svg</code>
                  </div>
                  <p className="text-[#9CA3AF] text-sm">Get embeddable SVG badge (public, no auth)</p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center p-12 bg-[#0C1116] border border-white/10 rounded-sm">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-[#9CA3AF] mb-6">
                Create your free account and get your API key in seconds.
              </p>
              <Link to="/signup">
                <Button 
                  size="lg"
                  className="bg-[#01696F] hover:bg-[#028C94] text-white"
                  data-testid="docs-cta-btn"
                >
                  Get API Key
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
