import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "cyan" | "amber" | "green" | "violet" | "red";
  icon?: ReactNode;
  trend?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, hint, accent, icon, trend, className }: StatCardProps) {
  return (
    <Panel tier="raised" accent={accent} className={`min-h-[132px] ${className || ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neural-text-secondary">{label}</p>
        {icon ? (
          <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-neural-cyan">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <p className="tabular-nums text-2xl font-semibold tracking-[-0.035em] text-neural-text-primary">{value}</p>
        {trend ? <div className="pb-0.5 text-xs text-neural-text-secondary">{trend}</div> : null}
      </div>
      {hint ? <p className="mt-2 text-pretty text-sm leading-6 text-neural-text-secondary">{hint}</p> : null}
    </Panel>
  );
}
