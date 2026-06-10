"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { useGSAP } from "@/lib/motion/gsap-client";
import { pulseGlow, staggerChildren } from "@/lib/motion/gsap-utils";
import { canAnimate } from "@/lib/motion/reduced-motion";

type WorkspaceListMotionProps = {
  workspaceCount: number;
  selectedId: string;
  children: ReactNode;
};

export function WorkspaceListMotion({ workspaceCount, selectedId, children }: WorkspaceListMotionProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!listRef.current || !canAnimate()) {
        return;
      }
      staggerChildren("> button", { scope: listRef.current });
    },
    { scope: listRef, dependencies: [workspaceCount], revertOnUpdate: true }
  );

  useGSAP(
    () => {
      if (!listRef.current || !selectedId || !canAnimate()) {
        return;
      }
      pulseGlow('button[aria-pressed="true"]', { scope: listRef.current });
    },
    { scope: listRef, dependencies: [selectedId], revertOnUpdate: true }
  );

  return (
    <div ref={listRef} className="grid gap-3">
      {children}
    </div>
  );
}
