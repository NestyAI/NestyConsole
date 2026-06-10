import type { ReactNode } from "react";

import { BUTTON_VARIANTS } from "@/lib/design/tokens";
import { WORKSPACE_FOCUS_RING } from "@/lib/workspaces/ui-tokens";
import { cn } from "@/lib/utils";

type WorkspaceActionButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  title: string;
  ariaLabel?: string;
  variant?: "default" | "cyan" | "icon";
  className?: string;
};

const VARIANT_CLASSES: Record<NonNullable<WorkspaceActionButtonProps["variant"]>, string> = {
  default: "border-white/10 bg-neural-elevated/60 text-neural-text-secondary hover:border-white/20 hover:text-neural-text-primary text-xs px-2 py-1",
  cyan: "border-neural-cyan/25 bg-neural-cyan/10 text-neural-cyan hover:border-neural-cyan/40 text-xs px-2 py-1",
  icon: BUTTON_VARIANTS.icon
};

export function WorkspaceActionButton({
  children,
  onClick,
  type = "button",
  title,
  ariaLabel,
  variant = "default",
  className = ""
}: WorkspaceActionButtonProps) {
  const base =
    variant === "icon"
      ? "inline-flex items-center justify-center rounded-lg transition-colors duration-200"
      : "inline-flex items-center gap-1 rounded-lg border font-medium transition-colors duration-200";

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      className={cn(base, VARIANT_CLASSES[variant], WORKSPACE_FOCUS_RING, className)}
    >
      {children}
    </button>
  );
}
