"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { useGSAP } from "@/lib/motion/gsap-client";
import { fadeInUp } from "@/lib/motion/gsap-utils";
import { cn } from "@/lib/utils";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function MotionSection({ children, className, disabled = false }: MotionSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!disabled) {
        fadeInUp(ref.current);
      }
    },
    { scope: ref, dependencies: [disabled], revertOnUpdate: true }
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
