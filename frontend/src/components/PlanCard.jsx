import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { billingAPI } from "../lib/api";
import { CreditCard, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PlanCard() {
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPlanInfo();
  }, []);

  const loadPlanInfo = async () => {
    try {
      const data = await billingAPI.getPlan();
      setPlanInfo(data);
    } catch (err) {
      console.error("Failed to load plan info:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading(true);
    try {
      const { portal_url } = await billingAPI.createPortalSession();
      window.location.href = portal_url;
    } catch (err) {
      toast.error("Failed to open billing portal");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card-surface p-4 animate-pulse">
        <div className="h-4 bg-white/[0.06] rounded w-1/3 mb-3" />
        <div className="h-8 bg-white/[0.06] rounded w-1/2 mb-4" />
        <div className="h-2 bg-white/[0.04] rounded w-full" />
      </div>
    );
  }

  if (!planInfo) return null;

  const isFreePlan = planInfo.plan === "free";
  const agentPercent = planInfo.max_agents 
    ? Math.min(100, (planInfo.agents_used / planInfo.max_agents) * 100)
    : 0;
  const outcomePercent = planInfo.max_outcomes_per_month
    ? Math.min(100, (planInfo.outcomes_this_month / planInfo.max_outcomes_per_month) * 100)
    : 0;

  return (
    <div className="card-surface overflow-hidden" data-testid="plan-card">
      {/* Payment Past Due Banner */}
      {planInfo.payment_past_due && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">
            Payment failed.{" "}
            <button
              onClick={handleManageBilling}
              className="underline hover:text-red-300"
            >
              Update payment →
            </button>
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#01696F]" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Plan</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            planInfo.plan === "platform" 
              ? "bg-[#01696F]/20 text-[#01696F]"
              : planInfo.plan === "builder"
                ? "bg-blue-500/20 text-blue-400"
                : planInfo.plan === "enterprise"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-gray-500/20 text-gray-400"
          }`}>
            {planInfo.label}
          </span>
        </div>

        {/* Usage bars */}
        <div className="space-y-3 mb-4">
          {/* Agents */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Agents</span>
              <span className="text-gray-500">
                {planInfo.agents_used}
                {planInfo.max_agents ? ` / ${planInfo.max_agents}` : " (unlimited)"}
              </span>
            </div>
            {planInfo.max_agents && (
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    agentPercent >= 90 ? "bg-red-500" : 
                    agentPercent >= 70 ? "bg-amber-500" : "bg-[#01696F]"
                  }`}
                  style={{ width: `${agentPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Outcomes this month */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Outcomes this month</span>
              <span className="text-gray-500">
                {planInfo.outcomes_this_month.toLocaleString()}
                {planInfo.max_outcomes_per_month 
                  ? ` / ${planInfo.max_outcomes_per_month.toLocaleString()}`
                  : " (unlimited)"}
              </span>
            </div>
            {planInfo.max_outcomes_per_month && (
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    outcomePercent >= 90 ? "bg-red-500" : 
                    outcomePercent >= 70 ? "bg-amber-500" : "bg-[#01696F]"
                  }`}
                  style={{ width: `${outcomePercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isFreePlan ? (
            <Link
              to="/pricing"
              className="flex-1 text-center py-2 text-sm bg-[#01696F] hover:bg-[#015858] text-white rounded-sm transition-colors"
              data-testid="upgrade-btn"
            >
              Upgrade
            </Link>
          ) : (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm bg-white/5 hover:bg-white/10 text-gray-300 rounded-sm transition-colors disabled:opacity-50"
              data-testid="manage-billing-btn"
            >
              {actionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              Manage Billing
            </button>
          )}
        </div>

        {/* Subscription info */}
        {planInfo.current_period_end && planInfo.subscription_status === "active" && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            Renews {new Date(planInfo.current_period_end).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  );
}
