"use client";

import { canAnimate } from "@/lib/motion/reduced-motion";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap-client";

export const MAX_STAGGER_ITEMS = 8;

export const MOTION = {
  durations: {
    feedback: 0.18,
    element: 0.28,
    page: 0.38,
    overlayIn: 0.28,
    overlayOut: 0.2
  },
  eases: {
    enter: "power2.out",
    exit: "power2.in",
    emphasis: "back.out(1.4)"
  },
  stagger: 0.055
} as const;

type ScopeElement = HTMLElement | null | undefined;

function scopedTargets(targets: string, scope?: ScopeElement): Element[] {
  if (!scope) {
    return [];
  }
  return Array.from(scope.querySelectorAll(targets));
}

export function staggerChildren(
  selector: string,
  options?: { scope?: ScopeElement; max?: number; y?: number }
) {
  if (!canAnimate()) {
    return null;
  }
  ensureGsapRegistered();

  const elements = scopedTargets(selector, options?.scope).slice(0, options?.max ?? MAX_STAGGER_ITEMS);
  if (!elements.length) {
    return null;
  }

  return gsap.fromTo(
    elements,
    { autoAlpha: 0, y: options?.y ?? 10 },
    {
      autoAlpha: 1,
      y: 0,
      duration: MOTION.durations.element,
      stagger: MOTION.stagger,
      ease: MOTION.eases.enter,
      overwrite: "auto",
      clearProps: "transform,opacity,visibility"
    }
  );
}

export function fadeIn(target: Element | null | undefined) {
  if (!canAnimate() || !target) {
    return null;
  }
  ensureGsapRegistered();
  return gsap.fromTo(
    target,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: MOTION.durations.feedback,
      ease: MOTION.eases.enter,
      overwrite: "auto",
      clearProps: "opacity,visibility"
    }
  );
}

export function fadeInUp(target: Element | null | undefined) {
  if (!canAnimate() || !target) {
    return null;
  }
  ensureGsapRegistered();
  return gsap.fromTo(
    target,
    { autoAlpha: 0, y: 10 },
    {
      autoAlpha: 1,
      y: 0,
      duration: MOTION.durations.element,
      ease: MOTION.eases.enter,
      overwrite: "auto",
      clearProps: "transform,opacity,visibility"
    }
  );
}

export function pulseGlow(selector: string, options?: { scope?: ScopeElement }) {
  if (!canAnimate()) {
    return null;
  }
  ensureGsapRegistered();
  const element = scopedTargets(selector, options?.scope)[0];
  if (!element) {
    return null;
  }

  return gsap.fromTo(
    element,
    { scale: 0.985, opacity: 0.78 },
    {
      scale: 1,
      opacity: 1,
      duration: MOTION.durations.feedback,
      ease: MOTION.eases.emphasis,
      overwrite: "auto",
      clearProps: "transform,opacity"
    }
  );
}

export function flashNoteCard(noteId: string, scope?: ScopeElement): void {
  if (!scope) {
    return;
  }
  pulseGlow(`[data-note-id="${noteId}"]`, { scope });
}
