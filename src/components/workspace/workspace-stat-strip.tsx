import type { ReactNode } from "react";

type WorkspaceStatStripProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceStatStrip({ children, className = "" }: WorkspaceStatStripProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 font-mono text-[10px] text-neural-text-muted ${className}`}
    >
      {children}
    </div>
  );
}

type WorkspaceStatItemProps = {
  icon?: ReactNode;
  children: ReactNode;
};

export function WorkspaceStatItem({ icon, children }: WorkspaceStatItemProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {children}
    </span>
  );
}
