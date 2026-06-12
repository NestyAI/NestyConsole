import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, className, icon, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-base flex min-h-40 flex-col items-center justify-center rounded-2xl p-6 text-center text-sm text-neural-text-secondary",
        className
      )}
    >
      {icon ? (
        <span className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl border border-neural-cyan/20 bg-neural-cyan/[0.07] text-neural-cyan">
          {icon}
        </span>
      ) : null}
      <p className="font-semibold text-neural-text-primary">{title}</p>
      {description ? <p className="mt-2 max-w-lg text-pretty text-sm leading-6 text-neural-text-secondary">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
