import type { ReactNode } from "react";

type StateCardProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function StateCard({ title, subtitle, children, className = "" }: StateCardProps) {
  return (
    <article className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}
