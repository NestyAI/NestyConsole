"use client";

import { Compass, AlertTriangle, Search, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TokenTag } from "@/components/ui/token-tag";
import type { GatewayPlannerMetadata } from "@/lib/gateway/types";

type PlannerDetailsProps = {
  metadata?: GatewayPlannerMetadata | null;
};

function hasPlannerData(metadata?: GatewayPlannerMetadata | null): boolean {
  if (!metadata) return false;
  return Object.values(metadata).some((value) => value !== undefined && value !== null);
}

function truncateString(str: string | null | undefined, maxLen = 180): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}...`;
}

function formatDecision(decision: string): string {
  return decision
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getSearchDecisionVariant(value: string): "success" | "warning" | "error" | "inactive" | "ai" | "live" {
  const v = value.toLowerCase().trim();
  if (["forced_on", "current_info_needed"].includes(v)) return "live";
  if (["forced_off", "no_search_needed", "memory_context_sufficient", "stable_knowledge"].includes(v)) return "inactive";
  if (v === "unavailable") return "error";
  return "inactive";
}

function getToolDecisionVariant(value: string): "success" | "warning" | "error" | "inactive" | "ai" | "live" {
  const v = value.toLowerCase().trim();
  if (v === "tool_selected") return "live";
  if (v === "missing_required_parameters") return "warning";
  if (v === "no_tool_needed") return "inactive";
  if (v === "unavailable") return "error";
  return "inactive";
}

export function PlannerDetails({ metadata }: PlannerDetailsProps) {
  if (!hasPlannerData(metadata)) {
    return null;
  }

  const data = metadata!;
  const showClarification = data.clarification_needed === true;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-neural-cyan" />
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">Planner</p>
        </div>
        {showClarification ? (
          <Badge variant="warning">clarification requested</Badge>
        ) : (
          <Badge variant="inactive">execution complete</Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Search Plan */}
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.01] p-3">
          <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
            <Search className="h-3.5 w-3.5 text-neural-text-muted" />
            <p className="font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-primary">Search Decisions</p>
          </div>
          <div className="grid gap-1.5 text-xs text-neural-text-secondary">
            {data.search_decision ? (
              <div className="flex items-center justify-between">
                <span>Decision:</span>
                <Badge variant={getSearchDecisionVariant(data.search_decision)}>
                  {formatDecision(data.search_decision)}
                </Badge>
              </div>
            ) : null}
            <p>Search planned: <span className="font-semibold text-neural-text-primary">{data.search_planned !== undefined ? (data.search_planned ? "yes" : "no") : "-"}</span></p>
            <p>Search used: <span className="font-semibold text-neural-text-primary">{data.search_used !== undefined ? (data.search_used ? "yes" : "no") : "-"}</span></p>
            {data.search_reason ? (
              <div className="mt-1 border-t border-white/5 pt-1 text-[11px] text-neural-text-muted" title={data.search_reason}>
                Reason: <span className="text-neural-text-secondary">{truncateString(data.search_reason, 140)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tools Plan */}
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.01] p-3">
          <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
            <Cpu className="h-3.5 w-3.5 text-neural-text-muted" />
            <p className="font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-primary">Tool Decisions</p>
          </div>
          <div className="grid gap-1.5 text-xs text-neural-text-secondary">
            {data.tool_decision ? (
              <div className="flex items-center justify-between">
                <span>Decision:</span>
                <Badge variant={getToolDecisionVariant(data.tool_decision)}>
                  {formatDecision(data.tool_decision)}
                </Badge>
              </div>
            ) : null}
            {data.tool_reason ? (
              <div className="mt-1 text-[11px] text-neural-text-muted" title={data.tool_reason}>
                Reason: <span className="text-neural-text-secondary">{truncateString(data.tool_reason, 140)}</span>
              </div>
            ) : null}

            {data.tools_planned && data.tools_planned.length > 0 ? (
              <div className="mt-1 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.04em] text-neural-text-muted">Tools Planned</p>
                <div className="flex flex-wrap gap-1">
                  {data.tools_planned.map((t) => (
                    <TokenTag key={t}>{t}</TokenTag>
                  ))}
                </div>
              </div>
            ) : null}

            {data.tools_used && data.tools_used.length > 0 ? (
              <div className="mt-1 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.04em] text-neural-text-muted">Tools Executed</p>
                <div className="flex flex-wrap gap-1">
                  {data.tools_used.map((t) => (
                    <TokenTag key={t} className="border-neural-cyan/20 text-neural-cyan">
                      {t}
                    </TokenTag>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Clarification requested alert */}
      {showClarification && (
        <div className="flex items-start gap-2 rounded-2xl border border-neural-amber/20 bg-neural-amber/5 p-4 text-xs text-neural-amber">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-neural-amber" />
          <div className="space-y-1">
            <p className="font-semibold uppercase tracking-[0.04em]">Clarification Requested</p>
            <p className="text-neural-text-secondary leading-relaxed">
              Gateway identified a missing required detail and guided the model to ask a short clarification.
            </p>
            {data.clarification_reason ? (
              <p className="border-t border-white/5 pt-1 text-[11px] text-neural-text-muted">
                Reason: <span className="text-neural-text-secondary">{truncateString(data.clarification_reason, 140)}</span>
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
