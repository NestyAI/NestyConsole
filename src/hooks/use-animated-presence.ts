"use client";

import { useState } from "react";

export type PresencePhase = "open" | "closing" | "closed";

export function useAnimatedPresence(open: boolean) {
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) {
    setMounted(true);
  }

  const phase: PresencePhase = open ? "open" : mounted ? "closing" : "closed";

  return {
    mounted,
    phase,
    completeExit: () => setMounted(false)
  };
}
