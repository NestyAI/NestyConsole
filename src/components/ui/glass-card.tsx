import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export function GlassCard({ children, className, interactive = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-raised titanium-edge rounded-2xl p-4 sm:p-5",
        interactive ? "surface-hover" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
