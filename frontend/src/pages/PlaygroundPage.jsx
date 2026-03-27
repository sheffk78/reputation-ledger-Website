import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentsAPI, apiKeyAPI } from "../lib/api";
import { 
  FlaskConical, 
  ArrowLeft, 
  Play, 
  Loader2, 
  Copy, 
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Available endpoints
const ENDPOINTS = [
  {
    id: "list-agents",
    method: "GET",
    path: "/api/v1/agents",
    name: "List Agents",
    description: "Get all agents for the authenticated user",
    params: [],
    requiresAgent: false
  },
  {
    id: "get-agent",
    method: "GET",
    path: "/api/v1/agents/{agent_id}",
    name: "Get Agent",
    description: "Get details for a specific agent",
    params: [],
    requiresAgent: true
  },
  {
    id: "get-score",
    method: "GET",
    path: "/api/v1/agents/{agent_id}/score",
    name: "Get Score",
    description: "Get the reputation score and tier for an agent",
    params: [],
    requiresAgent: true
  },
  {
    id: "list-outcomes",
    method: "GET",
    path: "/api/v1/agents/{agent_id}/outcomes",
    name: "List Outcomes",
    description: "Get outcome history for an agent",
    params: [
      { name: "limit", type: "number", default: 20, description: "Number of outcomes to return" },
      { name: "result", type: "select", options: ["", "success", "failure", "partial", "timeout"], description: "Filter by result type" }
    ],
    requiresAgent: true
  },
  {
    id: "create-agent",
    method: "POST",
    path: "/api/v1/agents",
    name: "Create Agent",
    description: "Register a new agent",
    params: [
      { name: "name", type: "text", required: true, description: "Agent name" },
      { name: "description", type: "text", description: "Agent description" },
      { name: "owner_handle", type: "text", description: "Owner handle (e.g., @myteam)" }
    ],
    requiresAgent: false
  },
  {
    id: "submit-outcome",
    method: "POST",
    path: "/api/v1/agents/{agent_id}/outcomes",
    name: "Submit Outcome",
    description: "Log an outcome for an agent",
    params: [
      { name: "result", type: "select", required: true, options: ["success", "failure", "partial", "timeout"], description: "Outcome result" },
      { name: "task_type", type: "text", description: "Type of task performed" },
      { name: "submitter_type", type: "select", options: ["self", "operator"], default: "self", description: "Who is submitting" }
    ],
    requiresAgent: true
  },
  {
    id: "get-badge",
    method: "GET",
    path: "/api/v1/agents/{agent_id}/badge.svg",
    name: "Get Badge (SVG)",
    description: "Get the embeddable SVG badge (public endpoint)",
    params: [],
    requiresAgent: true,
    isSvg: true
  }
];

function MethodBadge({ method }) {
  const colors = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-green-500/20 text-green-400",
    PUT: "bg-amber-500/20 text-amber-400",
    DELETE: "bg-red-500/20 text-red-400",
    PATCH: "bg-purple-500/20 text-purple-400"
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-mono font-medium rounded ${colors[method]}`}>
      {method}
    </span>
  );
}

export default function PlaygroundPage() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [params, setParams] = useState({});
  const [response, setResponse] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reset params when endpoint changes
    const defaultParams = {};
    selectedEndpoint.params.forEach(p => {
      if (p.default !== undefined) {
        defaultParams[p.name] = p.default;
      }
    });
    setParams(defaultParams);
    setResponse(null);
  }, [selectedEndpoint]);

  const loadData = async () => {
    try {
      const [keyData, agentsData] = await Promise.all([
        apiKeyAPI.get(),
        agentsAPI.list()
      ]);
      setApiKey(keyData.api_key);
      setAgents(agentsData);
      if (agentsData.length > 0) {
        setSelectedAgentId(agentsData[0].agent_id);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load API key or agents");
    } finally {
      setLoading(false);
    }
  };

  const buildUrl = () => {
    let path = selectedEndpoint.path;
    if (selectedEndpoint.requiresAgent && selectedAgentId) {
      path = path.replace("{agent_id}", selectedAgentId);
    }
    
    // Add query params for GET requests
    if (selectedEndpoint.method === "GET" && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== null) {
          queryParams.append(key, value);
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        path += `?${queryString}`;
      }
    }
    
    return `${API_URL}${path}`;
  };

  const buildCurlCommand = () => {
    const url = buildUrl();
    const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : "YOUR_API_KEY";
    
    let curl = `curl -X ${selectedEndpoint.method} "${url}"`;
    curl += ` \\\n  -H "Authorization: Bearer ${maskedKey}"`;
    
    if (selectedEndpoint.method === "POST" || selectedEndpoint.method === "PUT" || selectedEndpoint.method === "PATCH") {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      
      const bodyParams = {};
      selectedEndpoint.params.forEach(p => {
        if (params[p.name] !== undefined && params[p.name] !== "") {
          bodyParams[p.name] = params[p.name];
        }
      });
      
      if (Object.keys(bodyParams).length > 0) {
        curl += ` \\\n  -d '${JSON.stringify(bodyParams, null, 2)}'`;
      }
    }
    
    return curl;
  };

  const executeRequest = async () => {
    if (selectedEndpoint.requiresAgent && !selectedAgentId) {
      toast.error("Please select an agent");
      return;
    }

    setExecuting(true);
    setResponse(null);
    const startTime = Date.now();

    try {
      const url = buildUrl();
      const options = {
        method: selectedEndpoint.method,
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      };

      if (selectedEndpoint.method === "POST" || selectedEndpoint.method === "PUT" || selectedEndpoint.method === "PATCH") {
        options.headers["Content-Type"] = "application/json";
        
        const bodyParams = {};
        selectedEndpoint.params.forEach(p => {
          if (params[p.name] !== undefined && params[p.name] !== "") {
            bodyParams[p.name] = params[p.name];
          }
        });
        
        if (Object.keys(bodyParams).length > 0) {
          options.body = JSON.stringify(bodyParams);
        }
      }

      const res = await fetch(url, options);
      const endTime = Date.now();
      setResponseTime(endTime - startTime);

      if (selectedEndpoint.isSvg) {
        const svgText = await res.text();
        setResponse({
          status: res.status,
          statusText: res.ok ? "OK" : res.statusText,
          data: svgText,
          isSvg: true
        });
      } else {
        const data = await res.json();
        setResponse({
          status: res.status,
          statusText: res.ok ? "OK" : res.statusText,
          data
        });
      }

      // Refresh agents list if we created one
      if (selectedEndpoint.id === "create-agent" && res.ok) {
        const agentsData = await agentsAPI.list();
        setAgents(agentsData);
        toast.success("Agent created!");
      }

      if (selectedEndpoint.id === "submit-outcome" && res.ok) {
        toast.success("Outcome logged!");
      }

    } catch (error) {
      console.error("Request failed:", error);
      setResponse({
        status: 0,
        statusText: "Error",
        data: { error: error.message }
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyCurl = async () => {
    await copyToClipboard(buildCurlCommand());
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyResponse = async () => {
    if (response) {
      const text = response.isSvg ? response.data : JSON.stringify(response.data, null, 2);
      await copyToClipboard(text);
      toast.success("Response copied");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#01696F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#050709]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#01696F] to-[#014F52] rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white font-['Space_Grotesk']">
              API Playground
            </span>
          </div>
          <Link to="/docs" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" />
            Docs
          </Link>
        </div>
      </header>

      {/* Main Content - Split Panel */}
      <main className="flex-1 flex">
        {/* Left Panel - Request Builder */}
        <div className="w-1/2 border-r border-white/[0.06] flex flex-col">
          {/* API Key Section */}
          <div className="p-4 border-b border-white/[0.06] bg-[#0C1116]/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">API Key</span>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <code className="text-sm text-[#01696F] font-mono">
              {showApiKey ? apiKey : `${apiKey?.substring(0, 8)}${'•'.repeat(24)}${apiKey?.substring(apiKey.length - 4)}`}
            </code>
          </div>

          {/* Endpoint Selector */}
          <div className="p-4 border-b border-white/[0.06]">
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
              Endpoint
            </label>
            <div className="relative">
              <select
                value={selectedEndpoint.id}
                onChange={(e) => setSelectedEndpoint(ENDPOINTS.find(ep => ep.id === e.target.value))}
                className="w-full bg-[#0C1116] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                data-testid="endpoint-selector"
              >
                {ENDPOINTS.map(ep => (
                  <option key={ep.id} value={ep.id}>
                    {ep.method} {ep.path} — {ep.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{selectedEndpoint.description}</p>
          </div>

          {/* Agent Selector (if required) */}
          {selectedEndpoint.requiresAgent && (
            <div className="p-4 border-b border-white/[0.06]">
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Agent
              </label>
              {agents.length === 0 ? (
                <p className="text-sm text-gray-400">No agents found. Create one first.</p>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full bg-[#0C1116] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                    data-testid="agent-selector"
                  >
                    {agents.map(agent => (
                      <option key={agent.agent_id} value={agent.agent_id}>
                        {agent.name} ({agent.agent_id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Parameters */}
          {selectedEndpoint.params.length > 0 && (
            <div className="p-4 border-b border-white/[0.06] flex-1 overflow-y-auto">
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-3">
                Parameters
              </label>
              <div className="space-y-4">
                {selectedEndpoint.params.map(param => (
                  <div key={param.name}>
                    <label className="block text-sm text-gray-400 mb-1.5">
                      {param.name}
                      {param.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {param.type === "select" ? (
                      <select
                        value={params[param.name] || ""}
                        onChange={(e) => setParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                        className="w-full bg-[#0C1116] border border-white/[0.08] rounded-lg px-4 py-2 text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                        data-testid={`param-${param.name}`}
                      >
                        {param.options.map(opt => (
                          <option key={opt} value={opt}>{opt || "(none)"}</option>
                        ))}
                      </select>
                    ) : param.type === "number" ? (
                      <input
                        type="number"
                        value={params[param.name] || ""}
                        onChange={(e) => setParams(prev => ({ ...prev, [param.name]: parseInt(e.target.value) || "" }))}
                        placeholder={param.description}
                        className="w-full bg-[#0C1116] border border-white/[0.08] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                        data-testid={`param-${param.name}`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={params[param.name] || ""}
                        onChange={(e) => setParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                        placeholder={param.description}
                        className="w-full bg-[#0C1116] border border-white/[0.08] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                        data-testid={`param-${param.name}`}
                      />
                    )}
                    {param.description && (
                      <p className="text-xs text-gray-600 mt-1">{param.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* cURL Preview */}
          <div className="p-4 border-t border-white/[0.06] bg-[#0C1116]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">cURL</span>
              <button
                onClick={handleCopyCurl}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {buildCurlCommand()}
            </pre>
          </div>

          {/* Execute Button */}
          <div className="p-4 border-t border-white/[0.06]">
            <button
              onClick={executeRequest}
              disabled={executing || (selectedEndpoint.requiresAgent && !selectedAgentId)}
              className="w-full py-3 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="execute-btn"
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel - Response Viewer */}
        <div className="w-1/2 flex flex-col bg-[#0C1116]/30">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Response</span>
              {response && (
                <>
                  <span className={`px-2 py-0.5 text-xs font-mono rounded ${
                    response.status >= 200 && response.status < 300 
                      ? "bg-green-500/20 text-green-400"
                      : response.status >= 400
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {response.status} {response.statusText}
                  </span>
                  {responseTime && (
                    <span className="text-xs text-gray-500">{responseTime}ms</span>
                  )}
                </>
              )}
            </div>
            {response && (
              <button
                onClick={handleCopyResponse}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {!response ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FlaskConical className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">Send a request to see the response</p>
                </div>
              </div>
            ) : response.isSvg ? (
              <div className="space-y-4">
                {/* SVG Preview */}
                <div className="bg-white/5 rounded-lg p-8 flex items-center justify-center">
                  <div dangerouslySetInnerHTML={{ __html: response.data }} />
                </div>
                {/* Raw SVG */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Raw SVG:</p>
                  <pre className="text-xs text-gray-400 font-mono bg-[#050709] rounded-lg p-4 overflow-auto max-h-64">
                    {response.data}
                  </pre>
                </div>
              </div>
            ) : (
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
