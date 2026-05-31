import { cn } from "@/lib/utils";

type StatusCardProps = {
  label: string;
  value: string;
  healthy?: boolean;
  details?: string;
};

export function StatusCard({ label, value, healthy = false, details }: StatusCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm text-slate-300">{label}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            healthy ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"
          )}
        >
          {healthy ? "healthy" : "issue"}
        </span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      {details ? <p className="mt-2 text-xs text-slate-400">{details}</p> : null}
    </article>
  );
}
