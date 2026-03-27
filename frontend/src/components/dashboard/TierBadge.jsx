import { getTierColorClass } from "../../lib/utils";

export function TierBadge({ tier, size = "default" }) {
  const sizeClasses = {
    small: "px-2 py-0.5 text-[9px]",
    default: "px-2.5 py-1 text-[10px]",
    large: "px-3 py-1.5 text-[11px]",
  };

  return (
    <span 
      className={`tier-badge ${getTierColorClass(tier)} ${sizeClasses[size]}`}
      data-testid={`tier-badge-${tier.toLowerCase()}`}
    >
      {tier}
    </span>
  );
}
