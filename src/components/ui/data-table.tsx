import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn("neural-panel neural-scroll overflow-x-auto rounded-xl", className)}>{children}</div>
  );
}
