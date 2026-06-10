"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

let registered = false;

export function ensureGsapRegistered(): void {
  if (typeof window === "undefined" || registered) {
    return;
  }
  gsap.registerPlugin(useGSAP);
  registered = true;
}

export { gsap, useGSAP };
