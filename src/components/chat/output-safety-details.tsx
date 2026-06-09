"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { GatewayOutputSafetyMetadata } from "@/lib/gateway/types";

type OutputSafetyDetailsProps = {
  metadata?: GatewayOutputSafetyMetadata | null;
};

export function OutputSafetyDetails({ metadata }: OutputSafetyDetailsProps) {
  const detected = Boolean(metadata?.internal_tool_markup_detected);
  const removed = Boolean(metadata?.internal_tool_markup_removed);
  const hasData = Boolean(metadata) || detected || removed;

  if (!hasData) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neural-amber/30 bg-neural-amber/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-neural-amber" />
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-amber">Output Safety</p>
        </div>
        <Badge variant={removed ? "warning" : "inactive"}>{removed ? "sanitized" : "no rewrite"}</Badge>
      </div>
      <div className="mt-3 grid gap-1 text-xs leading-relaxed text-neural-text-secondary">
        <p>Detected internal tool markup: {detected ? "yes" : "no"}</p>
        <p>Removed internal tool markup: {removed ? "yes" : "no"}</p>
      </div>
      {removed ? (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neural-amber" />
          Gateway removed internal tool-call markup before returning this answer.
        </p>
      ) : null}
    </div>
  );
}
