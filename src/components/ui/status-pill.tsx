import type { ReactNode } from "react";

import { Badge, type BadgeVariant } from "@/components/ui/badge";

type StatusPillProps = {
  children: ReactNode;
  tone?: BadgeVariant;
  className?: string;
};

export function StatusPill({ children, tone = "inactive", className }: StatusPillProps) {
  return (
    <Badge variant={tone} withDot className={className}>
      {children}
    </Badge>
  );
}
