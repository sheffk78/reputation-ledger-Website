import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Menu, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../lib/utils";

const API_BASE_URL = "https://api.repledger.io";
const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

// Sidebar navigation structure
const NAV_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "authentication", label: "Authentication" },
      { id: "base-url", label: "Base URL" },
      { id: "rate-limits", label: "Rate Limits" }
    ]
  },
  {
    title: "Agents",
    items: [
      { id: "register-agent", label: "Register Agent", method: "POST" },
      { id: "list-agents", label: "List Agents", method: "GET" },
      { id: "get-agent", label: "Get Agent", method: "GET" },
      { id: "delete-agent", label: "Delete Agent", method: "DELETE" },
      { id: "toggle-public", label: "Toggle Public", method: "PATCH" }
    ]
  },
  {
    title: "Outcomes",
    items: [
      { id: "submit-outcome", label: "Submit Outcome", method: "POST" },
      { id: "list-outcomes", label: "List Outcomes", method: "GET" }
    ]
  },
  {
    title: "Scoring",
    items: [
      { id: "get-score", label: "Get Score", method: "GET" },
      { id: "get-badge", label: "Get Badge", method: "GET" },
      { id: "trust-tiers", label: "Trust Tiers" },
      { id: "scoring-algorithm", label: "Scoring Algorithm" }
    ]
  },
  {
    title: "Flags",
    items: [
      { id: "submit-flag", label: "Submit Flag", method: "POST" },
      { id: "list-flags", label: "List Flags", method: "GET" }
    ]
  },
  {
    title: "Webhooks",
    items: [
      { id: "create-webhook", label: "Create Webhook", method: "POST" },
      { id: "list-webhooks", label: "List Webhooks", method: "GET" },
      { id: "delete-webhook", label: "Delete Webhook", method: "DELETE" },
      { id: "webhook-events", label: "Webhook Events" }
    ]
  },
  {
    title: "Error Handling",
    items: [
      { id: "error-format", label: "Error Format" },
      { id: "error-codes", label: "Error Codes" }
    ]
  }
];

function MethodBadge({ method, size = "sm" }) {
  const colors = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-green-500/20 text-green-400",
    PUT: "bg-amber-500/20 text-amber-400",
    DELETE: "bg-red-500/20 text-red-400",
    PATCH: "bg-purple-500/20 text-purple-400"
  };

  const sizes = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs"
  };

  return (
    <span className={`font-mono font-medium rounded ${colors[method]} ${sizes[size]}`}>
      {method}
    </span>
  );
}

function MethodDot({ method }) {
  const colors = {
    GET: "bg-blue-400",
    POST: "bg-green-400",
    DELETE: "bg-red-400",
    PATCH: "bg-purple-400"
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[method]}`} />;
}

function CodeBlock({ code, language = "bash" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#050709] border border-white/[0.06] rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  );
}

function EndpointSection({ id, method, path, description, auth, requestBody, responseBody, errorResponses, curl }) {
  return (
    <section id={id} className="scroll-mt-20 pb-12 border-b border-white/[0.06] last:border-b-0">
      <div className="flex items-center gap-3 mb-4">
        <MethodBadge method={method} />
        <code className="text-white font-mono">{path}</code>
      </div>
      <p className="text-gray-400 mb-4">{description}</p>
      
      {auth && (
        <p className="text-xs text-amber-400 mb-4">
          Requires authentication: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded">Authorization: Bearer {'{API_KEY}'}</code>
        </p>
      )}

      {requestBody && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white mb-2">Request Body</h4>
          <CodeBlock code={requestBody.example} language="json" />
          {requestBody.fields && (
            <table className="w-full mt-3 text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2 font-medium">Field</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Required</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {requestBody.fields.map((field, idx) => (
                  <tr key={idx} className="border-t border-white/[0.04]">
                    <td className="py-2 font-mono text-[#01696F]">{field.name}</td>
                    <td className="py-2 text-gray-500">{field.type}</td>
                    <td className="py-2">{field.required ? "Yes" : "No"}</td>
                    <td className="py-2 text-gray-400">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {responseBody && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white mb-2">Response</h4>
          <CodeBlock code={responseBody} language="json" />
        </div>
      )}

      {errorResponses && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white mb-2">Error Responses</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            {errorResponses.map((err, idx) => (
              <li key={idx}>
                <span className="text-red-400 font-mono">{err.code}</span> — {err.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {curl && (
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Example</h4>
          <CodeBlock code={curl} language="bash" />
        </div>
      )}
    </section>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef(null);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050709] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050709]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">
              Blog
            </Link>
            <Link to="/developers" className="text-sm text-gray-400 hover:text-white transition-colors">
              Developers
            </Link>
            <span className="text-sm text-white">
              Docs
            </span>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-[#01696F] hover:bg-[#015858] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start free
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`w-64 bg-[#0C1116] border-r border-white/[0.08] fixed left-0 top-[65px] bottom-0 overflow-y-auto z-40 transition-transform md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="p-4">
            {NAV_SECTIONS.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors ${
                          activeSection === item.id
                            ? "text-[#01696F] bg-[#01696F]/10"
                            : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        {item.method && <MethodDot method={item.method} />}
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main ref={mainRef} className="flex-1 md:ml-64 p-8 max-w-3xl">
          {/* Overview */}
          <section id="overview" className="scroll-mt-20 pb-12 border-b border-white/[0.06]">
            <h1 className="text-3xl font-bold text-white mb-4 font-['Space_Grotesk']">API Reference</h1>
            <p className="text-gray-400 mb-6">
              The RepLedger API lets you programmatically manage agent reputation. Register agents, 
              submit outcomes, retrieve scores, and embed reputation badges.
            </p>
            <div className="flex gap-4">
              <Link
                to="/playground"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#01696F] hover:bg-[#015858] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Try Playground
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-white text-sm font-medium rounded-lg transition-colors border border-white/[0.08]"
              >
                Get API Key
              </Link>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Authentication</h2>
            <p className="text-gray-400 mb-4">
              All API requests (except badge.svg) require authentication using an API key.
            </p>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white mb-2">Key Format</h4>
              <code className="text-[#01696F] font-mono">arl_</code>
              <span className="text-gray-400"> + 48 hexadecimal characters</span>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white mb-2">Usage</h4>
              <CodeBlock code={`Authorization: Bearer arl_your_api_key_here`} />
            </div>
            <p className="text-sm text-amber-400">
              Keep your API key secure. Do not expose it in client-side code.
            </p>
          </section>

          {/* Base URL */}
          <section id="base-url" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Base URL</h2>
            <CodeBlock code={API_BASE_URL} />
            <p className="text-gray-400 mt-4">
              All API endpoints are relative to this base URL.
            </p>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Rate Limits</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Limit</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Free</td>
                  <td className="py-3">60 requests/min</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Builder</td>
                  <td className="py-3">300 requests/min</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Platform</td>
                  <td className="py-3">1,000 requests/min</td>
                </tr>
                <tr>
                  <td className="py-3">Enterprise</td>
                  <td className="py-3">Custom</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Register Agent */}
          <EndpointSection
            id="register-agent"
            method="POST"
            path="/v1/agents"
            description="Register a new agent to track its reputation."
            auth={true}
            requestBody={{
              example: `{
  "name": "my-support-bot",
  "description": "Customer support automation agent",
  "owner_handle": "@myteam"
}`,
              fields: [
                { name: "name", type: "string", required: true, description: "Unique agent identifier (3-50 chars)" },
                { name: "description", type: "string", required: false, description: "Agent description (max 500 chars)" },
                { name: "owner_handle", type: "string", required: false, description: "Owner identifier (e.g., @handle)" }
              ]
            }}
            responseBody={`{
  "agent_id": "agt_a1b2c3d4e5f6",
  "name": "my-support-bot",
  "description": "Customer support automation agent",
  "owner_handle": "@myteam",
  "score": 0,
  "tier": "Unrated",
  "outcome_count": 0,
  "created_at": "2026-03-27T12:00:00Z"
}`}
            errorResponses={[
              { code: "401", description: "Invalid or missing API key" },
              { code: "422", description: "Validation error (name required, format invalid)" }
            ]}
            curl={`curl -X POST ${API_BASE_URL}/v1/agents \\
  -H "Authorization: Bearer arl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-agent", "description": "My agent"}'`}
          />

          {/* List Agents */}
          <EndpointSection
            id="list-agents"
            method="GET"
            path="/v1/agents"
            description="Get all agents owned by the authenticated user."
            auth={true}
            responseBody={`[
  {
    "agent_id": "agt_a1b2c3d4e5f6",
    "name": "my-support-bot",
    "score": 85,
    "tier": "Gold",
    "outcome_count": 150,
    "is_public": true
  }
]`}
            curl={`curl -X GET ${API_BASE_URL}/v1/agents \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Get Agent */}
          <EndpointSection
            id="get-agent"
            method="GET"
            path="/v1/agents/{agent_id}"
            description="Get details for a specific agent."
            auth={true}
            responseBody={`{
  "agent_id": "agt_a1b2c3d4e5f6",
  "name": "my-support-bot",
  "description": "Customer support automation agent",
  "score": 85,
  "tier": "Gold",
  "outcome_count": 150,
  "success_rate": 0.85,
  "is_public": true,
  "created_at": "2026-03-27T12:00:00Z"
}`}
            errorResponses={[
              { code: "404", description: "Agent not found" }
            ]}
            curl={`curl -X GET ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6 \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Delete Agent */}
          <EndpointSection
            id="delete-agent"
            method="DELETE"
            path="/v1/agents/{agent_id}"
            description="Delete an agent and all associated data (outcomes, flags)."
            auth={true}
            responseBody={`204 No Content`}
            errorResponses={[
              { code: "404", description: "Agent not found" }
            ]}
            curl={`curl -X DELETE ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6 \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Toggle Public */}
          <EndpointSection
            id="toggle-public"
            method="PATCH"
            path="/v1/agents/{agent_id}"
            description="Update agent visibility (public/private profile)."
            auth={true}
            requestBody={{
              example: `{
  "is_public": true
}`,
              fields: [
                { name: "is_public", type: "boolean", required: true, description: "Whether agent profile is publicly visible" }
              ]
            }}
            responseBody={`{
  "agent_id": "agt_a1b2c3d4e5f6",
  "is_public": true,
  "updated_at": "2026-03-27T12:00:00Z"
}`}
            curl={`curl -X PATCH ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6 \\
  -H "Authorization: Bearer arl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"is_public": true}'`}
          />

          {/* Submit Outcome */}
          <EndpointSection
            id="submit-outcome"
            method="POST"
            path="/v1/agents/{agent_id}/outcomes"
            description="Log an outcome for an agent. This affects the agent's score."
            auth={true}
            requestBody={{
              example: `{
  "result": "success",
  "task_type": "customer_inquiry",
  "submitter_type": "self"
}`,
              fields: [
                { name: "result", type: "enum", required: true, description: "success | failure | partial | timeout" },
                { name: "task_type", type: "string", required: false, description: "Type of task performed" },
                { name: "submitter_type", type: "enum", required: false, description: "self | operator (default: self)" }
              ]
            }}
            responseBody={`{
  "id": "out_xyz123",
  "agent_id": "agt_a1b2c3d4e5f6",
  "result": "success",
  "task_type": "customer_inquiry",
  "created_at": "2026-03-27T12:00:00Z"
}`}
            errorResponses={[
              { code: "404", description: "Agent not found" },
              { code: "422", description: "Invalid result value" }
            ]}
            curl={`curl -X POST ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6/outcomes \\
  -H "Authorization: Bearer arl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"result": "success", "task_type": "inquiry"}'`}
          />

          {/* List Outcomes */}
          <EndpointSection
            id="list-outcomes"
            method="GET"
            path="/v1/agents/{agent_id}/outcomes"
            description="Get outcome history for an agent."
            auth={true}
            responseBody={`{
  "outcomes": [
    {
      "id": "out_xyz123",
      "result": "success",
      "task_type": "customer_inquiry",
      "created_at": "2026-03-27T12:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}`}
            curl={`curl -X GET "${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6/outcomes?limit=20" \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Get Score */}
          <EndpointSection
            id="get-score"
            method="GET"
            path="/v1/agents/{agent_id}/score"
            description="Get the current reputation score and tier for an agent."
            auth={true}
            responseBody={`{
  "agent_id": "agt_a1b2c3d4e5f6",
  "score": 85,
  "tier": "Gold",
  "outcome_count": 150,
  "success_rate": 0.85,
  "breakdown": {
    "success": 128,
    "failure": 12,
    "partial": 8,
    "timeout": 2
  }
}`}
            curl={`curl -X GET ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6/score \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Get Badge */}
          <EndpointSection
            id="get-badge"
            method="GET"
            path="/v1/agents/{agent_id}/badge.svg"
            description="Get an embeddable SVG badge showing the agent's tier and score. This is the only public endpoint."
            auth={false}
            responseBody={`<svg>...</svg>

Embed in HTML:
<img src="https://api.repledger.io/v1/agents/{agent_id}/badge.svg" alt="RepLedger Badge" />`}
            curl={`curl -X GET ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6/badge.svg`}
          />

          {/* Trust Tiers */}
          <section id="trust-tiers" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Trust Tiers</h2>
            <p className="text-gray-400 mb-6">
              Agents are assigned a trust tier based on their score and minimum outcome count.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 font-medium">Tier</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Min Outcomes</th>
                  <th className="pb-3 font-medium">Color</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Unrated</td>
                  <td className="py-3">—</td>
                  <td className="py-3">&lt;5</td>
                  <td className="py-3"><span className="w-3 h-3 rounded-full bg-[#4B5563] inline-block" /></td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Bronze</td>
                  <td className="py-3">0–49</td>
                  <td className="py-3">5+</td>
                  <td className="py-3"><span className="w-3 h-3 rounded-full bg-[#CD7F32] inline-block" /></td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Silver</td>
                  <td className="py-3">50–74</td>
                  <td className="py-3">5+</td>
                  <td className="py-3"><span className="w-3 h-3 rounded-full bg-[#C0C0C0] inline-block" /></td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3">Gold</td>
                  <td className="py-3">75–89</td>
                  <td className="py-3">5+</td>
                  <td className="py-3"><span className="w-3 h-3 rounded-full bg-[#FFD700] inline-block" /></td>
                </tr>
                <tr>
                  <td className="py-3">Platinum</td>
                  <td className="py-3">90–100</td>
                  <td className="py-3">50+</td>
                  <td className="py-3"><span className="w-3 h-3 rounded-full bg-[#01696F] inline-block" /></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Scoring Algorithm */}
          <section id="scoring-algorithm" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Scoring Algorithm</h2>
            <CodeBlock code={`score = (successful_outcomes / total_outcomes) * 100`} />
            <ul className="mt-4 text-gray-400 space-y-2 text-sm">
              <li>• Only <code className="text-[#01696F]">success</code> outcomes count as successful</li>
              <li>• <code className="text-[#01696F]">failure</code>, <code className="text-[#01696F]">partial</code>, and <code className="text-[#01696F]">timeout</code> count against the score</li>
              <li>• Tier assignment requires both score threshold AND minimum outcome count</li>
            </ul>
          </section>

          {/* Submit Flag */}
          <EndpointSection
            id="submit-flag"
            method="POST"
            path="/v1/agents/{agent_id}/flags"
            description="Flag an agent or specific outcome for review."
            auth={true}
            requestBody={{
              example: `{
  "reason": "Inappropriate response",
  "notes": "Agent gave harmful advice",
  "outcome_id": "out_xyz123"
}`,
              fields: [
                { name: "reason", type: "string", required: true, description: "Reason for flagging" },
                { name: "notes", type: "string", required: false, description: "Additional notes" },
                { name: "outcome_id", type: "string", required: false, description: "Specific outcome to flag" }
              ]
            }}
            responseBody={`{
  "id": "flg_abc123",
  "agent_id": "agt_a1b2c3d4e5f6",
  "reason": "Inappropriate response",
  "created_at": "2026-03-27T12:00:00Z"
}`}
            curl={`curl -X POST ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6/flags \\
  -H "Authorization: Bearer arl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"reason": "Inappropriate response"}'`}
          />

          {/* List Flags */}
          <EndpointSection
            id="list-flags"
            method="GET"
            path="/v1/agents/{agent_id}/flags"
            description="Get all flags for an agent."
            auth={true}
            responseBody={`[
  {
    "id": "flg_abc123",
    "reason": "Inappropriate response",
    "outcome_id": "out_xyz123",
    "created_at": "2026-03-27T12:00:00Z"
  }
]`}
            curl={`curl -X GET ${API_BASE_URL}/v1/agents/agt_a1b2c3d4e5f6/flags \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Create Webhook */}
          <EndpointSection
            id="create-webhook"
            method="POST"
            path="/webhooks"
            description="Create a webhook subscription to receive real-time notifications."
            auth={true}
            requestBody={{
              example: `{
  "url": "https://your-server.com/webhooks",
  "event_type": "outcome.created"
}`,
              fields: [
                { name: "url", type: "string", required: true, description: "HTTPS URL to receive webhook events" },
                { name: "event_type", type: "enum", required: true, description: "outcome.created | score.changed | tier.changed" }
              ]
            }}
            responseBody={`{
  "id": "whk_xyz123",
  "url": "https://your-server.com/webhooks",
  "event_type": "outcome.created",
  "is_active": true,
  "created_at": "2026-03-27T12:00:00Z"
}`}
            curl={`curl -X POST ${API_BASE_URL}/webhooks \\
  -H "Authorization: Bearer arl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-server.com/webhooks", "event_type": "outcome.created"}'`}
          />

          {/* List Webhooks */}
          <EndpointSection
            id="list-webhooks"
            method="GET"
            path="/webhooks"
            description="Get all webhook subscriptions."
            auth={true}
            responseBody={`[
  {
    "id": "whk_xyz123",
    "url": "https://your-server.com/webhooks",
    "event_type": "outcome.created",
    "is_active": true
  }
]`}
            curl={`curl -X GET ${API_BASE_URL}/webhooks \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Delete Webhook */}
          <EndpointSection
            id="delete-webhook"
            method="DELETE"
            path="/webhooks/{webhook_id}"
            description="Delete a webhook subscription."
            auth={true}
            responseBody={`204 No Content`}
            curl={`curl -X DELETE ${API_BASE_URL}/webhooks/whk_xyz123 \\
  -H "Authorization: Bearer arl_your_key"`}
          />

          {/* Webhook Events */}
          <section id="webhook-events" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Webhook Events</h2>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">outcome.created</h4>
                <p className="text-sm text-gray-400 mb-2">Fired when a new outcome is logged.</p>
                <CodeBlock code={`{
  "event": "outcome.created",
  "agent_id": "agt_a1b2c3d4e5f6",
  "outcome": {
    "id": "out_xyz123",
    "result": "success",
    "task_type": "inquiry"
  },
  "timestamp": "2026-03-27T12:00:00Z"
}`} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-2">score.changed</h4>
                <p className="text-sm text-gray-400 mb-2">Fired when an agent's score changes.</p>
                <CodeBlock code={`{
  "event": "score.changed",
  "agent_id": "agt_a1b2c3d4e5f6",
  "previous_score": 80,
  "new_score": 85,
  "timestamp": "2026-03-27T12:00:00Z"
}`} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-2">tier.changed</h4>
                <p className="text-sm text-gray-400 mb-2">Fired when an agent's tier changes.</p>
                <CodeBlock code={`{
  "event": "tier.changed",
  "agent_id": "agt_a1b2c3d4e5f6",
  "previous_tier": "Silver",
  "new_tier": "Gold",
  "timestamp": "2026-03-27T12:00:00Z"
}`} />
              </div>
            </div>
          </section>

          {/* Error Format */}
          <section id="error-format" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Error Format</h2>
            <p className="text-gray-400 mb-4">All errors return a consistent JSON structure:</p>
            <CodeBlock code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "fields": {
        "name": "Name is required."
      }
    }
  }
}`} />
          </section>

          {/* Error Codes */}
          <section id="error-codes" className="scroll-mt-20 py-12 border-b border-white/[0.06]">
            <h2 className="text-2xl font-bold text-white mb-4 font-['Space_Grotesk']">Error Codes</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3 font-mono text-red-400">INVALID_CREDENTIALS</td>
                  <td className="py-3">401</td>
                  <td className="py-3 text-gray-400">Invalid email/password</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3 font-mono text-red-400">INVALID_API_KEY</td>
                  <td className="py-3">401</td>
                  <td className="py-3 text-gray-400">Missing or invalid API key</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3 font-mono text-red-400">RESOURCE_NOT_FOUND</td>
                  <td className="py-3">404</td>
                  <td className="py-3 text-gray-400">Agent or resource not found</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3 font-mono text-red-400">VALIDATION_ERROR</td>
                  <td className="py-3">422</td>
                  <td className="py-3 text-gray-400">Invalid request parameters</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="py-3 font-mono text-red-400">RATE_LIMIT_EXCEEDED</td>
                  <td className="py-3">429</td>
                  <td className="py-3 text-gray-400">Too many requests</td>
                </tr>
                <tr>
                  <td className="py-3 font-mono text-red-400">INTERNAL_ERROR</td>
                  <td className="py-3">500</td>
                  <td className="py-3 text-gray-400">Server error</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Feature Request Link */}
          <section className="py-12">
            <div className="bg-[#0C1116] border border-white/[0.08] rounded-lg p-6 text-center">
              <p className="text-gray-400">
                Something missing? <Link to="/changelog#feature-requests" className="text-[#01696F] hover:underline">Request a feature →</Link>
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
