export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canAnimate(): boolean {
  return typeof window !== "undefined" && !prefersReducedMotion();
}
