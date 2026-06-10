import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceColor } from "@/lib/workspaces/workspaces";
import { workspaceBadgeVariant } from "@/lib/workspaces/ui-tokens";

type WorkspaceBadgeProps = {
  color?: WorkspaceColor;
  children: ReactNode;
  className?: string;
};

export function WorkspaceBadge({ color, children, className }: WorkspaceBadgeProps) {
  return (
    <Badge variant={workspaceBadgeVariant(color)} className={className}>
      {children}
    </Badge>
  );
}
