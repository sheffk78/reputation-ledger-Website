import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { agentsAPI } from "../lib/api";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BASE_URL = "https://reputationledger.dev";
const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

// Tier badge colors
const tierColors = {
  Unrated: "bg-gray-600 text-gray-200",
  Bronze: "bg-amber-700 text-amber-100",
  Silver: "bg-gray-400 text-gray-900",
  Gold: "bg-yellow-500 text-yellow-900",
  Platinum: "bg-[#01696F] text-cyan-100",
};

export default function PublicAgentPage() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  // Set SEO meta tags when agent loads
  useEffect(() => {
    if (!agent) return;

    const badgeUrl = `${API_URL}/api/v1/agents/${agent.agent_id}/badge.svg`;
    const profileUrl = `${BASE_URL}/a/${agent.agent_id}`;
    const title = `${agent.name} - ${agent.tier} Tier Agent | RepLedger`;
    const description = agent.description 
      ? `${agent.description} | Score: ${agent.score} | ${agent.outcome_count} outcomes | ${agent.success_rate}% success rate`
      : `${agent.name} is a ${agent.tier} tier AI agent with a reputation score of ${agent.score}. ${agent.outcome_count} verified outcomes with ${agent.success_rate}% success rate.`;

    // Title
    document.title = title;

    // Helper to set/update meta tags
    const setMetaTag = (name, content, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    // Standard meta
    setMetaTag("description", description);
    
    // Open Graph
    setMetaTag("og:type", "profile", true);
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:url", profileUrl, true);
    setMetaTag("og:image", badgeUrl, true);
    setMetaTag("og:site_name", "RepLedger", true);
    
    // Twitter
    setMetaTag("twitter:card", "summary");
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    setMetaTag("twitter:image", badgeUrl);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = profileUrl;

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": agent.name,
      "description": agent.description || `AI agent with ${agent.tier} tier reputation`,
      "applicationCategory": "AI Agent",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": agent.score,
        "bestRating": 100,
        "worstRating": 0,
        "ratingCount": agent.outcome_count
      },
      "publisher": {
        "@type": "Organization",
        "name": "RepLedger",
        "url": BASE_URL
      },
      "url": profileUrl,
      "image": badgeUrl
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"][data-agent-profile]');
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.setAttribute("data-agent-profile", "true");
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);

    // Cleanup
    return () => {
      document.title = "RepLedger | Agent Reputation";
      // Remove agent-specific meta tags
      const tagsToRemove = [
        'meta[property="og:type"]',
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[property="og:url"]',
        'meta[property="og:image"]',
        'meta[property="og:site_name"]',
        'meta[name="twitter:card"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
        'meta[name="twitter:image"]',
        'link[rel="canonical"]',
        'script[data-agent-profile]'
      ];
      tagsToRemove.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.remove();
      });
    };
  }, [agent]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentsAPI.getPublicProfile(agentId);
      setAgent(data);
    } catch (err) {
      console.error("Failed to load agent:", err);
      if (err.response?.status === 404) {
        setError("not_available");
      } else {
        setError("error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#01696F]"></div>
      </div>
    );
  }

  if (error === "not_available") {
    return (
      <div className="min-h-screen bg-[#050709]">
        {/* Header */}
        <header className="border-b border-[#1F2933]/50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Link to="/">
              <img src={LOGO_URL} alt="RepLedger" className="h-6" />
            </Link>
          </div>
        </header>

        {/* Not Available Message */}
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <div className="w-16 h-16 rounded-full bg-[#1F2933] flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2 font-['Space_Grotesk']">
            Profile Not Available
          </h1>
          <p className="text-gray-400 text-center max-w-md mb-8">
            This agent profile is not publicly available. The owner may have disabled public visibility.
          </p>
          <Link 
            to="/"
            className="px-6 py-2.5 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#050709] flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-6">Unable to load agent profile</p>
        <Link to="/" className="text-[#01696F] hover:text-[#018080]">Go to Homepage</Link>
      </div>
    );
  }

  const badgeUrl = `${API_URL}/api/v1/agents/${agent.agent_id}/badge.svg`;

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
      <header className="border-b border-[#1F2933]/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
          </Link>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Public Profile</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Agent Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white font-['Space_Grotesk']" data-testid="public-agent-name">
                {agent.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tierColors[agent.tier]}`}>
                {agent.tier}
              </span>
            </div>
            {agent.owner_handle && (
              <p className="text-gray-400 text-sm">
                by <span className="text-[#01696F]">{agent.owner_handle}</span>
              </p>
            )}
            {agent.description && (
              <p className="text-gray-400 mt-3 leading-relaxed">
                {agent.description}
              </p>
            )}
          </div>
          
          {/* Badge */}
          <div className="flex-shrink-0">
            <img 
              src={badgeUrl} 
              alt={`${agent.name} badge`} 
              className="h-7"
              data-testid="public-agent-badge"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-[#0C1116] border border-[#1F2933] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Score</p>
            <p className="text-3xl font-bold text-white font-['Space_Grotesk']" data-testid="public-agent-score">
              {agent.score}
            </p>
          </div>
          <div className="bg-[#0C1116] border border-[#1F2933] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Success Rate</p>
            <p className="text-3xl font-bold text-[#22C55E] font-['Space_Grotesk']">
              {agent.success_rate}%
            </p>
          </div>
          <div className="bg-[#0C1116] border border-[#1F2933] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outcomes</p>
            <p className="text-3xl font-bold text-white font-['Space_Grotesk']" data-testid="public-agent-outcomes">
              {agent.outcome_count}
            </p>
          </div>
          <div className="bg-[#0C1116] border border-[#1F2933] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trust Tier</p>
            <p className={`text-2xl font-bold font-['Space_Grotesk'] ${
              agent.tier === "Platinum" ? "text-cyan-400" :
              agent.tier === "Gold" ? "text-yellow-500" :
              agent.tier === "Silver" ? "text-gray-300" :
              agent.tier === "Bronze" ? "text-amber-600" :
              "text-gray-500"
            }`}>
              {agent.tier}
            </p>
          </div>
        </div>

        {/* Outcome Breakdown */}
        <div className="bg-[#0C1116] border border-[#1F2933] rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-white mb-5 font-['Space_Grotesk']">
            Performance Breakdown
          </h2>
          <div className="space-y-4">
            {/* Success */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 w-20">Success</span>
              <div className="flex-1 h-3 bg-[#1F2933] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#22C55E] rounded-full transition-all duration-500"
                  style={{ width: `${agent.outcome_count > 0 ? (agent.breakdown.success / agent.outcome_count) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#22C55E] w-10 text-right">{agent.breakdown.success}</span>
            </div>
            
            {/* Failure */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 w-20">Failure</span>
              <div className="flex-1 h-3 bg-[#1F2933] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#EF4444] rounded-full transition-all duration-500"
                  style={{ width: `${agent.outcome_count > 0 ? (agent.breakdown.failure / agent.outcome_count) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#EF4444] w-10 text-right">{agent.breakdown.failure}</span>
            </div>
            
            {/* Partial */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 w-20">Partial</span>
              <div className="flex-1 h-3 bg-[#1F2933] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                  style={{ width: `${agent.outcome_count > 0 ? (agent.breakdown.partial / agent.outcome_count) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#F59E0B] w-10 text-right">{agent.breakdown.partial}</span>
            </div>
            
            {/* Timeout */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 w-20">Timeout</span>
              <div className="flex-1 h-3 bg-[#1F2933] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#6B7280] rounded-full transition-all duration-500"
                  style={{ width: `${agent.outcome_count > 0 ? (agent.breakdown.timeout / agent.outcome_count) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#6B7280] w-10 text-right">{agent.breakdown.timeout}</span>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-[#0C1116] border border-[#1F2933] rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-white mb-3 font-['Space_Grotesk']">
            Share This Profile
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Share this agent's reputation profile on social media or embed the badge on your site.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${agent.name} - a ${agent.tier} tier AI agent with ${agent.score} reputation score on @RepLedger`)}&url=${encodeURIComponent(`${BASE_URL}/a/${agent.agent_id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] text-sm font-medium rounded-lg transition-colors"
            >
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${BASE_URL}/a/${agent.agent_id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] text-sm font-medium rounded-lg transition-colors"
            >
              Share on LinkedIn
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/a/${agent.agent_id}`);
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">
            Verified by RepLedger — Track record API for autonomous agents
          </p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-[#01696F] hover:text-[#018080] text-sm font-medium transition-colors"
          >
            Learn more about RepLedger
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
