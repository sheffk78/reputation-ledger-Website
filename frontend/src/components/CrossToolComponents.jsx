/**
 * Cross-Tool Integration Components
 * 
 * UI components for displaying AAV, Safe-Spend, and organization integration data.
 * These components render conditionally based on whether the data is populated.
 */
import React from "react";
import { Shield, Wallet, Building2, Link2, ExternalLink } from "lucide-react";

// Source badge for outcomes
export function OutcomeSourceBadge({ source }) {
  if (!source || source === "manual") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#374151] text-[#9CA3AF]">
        Manual
      </span>
    );
  }
  
  if (source === "aav") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#1E3A5F] text-[#60A5FA]">
        <Shield className="w-2.5 h-2.5" />
        AAV
      </span>
    );
  }
  
  if (source === "safe_spend") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#134E4A] text-[#5EEAD4]">
        <Wallet className="w-2.5 h-2.5" />
        Safe-Spend
      </span>
    );
  }
  
  return null;
}

// Outcome sources breakdown chart
export function OutcomeSourcesChart({ outcomes = [] }) {
  // Calculate source breakdown
  const sourceCounts = outcomes.reduce((acc, o) => {
    const source = o.source || "manual";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
  
  const total = outcomes.length;
  if (total === 0) return null;
  
  const sources = [
    { key: "manual", label: "Manual", color: "#374151", textColor: "#9CA3AF" },
    { key: "aav", label: "AAV", color: "#1E3A5F", textColor: "#60A5FA" },
    { key: "safe_spend", label: "Safe-Spend", color: "#134E4A", textColor: "#5EEAD4" },
  ].filter(s => sourceCounts[s.key] > 0);
  
  if (sources.length <= 1) return null; // No need to show if only one source
  
  return (
    <div className="card-surface p-4">
      <h3 className="text-[13px] font-semibold text-white mb-4">Outcome Sources</h3>
      
      {/* Bar chart */}
      <div className="h-3 bg-[#1A1F26] rounded-sm overflow-hidden flex">
        {sources.map(source => {
          const count = sourceCounts[source.key] || 0;
          const percent = (count / total) * 100;
          return (
            <div
              key={source.key}
              className="h-full"
              style={{ 
                width: `${percent}%`, 
                backgroundColor: source.color,
                minWidth: count > 0 ? '4px' : '0'
              }}
              title={`${source.label}: ${count} (${percent.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3">
        {sources.map(source => {
          const count = sourceCounts[source.key] || 0;
          const percent = ((count / total) * 100).toFixed(1);
          return (
            <div key={source.key} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-sm" 
                style={{ backgroundColor: source.color }}
              />
              <span className="text-[11px] text-[#9CA3AF]">
                {source.label}: {count} ({percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Cross-Tool Status section for Agent Detail
export function CrossToolStatus({ agent }) {
  const hasAAV = agent?.aav_certificate_id;
  const hasSafeSpend = agent?.safe_spend_escrow_id;
  
  // Only render if either integration is present
  if (!hasAAV && !hasSafeSpend) return null;
  
  return (
    <div className="card-surface p-4">
      <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
        <Link2 className="w-4 h-4 text-[#01696F]" />
        Cross-Tool Status
      </h3>
      
      <div className="space-y-3">
        {hasAAV && (
          <div className="flex items-center justify-between p-3 bg-[#1E3A5F]/30 rounded-sm border border-[#1E3A5F]/50">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-[#60A5FA]" />
              <div>
                <div className="text-[12px] font-medium text-white">AAV Certificate</div>
                <code className="text-[10px] text-[#60A5FA] font-mono">
                  {agent.aav_certificate_id}
                </code>
              </div>
            </div>
            <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">
              Linked
            </span>
          </div>
        )}
        
        {hasSafeSpend && (
          <div className="flex items-center justify-between p-3 bg-[#134E4A]/30 rounded-sm border border-[#134E4A]/50">
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-[#5EEAD4]" />
              <div>
                <div className="text-[12px] font-medium text-white">Safe-Spend Account</div>
                <code className="text-[10px] text-[#5EEAD4] font-mono">
                  {agent.safe_spend_escrow_id}
                </code>
              </div>
            </div>
            <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">
              Linked
            </span>
          </div>
        )}
      </div>
      
      {agent.organization_id && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
            <Building2 className="w-3.5 h-3.5" />
            <span>Organization: </span>
            <code className="text-[#9CA3AF] font-mono">{agent.organization_id}</code>
          </div>
        </div>
      )}
    </div>
  );
}

// Ecosystem Integration card for Dashboard
export function EcosystemIntegrationCard({ user, agents = [] }) {
  const orgId = user?.organization_id;
  
  // Only render if org is linked
  if (!orgId) return null;
  
  // Count agents with integrations
  const aavCount = agents.filter(a => a.aav_certificate_id).length;
  const safeSpendCount = agents.filter(a => a.safe_spend_escrow_id).length;
  
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-[#01696F]" />
        <h3 className="text-[14px] font-semibold text-white">Ecosystem Integration</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-sm">
          <span className="text-[12px] text-[#9CA3AF]">Organization</span>
          <code className="text-[11px] text-white font-mono bg-white/[0.06] px-2 py-0.5 rounded">
            {orgId}
          </code>
        </div>
        
        {aavCount > 0 && (
          <div className="flex items-center justify-between p-3 bg-[#1E3A5F]/20 rounded-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span className="text-[12px] text-[#60A5FA]">AAV Certificates</span>
            </div>
            <span className="text-[12px] font-medium text-white">{aavCount} agent{aavCount !== 1 ? 's' : ''}</span>
          </div>
        )}
        
        {safeSpendCount > 0 && (
          <div className="flex items-center justify-between p-3 bg-[#134E4A]/20 rounded-sm">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span className="text-[12px] text-[#5EEAD4]">Safe-Spend Accounts</span>
            </div>
            <span className="text-[12px] font-medium text-white">{safeSpendCount} agent{safeSpendCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Organization link form for Settings
export function OrganizationLinkForm({ user, onLink }) {
  const [linkToken, setLinkToken] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!linkToken.trim()) {
      setError("Please enter a link token");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await onLink(linkToken.trim());
      setLinkToken("");
    } catch (err) {
      setError(err.message || "Failed to link organization");
    } finally {
      setLoading(false);
    }
  };
  
  if (user?.organization_id) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[#01696F]" />
          <h3 className="text-[14px] font-semibold text-white">Organization</h3>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-sm">
          <div>
            <span className="text-[11px] text-[#6B7280] block">Linked to</span>
            <code className="text-[12px] text-white font-mono">{user.organization_id}</code>
          </div>
          <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">
            Connected
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-[#01696F]" />
        <h3 className="text-[14px] font-semibold text-white">Organization</h3>
      </div>
      
      <p className="text-[12px] text-[#9CA3AF] mb-4">
        Link your account to an AgenticTrust organization to enable cross-tool integrations.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[11px] text-[#6B7280] block mb-1">Link Token</label>
          <input
            type="text"
            value={linkToken}
            onChange={(e) => setLinkToken(e.target.value)}
            placeholder="lnk_..."
            className="w-full px-3 py-2 text-[13px] bg-[#1A1F26] border border-white/[0.08] rounded-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#01696F]"
          />
          {error && (
            <p className="text-[11px] text-red-400 mt-1">{error}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-[13px] font-medium bg-[#01696F] hover:bg-[#028C94] text-white rounded-sm disabled:opacity-50 transition-colors"
        >
          {loading ? "Linking..." : "Link Organization"}
        </button>
      </form>
      
      <p className="text-[10px] text-[#6B7280] mt-3">
        Get your link token from{" "}
        <a 
          href="https://agentictrust.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#01696F] hover:underline"
        >
          Agent Authority Vault
        </a>
      </p>
    </div>
  );
}

export default {
  OutcomeSourceBadge,
  OutcomeSourcesChart,
  CrossToolStatus,
  EcosystemIntegrationCard,
  OrganizationLinkForm,
};
