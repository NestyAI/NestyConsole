"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { useGSAP } from "@/lib/motion/gsap-client";
import { canAnimate } from "@/lib/motion/reduced-motion";
import { MAX_STAGGER_ITEMS, MOTION } from "@/lib/motion/gsap-utils";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap-client";
import { cn } from "@/lib/utils";

type MotionPageProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  stagger?: number;
};

export function MotionPage({ children, className, disabled = false, stagger = MOTION.stagger }: MotionPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || disabled || !canAnimate()) {
        return;
      }
      ensureGsapRegistered();
      const items = Array.from(root.children).slice(0, MAX_STAGGER_ITEMS);
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: MOTION.durations.page,
          stagger,
          ease: MOTION.eases.enter,
          clearProps: "transform,opacity,visibility"
        }
      );
    },
    { scope: rootRef, dependencies: [disabled, stagger], revertOnUpdate: true }
  );

  return (
    <div ref={rootRef} className={cn("space-y-6 lg:space-y-8", className)}>
      {children}
    </div>
  );
}
