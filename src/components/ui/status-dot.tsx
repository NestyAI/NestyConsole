import { cn } from "@/lib/utils";

type StatusDotProps = {
  tone?: "success" | "warning" | "error" | "neutral" | "live" | "ai";
  className?: string;
};

const TONE_CLASS: Record<NonNullable<StatusDotProps["tone"]>, string> = {
  success: "bg-neural-green",
  warning: "bg-neural-amber",
  error: "bg-neural-red",
  neutral: "bg-neural-text-muted",
  live: "bg-neural-cyan animate-status-pulse",
  ai: "bg-neural-violet"
};

export function StatusDot({ tone = "neutral", className }: StatusDotProps) {
  return <span className={cn("inline-flex size-2.5 rounded-full ring-2 ring-current/10", TONE_CLASS[tone], className)} aria-hidden="true" />;
}
