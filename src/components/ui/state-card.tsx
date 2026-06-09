import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

type StateCardProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  accent?: "cyan" | "amber" | "green" | "violet" | "red";
};

export function StateCard({ title, subtitle, children, className = "", accent }: StateCardProps) {
  return (
    <Panel className={className} accent={accent}>
      <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{subtitle}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Panel>
  );
}
