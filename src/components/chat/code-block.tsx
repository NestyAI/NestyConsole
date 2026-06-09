"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CodeBlockProps = {
  language?: string;
  value: string;
};

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy failures
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-neural-void/90 font-mono">
      {/* Top action/info bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] tracking-wide text-neural-text-secondary select-none">
        <span className="font-display font-semibold uppercase tracking-wider text-neural-cyan">
          {language || "text"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-neural-text-primary transition hover:bg-white/[0.08]"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-neural-green" />
              <span className="text-[9px] text-neural-green font-sans font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="font-sans font-medium">Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code container */}
      <pre className="neural-scroll overflow-x-auto p-4 text-[11px] leading-relaxed text-neural-text-primary">
        <code className="block select-text whitespace-pre">{value}</code>
      </pre>
    </div>
  );
}
