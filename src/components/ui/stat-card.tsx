import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "cyan" | "amber" | "green" | "violet" | "red";
};

export function StatCard({ label, value, hint, accent = "cyan" }: StatCardProps) {
  return (
    <Panel accent={accent} className="min-h-[144px]">
      <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neural-text-primary">{value}</p>
      {hint ? <p className="mt-3 text-sm leading-relaxed text-neural-text-secondary">{hint}</p> : null}
    </Panel>
  );
}
