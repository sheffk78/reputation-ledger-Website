import React from "react";
import { getTierColorClass } from "../lib/utils";

export function TierBadge({ tier, size = "default" }) {
  const sizeClasses = {
    small: "px-2 py-0.5 text-[10px]",
    default: "px-3 py-1 text-xs",
    large: "px-4 py-1.5 text-sm",
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
