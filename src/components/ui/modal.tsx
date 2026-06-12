"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { useAnimatedPresence } from "@/hooks/use-animated-presence";
import { useGSAP } from "@/lib/motion/gsap-client";
import { MOTION } from "@/lib/motion/gsap-utils";
import { canAnimate } from "@/lib/motion/reduced-motion";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap-client";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl"
} as const;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  initialFocusRef
}: ModalProps) {
  const { mounted, phase, completeExit } = useAnimatedPresence(open);
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const content = dialogRef.current?.querySelector<HTMLElement>("[data-modal-body]");
      const target =
        initialFocusRef?.current ||
        content?.querySelector<HTMLElement>(FOCUSABLE) ||
        dialogRef.current;
      target?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [mounted, initialFocusRef]);

  useGSAP(
    () => {
      if (!mounted || !overlayRef.current || !dialogRef.current) {
        return;
      }
      if (!canAnimate()) {
        if (phase === "closing") {
          completeExit();
        }
        return;
      }
      ensureGsapRegistered();
      if (phase === "open") {
        gsap.fromTo(overlayRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: MOTION.durations.overlayIn });
        gsap.fromTo(
          dialogRef.current,
          { autoAlpha: 0, y: 12, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: MOTION.durations.overlayIn, ease: MOTION.eases.enter }
        );
      } else if (phase === "closing") {
        gsap.to(overlayRef.current, { autoAlpha: 0, duration: MOTION.durations.overlayOut });
        gsap.to(dialogRef.current, {
          autoAlpha: 0,
          y: 8,
          scale: 0.985,
          duration: MOTION.durations.overlayOut,
          ease: MOTION.eases.exit,
          onComplete: completeExit
        });
      }
    },
    { scope: rootRef, dependencies: [mounted, phase], revertOnUpdate: true }
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-6">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-neural-void/75"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) {
            onClose();
          }
        }}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "glass-overlay titanium-edge neural-scroll relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-3xl",
          SIZE_CLASS[size]
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-neural-text-primary">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-neural-text-secondary">{description}</p> : null}
          </div>
          <IconButton aria-label="Close dialog" onClick={onClose} className="shrink-0">
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </header>
        <div data-modal-body className="px-5 py-5 sm:px-6">{children}</div>
        {footer ? <footer className="border-t border-white/[0.08] px-5 py-4 sm:px-6">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
