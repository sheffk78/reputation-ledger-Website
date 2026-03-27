import { Sparkles } from "lucide-react";
import { changelog } from "../../data/changelog";

export function WhatsNewSection() {
  return (
    <section className="card-surface p-5" data-testid="whats-new-panel">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#01696F]" />
        <h2 className="text-[14px] font-semibold text-white">What's New</h2>
      </div>
      <div className="space-y-3">
        {changelog.slice(0, 5).map((item, index) => (
          <div key={index} className="flex gap-3 text-[12px]">
            <span className="text-[#6B7280] font-mono whitespace-nowrap">
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div>
              <span className="text-white">{item.title}</span>
              {item.description && (
                <span className="text-[#6B7280]"> — {item.description}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
