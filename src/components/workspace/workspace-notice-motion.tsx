"use client";

import { useRef } from "react";

import { useCanAnimate } from "@/hooks/use-reduced-motion";
import { useGSAP } from "@/lib/motion/gsap-client";
import { fadeIn } from "@/lib/motion/gsap-utils";

type WorkspaceNoticeMotionProps = {
  message: string;
  className?: string;
};

export function WorkspaceNoticeMotion({ message, className = "" }: WorkspaceNoticeMotionProps) {
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const canAnimateMotion = useCanAnimate();

  useGSAP(
    () => {
      if (!message || !noticeRef.current || !canAnimateMotion) {
        return;
      }
      fadeIn(noticeRef.current);
    },
    { scope: noticeRef, dependencies: [message], revertOnUpdate: true }
  );

  if (!message) {
    return null;
  }

  return (
    <p
      ref={noticeRef}
      className={`text-xs text-neural-cyan ${canAnimateMotion ? "" : "animate-fade-in-up"} ${className}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
