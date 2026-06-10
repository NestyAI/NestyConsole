import type { InputHTMLAttributes } from "react";

import { INPUT_CLASS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(INPUT_CLASS, className)} {...props} />;
}
