import type { WorkspaceColor } from "@/lib/workspaces/workspaces";

export type WorkspaceBadgeVariant = "live" | "ai" | "success" | "warning" | "error" | "inactive";

export type WorkspacePanelAccent = "cyan" | "violet" | "green" | "amber" | "red";

export const WORKSPACE_BADGE_VARIANTS: Record<WorkspaceColor, WorkspaceBadgeVariant> = {
  cyan: "live",
  violet: "ai",
  green: "success",
  amber: "warning",
  red: "error",
  neutral: "inactive"
};

export const WORKSPACE_BANNER_CLASSES: Record<WorkspaceColor, string> = {
  cyan: "border-neural-cyan/25 bg-neural-cyan/10",
  violet: "border-neural-violet/25 bg-neural-violet/10",
  green: "border-neural-green/25 bg-neural-green/10",
  amber: "border-neural-amber/25 bg-neural-amber/10",
  red: "border-neural-red/25 bg-neural-red/10",
  neutral: "border-white/10 bg-white/[0.03]"
};

export const WORKSPACE_COLOR_BAR_CLASSES: Record<WorkspaceColor, string> = {
  cyan: "bg-neural-cyan",
  violet: "bg-neural-violet",
  green: "bg-neural-green",
  amber: "bg-neural-amber",
  red: "bg-neural-red",
  neutral: "bg-neural-text-muted"
};

export const PANEL_ACCENTS: Record<WorkspaceColor, WorkspacePanelAccent> = {
  cyan: "cyan",
  violet: "violet",
  green: "green",
  amber: "amber",
  red: "red",
  neutral: "cyan"
};

export function workspaceBadgeVariant(color?: WorkspaceColor): WorkspaceBadgeVariant {
  return WORKSPACE_BADGE_VARIANTS[color || "cyan"] || "live";
}

export function workspaceListCardClass(selected: boolean): string {
  return selected
    ? "border-neural-cyan/50 bg-neural-cyan/[0.06] shadow-neural-glow ring-1 ring-neural-cyan/20"
    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]";
}

export const WORKSPACE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neural-void";
