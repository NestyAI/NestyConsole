import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "cyan" | "amber" | "green" | "violet" | "red";
};

export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <Panel accent={accent} className="min-h-[128px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neural-text-secondary">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-neural-text-primary">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{hint}</p> : null}
    </Panel>
  );
}
