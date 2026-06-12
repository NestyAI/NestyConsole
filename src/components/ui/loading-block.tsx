import { Loader2 } from "lucide-react";

type LoadingBlockProps = {
  label?: string;
  className?: string;
};

export function LoadingBlock({ label = "Loading...", className = "" }: LoadingBlockProps) {
  return (
    <div
      className={`glass-base flex items-center gap-3 rounded-2xl p-4 text-sm text-neural-text-secondary ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="flex size-9 items-center justify-center rounded-xl border border-neural-cyan/20 bg-neural-cyan/[0.07]">
        <Loader2 className="size-4 animate-spin text-neural-cyan" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </div>
  );
}
