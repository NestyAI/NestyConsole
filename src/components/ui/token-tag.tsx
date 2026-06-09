import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TokenTagProps = {
  children: ReactNode;
  className?: string;
};

export function TokenTag({ children, className }: TokenTagProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border border-neural-text-muted/20 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-neural-text-code",
        className
      )}
    >
      {children}
    </span>
  );
}
