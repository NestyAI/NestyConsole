import type { ButtonHTMLAttributes, ReactNode } from "react";

import { BUTTON_VARIANTS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  "aria-label": string;
  className?: string;
};

export function IconButton({ children, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button type={type} className={cn(BUTTON_VARIANTS.icon, className)} {...props}>
      {children}
    </button>
  );
}
