import { Loader2 } from "lucide-react";

type LoadingBlockProps = {
  label?: string;
  className?: string;
};

export function LoadingBlock({ label = "Loading...", className = "" }: LoadingBlockProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 ${className}`}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
