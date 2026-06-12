"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { useGSAP } from "@/lib/motion/gsap-client";
import { MAX_STAGGER_ITEMS, staggerChildren } from "@/lib/motion/gsap-utils";
import { cn } from "@/lib/utils";

type MotionListProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  maxItems?: number;
};

export function MotionList({ children, className, disabled = false, maxItems = MAX_STAGGER_ITEMS }: MotionListProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!disabled) {
        staggerChildren(":scope > *", { scope: ref.current, max: Math.min(maxItems, MAX_STAGGER_ITEMS) });
      }
    },
    { scope: ref, dependencies: [disabled, maxItems], revertOnUpdate: true }
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
