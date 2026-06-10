import type { ReactNode, SelectHTMLAttributes } from "react";

import { SELECT_CLASS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  className?: string;
};

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <select className={cn(SELECT_CLASS, className)} {...props}>
      {children}
    </select>
  );
}
