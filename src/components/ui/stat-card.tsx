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
    <Panel accent={accent}>
      <p className="font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-secondary">{label}</p>
      <p className="mt-2 font-mono text-2xl text-neural-text-primary">{value}</p>
      {hint ? <p className="mt-2 text-xs text-neural-text-secondary">{hint}</p> : null}
    </Panel>
  );
}
