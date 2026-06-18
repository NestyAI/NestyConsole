"use client";

import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GatewayMemoryMetadata } from "@/lib/gateway/types";

type MemoryDetailsProps = {
  metadata?: GatewayMemoryMetadata | null;
};

function hasMemoryData(metadata?: GatewayMemoryMetadata | null): boolean {
  if (!metadata) return false;
  return Object.values(metadata).some((value) => value !== undefined && value !== null);
}

export function MemoryDetails({ metadata }: MemoryDetailsProps) {
  if (!hasMemoryData(metadata)) {
    return null;
  }

  const data = metadata!;

  return (
    <div className="rounded-2xl border border-neural-violet/30 bg-neural-violet/10 p-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-neural-violet" />
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-violet">Memory</p>
        </div>
        {data.session_brief_used ? (
          <Badge variant="ai">session brief used</Badge>
        ) : (
          <Badge variant="inactive">no session brief</Badge>
        )}
      </div>

      <div className="mt-3 grid gap-3 text-xs leading-relaxed text-neural-text-secondary md:grid-cols-2">
        <div className="space-y-1">
          <p>
            Session brief used:{" "}
            <span className="font-semibold text-neural-text-primary">
              {data.session_brief_used !== undefined ? (data.session_brief_used ? "yes" : "no") : "-"}
            </span>
          </p>
          <p>
            Compactor ran:{" "}
            <span className="font-semibold text-neural-text-primary">
              {data.session_compactor_ran !== undefined ? (data.session_compactor_ran ? "yes" : "no") : "-"}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p>
            History messages injected:{" "}
            <span className="font-semibold text-neural-text-primary">
              {data.history_messages_injected !== undefined ? data.history_messages_injected : "-"}
            </span>
          </p>
          {data.session_compact_mode ? (
            <p>
              Session compact mode:{" "}
              <span className="font-mono text-[11px] text-neural-text-primary">{data.session_compact_mode}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
