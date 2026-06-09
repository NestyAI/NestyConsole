import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TerminalBlockProps = {
  children: ReactNode;
  className?: string;
};

export function TerminalBlock({ children, className }: TerminalBlockProps) {
  return (
    <pre
      className={cn(
        "neural-terminal neural-scroll max-h-80 overflow-auto rounded-2xl p-4 font-mono text-[11px] leading-relaxed",
        className
      )}
    >
      {children}
    </pre>
  );
}
