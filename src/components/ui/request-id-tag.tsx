"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { TokenTag } from "@/components/ui/token-tag";
import { sanitizeRequestId } from "@/lib/gateway/provider-error-parsers";

type RequestIdTagProps = {
  requestId: string | undefined | null;
  className?: string;
  showLogHint?: boolean;
};

export function RequestIdTag({ requestId, className, showLogHint = false }: RequestIdTagProps) {
  const [copied, setCopied] = useState(false);
  const safeId = sanitizeRequestId(requestId);
  if (!safeId) {
    return null;
  }

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(safeId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — display-only fallback.
    }
  };

  return (
    <div className={`mt-2 text-xs text-neural-text-secondary ${className || ""}`.trim()}>
      <p className="inline-flex flex-wrap items-center gap-2">
        <span>Request ID:</span>
        <TokenTag>{safeId}</TokenTag>
        {typeof navigator !== "undefined" && "clipboard" in navigator ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-secondary hover:border-neural-cyan/35 hover:text-neural-cyan"
            aria-label="Copy request ID"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </p>
      {showLogHint ? (
        <p className="mt-1 text-[11px] text-neural-text-muted">
          Use this Request ID to correlate Gateway logs.
        </p>
      ) : null}
    </div>
  );
}
