import type { WorkspaceColor } from "@/lib/workspaces/workspaces";
import { WORKSPACE_COLOR_BAR_CLASSES } from "@/lib/workspaces/ui-tokens";

type WorkspaceColorBarProps = {
  color?: WorkspaceColor;
  className?: string;
};

export function WorkspaceColorBar({ color, className = "" }: WorkspaceColorBarProps) {
  const barClass = WORKSPACE_COLOR_BAR_CLASSES[color || "cyan"] || WORKSPACE_COLOR_BAR_CLASSES.cyan;
  return <div className={`absolute left-0 top-0 bottom-0 w-1 ${barClass} ${className}`} aria-hidden="true" />;
}
