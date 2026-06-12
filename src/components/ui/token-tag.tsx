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
        "inline-flex max-w-full items-center rounded-md border border-white/[0.12] bg-white/[0.045] px-2 py-0.5 font-mono text-[11px] text-neural-text-code",
        className
      )}
    >
      {children}
    </span>
  );
}
