import { Loader2 } from "lucide-react";

type LoadingBlockProps = {
  label?: string;
  className?: string;
};

export function LoadingBlock({ label = "Loading...", className = "" }: LoadingBlockProps) {
  return (
    <div
      className={`neural-panel flex items-center gap-3 rounded-xl p-4 text-sm text-neural-text-secondary ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-neural-elevated/80">
        <Loader2 className="h-4 w-4 animate-spin text-neural-cyan" />
      </span>
      <span>{label}</span>
    </div>
  );
}
