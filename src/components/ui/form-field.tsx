import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SECTION_LABEL_CLASS } from "@/lib/design/tokens";

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, hint, children, className }: FormFieldProps) {
  return (
    <label htmlFor={htmlFor} className={cn("block space-y-1.5", className)}>
      <span className={SECTION_LABEL_CLASS}>{label}</span>
      {children}
      {hint ? <span className="text-xs text-neural-text-muted">{hint}</span> : null}
    </label>
  );
}
