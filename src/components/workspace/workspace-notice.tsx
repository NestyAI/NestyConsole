import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type WorkspaceNoticeProps = {
  children: ReactNode;
  tone?: "amber" | "cyan" | "success";
  className?: string;
};

const TONE_CLASSES: Record<NonNullable<WorkspaceNoticeProps["tone"]>, string> = {
  amber: "border-neural-amber/20 bg-neural-amber/5 text-neural-amber",
  cyan: "border-neural-cyan/25 bg-neural-cyan/10 text-neural-cyan",
  success: "border-neural-green/25 bg-neural-green/10 text-neural-green"
};

export function WorkspaceNotice({ children, tone = "amber", className = "" }: WorkspaceNoticeProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border p-3 text-sm ${TONE_CLASSES[tone]} ${className}`}
      role={tone === "cyan" || tone === "success" ? "status" : undefined}
    >
      {tone === "amber" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </div>
  );
}
