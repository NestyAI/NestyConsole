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
  success: "border-neural-green/25 bg-neural-green/10 text-neural-green",
  warning: "border-neural-amber/25 bg-neural-amber/10 text-neural-amber",
  error: "border-neural-red/25 bg-neural-red/10 text-rose-200",
  inactive: "border-white/10 bg-neural-elevated/80 text-neural-text-secondary",
  ai: "border-neural-violet/25 bg-neural-violet/10 text-violet-200",
  live: "border-neural-cyan/25 bg-neural-cyan/10 text-neural-cyan"
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
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {withDot ? <StatusDot tone={DOT_TONE[variant]} /> : null}
      {children}
    </span>
  );
}
