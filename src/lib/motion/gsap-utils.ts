"use client";

import { canAnimate } from "@/lib/motion/reduced-motion";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap-client";

export const MAX_STAGGER_ITEMS = 12;

type ScopeElement = HTMLElement | null | undefined;

function scopedTargets(targets: string, scope?: ScopeElement): Element[] {
  if (!scope) {
    return [];
  }
  return Array.from(scope.querySelectorAll(targets));
}

export function staggerChildren(
  selector: string,
  options?: { scope?: ScopeElement; max?: number }
) {
  if (!canAnimate()) {
    return null;
  }
  ensureGsapRegistered();

  const elements = scopedTargets(selector, options?.scope).slice(0, options?.max ?? MAX_STAGGER_ITEMS);
  if (!elements.length) {
    return null;
  }

  gsap.set(elements, { opacity: 0, y: 6 });
  return gsap.to(elements, {
    opacity: 1,
    y: 0,
    duration: 0.22,
    stagger: 0.04,
    ease: "power2.out",
    overwrite: "auto"
  });
}

export function fadeIn(target: Element | null | undefined) {
  if (!canAnimate() || !target) {
    return null;
  }
  ensureGsapRegistered();
  gsap.set(target, { opacity: 0 });
  return gsap.to(target, {
    opacity: 1,
    duration: 0.2,
    ease: "power2.out",
    overwrite: "auto"
  });
}

export function fadeInUp(target: Element | null | undefined) {
  if (!canAnimate() || !target) {
    return null;
  }
  ensureGsapRegistered();
  gsap.set(target, { opacity: 0, y: 8 });
  return gsap.to(target, {
    opacity: 1,
    y: 0,
    duration: 0.25,
    ease: "power2.out",
    overwrite: "auto",
    clearProps: "transform"
  });
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
    { boxShadow: "0 0 0 0 rgba(75, 225, 255, 0)" },
    {
      boxShadow: "0 0 0 1px rgba(75, 225, 255, 0.2), 0 0 18px rgba(75, 225, 255, 0.18)",
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto",
      onComplete: () => {
        gsap.to(element, {
          boxShadow: "0 0 0 0 rgba(75, 225, 255, 0)",
          duration: 0.25,
          ease: "power2.inOut",
          clearProps: "boxShadow"
        });
      }
    }
  );
}

export function flashNoteCard(noteId: string, scope?: ScopeElement): void {
  if (!scope) {
    return;
  }
  pulseGlow(`[data-note-id="${noteId}"]`, { scope });
}
