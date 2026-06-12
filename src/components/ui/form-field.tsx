import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SECTION_LABEL_CLASS } from "@/lib/design/tokens";

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, hint, error, required, children, className }: FormFieldProps) {
  return (
    <label htmlFor={htmlFor} className={cn("block space-y-2", className)}>
      <span className={SECTION_LABEL_CLASS}>
        {label}
        {required ? <span className="ml-1 text-neural-red" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-neural-text-muted">{hint}</span> : null}
      {error ? <span className="block text-xs leading-5 text-rose-200">{error}</span> : null}
    </label>
  );
}
