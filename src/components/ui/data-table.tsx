import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableProps = {
  children: ReactNode;
  className?: string;
  dense?: boolean;
  stickyHeader?: boolean;
};

export function DataTable({ children, className, dense = false, stickyHeader = false }: DataTableProps) {
  return (
    <div
      className={cn(
        "glass-base neural-scroll overflow-x-auto rounded-2xl [&_table]:w-full [&_tbody_tr]:border-t [&_tbody_tr]:border-white/[0.06] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-white/[0.025] [&_th]:text-left [&_th]:text-neural-text-secondary",
        dense ? "[&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5" : "[&_td]:px-4 [&_td]:py-3.5 [&_th]:px-4 [&_th]:py-3",
        stickyHeader ? "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-neural-shell/95" : "",
        className
      )}
    >
      {children}
    </div>
  );
}
