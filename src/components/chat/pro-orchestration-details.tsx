"use client";

import { CheckCircle2, XCircle, AlertCircle, Clock, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TokenTag } from "@/components/ui/token-tag";
import type { GatewayOrchestrationMetadata } from "@/lib/gateway/types";

type ProOrchestrationDetailsProps = {
  metadata: GatewayOrchestrationMetadata;
};

export function ProOrchestrationDetails({ metadata }: ProOrchestrationDetailsProps) {
  const {
    requested = "auto",
    used = false,
    mode = "unknown",
    decision_reason,
    complexity_score,
    roles = [],
    completed_roles = [],
    failed_roles = [],
    skipped_roles = [],
    internal_calls = 0,
    fallback_used = false,
    fallback_reason,
    streaming_fallback = false,
    total_latency_ms,
    role_latency_ms = {}
  } = metadata;

  // 1. Determine Badge Status and priority:
  // streaming_fallback > fallback_used or mode="fallback" > mode="full" > mode="reduced" > mode="single" > mode="off" > unknown
  let badgeText = "UNKNOWN";
  let badgeVariant: "success" | "warning" | "error" | "inactive" | "live" = "inactive";

  if (streaming_fallback) {
    badgeText = "STREAMING FALLBACK";
    badgeVariant = "error";
  } else if (fallback_used || mode === "fallback") {
    badgeText = "FALLBACK";
    badgeVariant = "error";
  } else if (mode === "full") {
    badgeText = "FULL";
    badgeVariant = "success";
  } else if (mode === "reduced") {
    badgeText = "REDUCED";
    badgeVariant = "warning";
  } else if (mode === "single") {
    badgeText = "SINGLE";
    badgeVariant = "live";
  } else if (mode === "off") {
    badgeText = "OFF";
    badgeVariant = "inactive";
  }

  // 2. Format Latency Helper
  const formatLatency = (ms: number | null | undefined): string => {
    if (ms === undefined || ms === null) return "N/A";
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms}ms`;
  };

  // 3. Humanize Decision Reason Helper
  const humanizeReason = (reason: string | null | undefined): string => {
    if (!reason) return "N/A";
    return reason
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // 4. Role list mapping
  const ALL_STANDARD_ROLES = ["planner", "researcher", "critic", "finalizer"] as const;
  
  const getRoleStatus = (role: string) => {
    if (failed_roles.includes(role)) {
      return "failed";
    }
    if (completed_roles.includes(role) || (completed_roles.length === 0 && roles.includes(role))) {
      return "completed";
    }
    if (skipped_roles.includes(role) || (skipped_roles.length === 0 && !roles.includes(role))) {
      return "skipped";
    }
    return "skipped";
  };

  return (
    <div className="mt-4 rounded-xl border border-neural-text-muted/20 bg-neural-overlay/25 p-4 space-y-4 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neural-text-muted/15 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-neural-cyan" />
          <h3 className="font-display text-xs uppercase tracking-[0.08em] text-neural-text-primary">
            Nesty Pro Orchestration
          </h3>
        </div>
        <Badge variant={badgeVariant} withDot>
          {badgeText}
        </Badge>
      </div>

      {/* Grid params */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-3 md:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Requested Mode</p>
          <p className="mt-0.5 font-mono text-neural-text-secondary">{String(requested)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Orchestrator Used</p>
          <p className="mt-0.5 font-semibold text-neural-text-secondary">{used ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Complexity Score</p>
          <p className="mt-0.5 font-mono text-neural-text-secondary">
            {complexity_score !== undefined && complexity_score !== null ? complexity_score : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Total Latency</p>
          <p className="mt-0.5 font-mono text-neural-text-secondary">{formatLatency(total_latency_ms)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Internal Model Calls</p>
          <p className="mt-0.5 font-mono text-neural-text-secondary">{internal_calls || 0}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Decision Reason</p>
          <p className="mt-0.5 text-neural-text-secondary">{humanizeReason(decision_reason)}</p>
        </div>
      </div>

      {/* Role Flow Steps */}
      {used && (
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-[0.05em] text-neural-text-muted">Execution Flow & Latency</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_STANDARD_ROLES.map((role) => {
              const status = getRoleStatus(role);
              const latency = role_latency_ms[role];
              
              let statusBorderColor = "border-neural-text-muted/15";
              let statusBgColor = "bg-neural-overlay/10";
              let statusTextColor = "text-neural-text-secondary";
              let StatusIcon = Clock;

              if (status === "completed") {
                statusBorderColor = "border-neural-green/30";
                statusBgColor = "bg-neural-green/5";
                statusTextColor = "text-neural-green";
                StatusIcon = CheckCircle2;
              } else if (status === "failed") {
                statusBorderColor = "border-neural-red/35";
                statusBgColor = "bg-neural-red/8";
                statusTextColor = "text-neural-red";
                StatusIcon = XCircle;
              } else if (status === "skipped") {
                statusBorderColor = "border-neural-text-muted/10";
                statusBgColor = "bg-neural-overlay/5";
                statusTextColor = "text-neural-text-muted";
              }

              return (
                <div
                  key={role}
                  className={`flex items-center justify-between rounded-lg border p-2.5 ${statusBorderColor} ${statusBgColor}`}
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusTextColor}`} />
                    <span className="font-display text-[11px] uppercase tracking-[0.06em] text-neural-text-primary">
                      {role}
                    </span>
                  </div>
                  {status === "completed" && latency !== undefined && (
                    <span className="font-mono text-[10px] text-neural-text-muted">
                      {formatLatency(latency)}
                    </span>
                  )}
                  {status === "skipped" && (
                    <span className="font-mono text-[10px] text-neural-text-muted uppercase">
                      skipped
                    </span>
                  )}
                  {status === "failed" && (
                    <span className="font-mono text-[10px] text-neural-red uppercase font-semibold">
                      failed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback alerts */}
      {fallback_used && (
        <div className="rounded-lg border border-neural-red/30 bg-neural-red/10 p-3 text-xs text-rose-100 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-neural-red mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold uppercase tracking-[0.04em] text-neural-red">Fallback Path Active</p>
            <p className="mt-0.5 text-neural-text-secondary">
              Orchestrator fell back to single-provider model chain due to:{" "}
              <TokenTag className="border-neural-red/20 bg-neural-red/12 text-rose-100 ml-1">
                {fallback_reason || "orchestration_error"}
              </TokenTag>
            </p>
          </div>
        </div>
      )}

      {streaming_fallback && (
        <div className="rounded-lg border border-neural-amber/30 bg-neural-amber/8 p-3 text-xs text-neural-amber flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-neural-amber mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold uppercase tracking-[0.04em] text-neural-amber">Streaming Fallback Active</p>
            <p className="mt-0.5 text-neural-text-secondary">
              Streaming completions do not support multi-model orchestration synthesis. Gateway fell back to single-provider routing path.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
