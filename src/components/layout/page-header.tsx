import type { ReactNode } from "react";

import { PAGE_HEADER_DESC_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("glass-accent titanium-edge flex flex-col gap-5 rounded-3xl p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{title}</h1>
        {description ? <p className={PAGE_HEADER_DESC_CLASS}>{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
