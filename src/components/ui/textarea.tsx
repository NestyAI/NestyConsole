import type { TextareaHTMLAttributes } from "react";

import { TEXTAREA_CLASS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(TEXTAREA_CLASS, className)} {...props} />;
}
