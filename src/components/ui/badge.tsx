import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/status-dot";

type BadgeVariant = "success" | "warning" | "error" | "inactive" | "ai" | "live";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  withDot?: boolean;
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  success: "border-neural-green/35 bg-neural-green/12 text-neural-green",
  warning: "border-neural-amber/35 bg-neural-amber/12 text-neural-amber",
  error: "border-neural-red/35 bg-neural-red/12 text-neural-red",
  inactive: "border-neural-text-muted/35 bg-neural-overlay/40 text-neural-text-secondary",
  ai: "border-neural-violet/35 bg-neural-violet/14 text-violet-200",
  live: "border-neural-cyan/40 bg-neural-cyan/14 text-neural-cyan"
};

const DOT_TONE: Record<BadgeVariant, "success" | "warning" | "error" | "neutral" | "live" | "ai"> = {
  success: "success",
  warning: "warning",
  error: "error",
  inactive: "neutral",
  ai: "ai",
  live: "live"
};

export function Badge({ children, variant = "inactive", className, withDot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.04em]",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {withDot ? <StatusDot tone={DOT_TONE[variant]} /> : null}
      {children}
    </span>
  );
}
