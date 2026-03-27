import { Bot, Zap, RefreshCw, Sparkles } from "lucide-react";

export function UsageStatsSection({ usageStats }) {
  if (!usageStats) return null;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="usage-overview">
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-[#01696F]" />
          <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Agents</span>
        </div>
        <p className="text-2xl font-semibold text-white" data-testid="stat-total-agents">
          {usageStats.total_agents}
        </p>
      </div>
      
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#01696F]" />
          <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Total Outcomes</span>
        </div>
        <p className="text-2xl font-semibold text-white" data-testid="stat-total-outcomes">
          {usageStats.total_outcomes}
        </p>
      </div>
      
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-4 h-4 text-[#01696F]" />
          <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Last 7 Days</span>
        </div>
        <p className="text-2xl font-semibold text-white" data-testid="stat-outcomes-7d">
          {usageStats.outcomes_last_7_days}
        </p>
      </div>
      
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#01696F]" />
          <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Avg. Score</span>
        </div>
        <p className={`text-2xl font-semibold ${usageStats.avg_score > 0 ? "text-white" : "text-[#6B7280]"}`} data-testid="stat-avg-score">
          {usageStats.avg_score > 0 ? usageStats.avg_score : "—"}
        </p>
        <p className="text-[10px] text-[#6B7280] mt-0.5">Agents with 5+ outcomes</p>
      </div>
    </section>
  );
}
