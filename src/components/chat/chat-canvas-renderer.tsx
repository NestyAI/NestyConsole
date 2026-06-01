"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TerminalBlock } from "@/components/ui/terminal-block";
import { CodeBlock } from "@/components/chat/code-block";

type ChatCanvasRendererProps = {
  content: string;
  mode?: "rendered" | "raw";
  messageId?: string;
};

export function ChatCanvasRenderer({ content, mode = "rendered" }: ChatCanvasRendererProps) {
  // If content is empty or only whitespace, show a subtle streaming/empty indicator
  if (!content || !content.trim()) {
    return (
      <div className="flex items-center gap-1.5 py-2 text-xs text-neural-text-muted select-none">
        <span className="h-1.5 w-1.5 animate-status-pulse rounded-full bg-neural-cyan" />
        <span>Awaiting data stream...</span>
      </div>
    );
  }

  // 1. Raw display mode
  if (mode === "raw") {
    return (
      <TerminalBlock className="w-full bg-neural-void/80 border border-neural-text-muted/15 max-h-[500px]">
        {content}
      </TerminalBlock>
    );
  }

  // 2. Rendered Markdown display mode
  return (
    <div className="prose prose-invert max-w-none text-sm select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks & inline code overrides
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]} value={codeContent} />;
            }
            if (codeContent.includes("\n")) {
              return <CodeBlock language="text" value={codeContent} />;
            }
            return (
              <code
                className="bg-neural-overlay/40 border border-neural-text-muted/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-neural-cyan"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Heading overrides using Chakra Petch styling
          h1({ children }) {
            return (
              <h1 className="mt-6 mb-3 font-display text-base font-bold uppercase tracking-[0.06em] text-neural-text-primary border-b border-neural-text-muted/10 pb-1.5 last:mb-0">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="mt-5 mb-2.5 font-display text-sm font-semibold uppercase tracking-[0.05em] text-neural-text-primary last:mb-0">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="mt-4 mb-2 font-display text-xs font-semibold uppercase tracking-[0.04em] text-neural-text-secondary last:mb-0">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="mt-3 mb-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.04em] text-neural-text-secondary last:mb-0">
                {children}
              </h4>
            );
          },

          // Paragraph styling
          p({ children }) {
            return <p className="mb-3.5 leading-relaxed text-neural-text-primary last:mb-0">{children}</p>;
          },

          // Lists styling
          ul({ children }) {
            return (
              <ul className="list-disc list-inside mb-4 pl-1.5 space-y-1 text-sm text-neural-text-secondary last:mb-0">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-inside mb-4 pl-1.5 space-y-1 text-sm text-neural-text-secondary last:mb-0">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="marker:text-neural-cyan/50 leading-relaxed">{children}</li>;
          },

          // Blockquote overrides
          blockquote({ children }) {
            return (
              <blockquote className="my-4 border-l-2 border-neural-amber/50 bg-neural-overlay/10 px-4 py-2 font-sans text-xs italic text-neural-text-secondary last:mb-0">
                {children}
              </blockquote>
            );
          },

          // Responsive safe tables overrides (Constraint 5)
          table({ children }) {
            return (
              <div className="my-4 w-full overflow-x-auto rounded-lg border border-neural-text-muted/15 bg-neural-overlay/5 neural-scroll">
                <table className="min-w-full divide-y divide-neural-text-muted/15 text-left text-xs">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-neural-overlay/30 text-neural-text-primary font-display font-medium uppercase tracking-wider">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return <th className="px-4 py-2.5 text-[10px] font-semibold border-b border-neural-text-muted/15">{children}</th>;
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 border-b border-neural-text-muted/10 text-neural-text-secondary whitespace-normal break-words leading-normal">
                {children}
              </td>
            );
          },

          // Link sanitisation overrides (Constraint 3)
          a({ href, children }) {
            const url = href || "";
            const isSafe = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:");

            if (isSafe) {
              return (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neural-cyan hover:underline transition"
                >
                  {children}
                </a>
              );
            }

            // Render non-safe/blocked links as plain text to prevent script injection (e.g. javascript:, data:)
            return (
              <span className="text-neural-text-muted border-b border-dotted border-neural-text-muted/40 cursor-help" title="Blocked relative/unsafe protocol link">
                {children}
              </span>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
