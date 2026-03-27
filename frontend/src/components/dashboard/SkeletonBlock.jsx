import { AlertCircle } from "lucide-react";

export function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1" role="alert">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse bg-white/[0.06] rounded-sm ${className}`} />
  );
}
