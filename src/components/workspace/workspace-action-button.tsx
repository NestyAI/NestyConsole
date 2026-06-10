import type { ReactNode } from "react";

import { WORKSPACE_FOCUS_RING } from "@/lib/workspaces/ui-tokens";

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
  default:
    "border-white/10 bg-white/[0.04] text-neural-text-secondary hover:border-neural-cyan/35 hover:text-neural-cyan",
  cyan: "border-neural-cyan/35 bg-neural-cyan/10 text-neural-cyan hover:border-neural-cyan/50 hover:bg-neural-cyan/15",
  icon: "border-transparent bg-transparent text-neural-text-muted hover:text-neural-cyan p-1"
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
      ? "inline-flex items-center justify-center rounded-lg transition-colors duration-200 active:scale-[0.98]"
      : "inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-display text-[9px] uppercase tracking-[0.08em] transition-colors duration-200 active:scale-[0.98]";

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      className={`${base} ${VARIANT_CLASSES[variant]} ${WORKSPACE_FOCUS_RING} ${className}`}
    >
      {children}
    </button>
  );
}
