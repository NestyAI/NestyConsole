import { FOCUS_RING } from "@/lib/design/tokens";
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
  cyan: "border-neural-cyan/20 bg-neural-cyan/[0.06]",
  violet: "border-neural-violet/20 bg-neural-violet/[0.06]",
  green: "border-neural-green/20 bg-neural-green/[0.06]",
  amber: "border-neural-amber/20 bg-neural-amber/[0.06]",
  red: "border-neural-red/20 bg-neural-red/[0.06]",
  neutral: "border-white/10 bg-neural-elevated/60"
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
    ? "border-neural-cyan/35 bg-neural-cyan/[0.05] shadow-neural-glow"
    : "border-white/10 bg-neural-elevated/40 hover:border-white/18 hover:bg-neural-elevated/70";
}

export const WORKSPACE_FOCUS_RING = FOCUS_RING;
