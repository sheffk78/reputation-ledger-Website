import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format datetime for display
export function formatDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get tier color class
export function getTierColorClass(tier) {
  const classes = {
    Unrated: "tier-unrated",
    Bronze: "tier-bronze",
    Silver: "tier-silver",
    Gold: "tier-gold",
    Platinum: "tier-platinum",
  };
  return classes[tier] || classes.Unrated;
}

// Get result color class
export function getResultColorClass(result) {
  const classes = {
    success: "text-[#22C55E]",
    failure: "text-[#EF4444]",
    partial: "text-[#F97316]",
    timeout: "text-[#9CA3AF]",
  };
  return classes[result] || "text-[#9CA3AF]";
}

// Copy text to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}
