import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SURFACE_CLASSES, type SurfaceTier } from "@/lib/design/tokens";

type PanelProps = {
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "amber" | "green" | "violet" | "red";
  tier?: SurfaceTier;
};

const ACCENT_CLASS: Record<NonNullable<PanelProps["accent"]>, string> = {
  cyan: "border-l-2 border-l-neural-cyan/50",
  amber: "border-l-2 border-l-neural-amber/50",
  green: "border-l-2 border-l-neural-green/50",
  violet: "border-l-2 border-l-neural-violet/50",
  red: "border-l-2 border-l-neural-red/50"
};

export function Panel({ children, className, accent, tier = "base" }: PanelProps) {
  return (
    <article
      className={cn(
        "titanium-edge relative overflow-hidden rounded-2xl p-4 text-neural-text-primary sm:p-5",
        SURFACE_CLASSES[tier],
        accent ? ACCENT_CLASS[accent] : "",
        className
      )}
    >
      {children}
    </article>
  );
}
