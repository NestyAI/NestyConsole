import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "amber" | "green" | "violet" | "red";
};

const ACCENT_CLASS: Record<NonNullable<PanelProps["accent"]>, string> = {
  cyan: "before:bg-neural-cyan/80",
  amber: "before:bg-neural-amber/80",
  green: "before:bg-neural-green/80",
  violet: "before:bg-neural-violet/80",
  red: "before:bg-neural-red/80"
};

export function Panel({ children, className, accent }: PanelProps) {
  return (
    <article
      className={cn(
        "neural-panel relative overflow-hidden rounded-2xl p-4 text-neural-text-primary animate-fade-in-up",
        accent ? "before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:content-['']" : "",
        accent ? ACCENT_CLASS[accent] : "",
        className
      )}
    >
      {children}
    </article>
  );
}
