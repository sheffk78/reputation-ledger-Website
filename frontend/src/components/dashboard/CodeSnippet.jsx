import { Check, Copy } from "lucide-react";

export function CodeSnippet({ code, onCopy, copiedId, snippetId }) {
  const isCopied = copiedId === snippetId;
  
  return (
    <div className="relative group">
      <pre className="bg-[#050709] border border-white/[0.06] rounded-sm p-3 overflow-x-auto text-[12px] font-mono text-[#E5E7EB] leading-relaxed whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(snippetId)}
        className="absolute top-2 right-2 p-1.5 rounded-sm bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
        data-testid={`copy-snippet-${snippetId}`}
      >
        {isCopied ? (
          <Check className="w-3 h-3 text-[#22C55E]" />
        ) : (
          <Copy className="w-3 h-3 text-[#9CA3AF]" />
        )}
      </button>
    </div>
  );
}
