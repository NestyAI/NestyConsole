import type { ButtonHTMLAttributes, ReactNode } from "react";

import { BUTTON_VARIANTS, type ButtonVariant } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

export function Button({ children, variant = "secondary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(BUTTON_VARIANTS[variant], className)} {...props}>
      {children}
    </button>
  );
}
