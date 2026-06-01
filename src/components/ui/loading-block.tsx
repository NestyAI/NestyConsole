import { Loader2 } from "lucide-react";

type LoadingBlockProps = {
  label?: string;
  className?: string;
};

export function LoadingBlock({ label = "Loading...", className = "" }: LoadingBlockProps) {
  return (
    <div
      className={`neural-panel flex items-center gap-2 rounded-xl p-4 text-sm text-neural-text-secondary ${className}`}
    >
      <Loader2 className="h-4 w-4 animate-spin text-neural-cyan" />
      <span>{label}</span>
    </div>
  );
}
