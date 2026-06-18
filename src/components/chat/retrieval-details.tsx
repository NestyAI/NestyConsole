"use client";

import { Database, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TokenTag } from "@/components/ui/token-tag";
import type { GatewayRetrievalMetadata } from "@/lib/gateway/types";

type RetrievalDetailsProps = {
  metadata?: GatewayRetrievalMetadata | null;
};

function hasRetrievalData(metadata?: GatewayRetrievalMetadata | null): boolean {
  if (!metadata) return false;
  return Object.values(metadata).some((value) => value !== undefined && value !== null);
}

function truncateString(str: string | null | undefined, maxLen = 180): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}...`;
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "-";
  return num.toLocaleString();
}

function getSourceBadgeVariant(source: string): "success" | "warning" | "error" | "inactive" | "ai" | "live" {
  const s = source.toLowerCase().trim();
  if (s === "recent") return "inactive";
  if (["summary", "pinned_memory", "semantic_recall", "session_brief"].includes(s)) return "ai";
  if (["fts", "search", "tool"].includes(s)) return "live";
  return "inactive";
}

export function RetrievalDetails({ metadata }: RetrievalDetailsProps) {
  if (!hasRetrievalData(metadata)) {
    return null;
  }

  const data = metadata!;
  const isTruncated = data.context_truncated === true;
  const isMemoryUsed = data.pinned_memory_used === true || data.semantic_recall_used === true || data.context_sources?.includes("session_brief");

  let panelBorderColor = "border-neural-cyan/30";
  let panelBgColor = "bg-neural-cyan/10";
  let titleTextColor = "text-neural-cyan";
  let HeaderIcon = Database;

  if (isTruncated) {
    panelBorderColor = "border-neural-amber/30";
    panelBgColor = "bg-neural-amber/10";
    titleTextColor = "text-neural-amber";
    HeaderIcon = AlertTriangle;
  } else if (isMemoryUsed) {
    panelBorderColor = "border-neural-violet/30";
    panelBgColor = "bg-neural-violet/10";
    titleTextColor = "text-neural-violet";
  }

  const activeSignals: string[] = [];
  if (data.summary_used) activeSignals.push("summary used");
  if (data.pinned_memory_used) activeSignals.push("pinned memory used");
  if (data.fts_used) activeSignals.push("fts used");
  if (data.semantic_recall_used) activeSignals.push("semantic recall used");
  if (data.context_sources?.includes("session_brief")) activeSignals.push("session brief used");
  if (data.search_used) activeSignals.push("search used");

  return (
    <div className={`rounded-2xl border ${panelBorderColor} ${panelBgColor} p-4 animate-fade-in-up`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <HeaderIcon className={`h-4 w-4 ${titleTextColor}`} />
          <p className={`font-display text-[11px] uppercase tracking-[0.12em] ${titleTextColor}`}>Retrieval</p>
        </div>
        {isTruncated ? (
          <Badge variant="warning">context truncated</Badge>
        ) : data.context_used ? (
          <Badge variant="live">context used</Badge>
        ) : (
          <Badge variant="inactive">no context</Badge>
        )}
      </div>

      <div className="mt-3 grid gap-3 text-xs leading-relaxed text-neural-text-secondary md:grid-cols-2">
        {/* Left Column: Status fields */}
        <div className="space-y-1">
          <p>Context used: <span className="font-semibold text-neural-text-primary">{data.context_used ? "yes" : "no"}</span></p>
          <p>Context items count: <span className="font-semibold text-neural-text-primary">{data.context_items_count !== undefined ? data.context_items_count : "-"}</span></p>
          {data.context_used_chars !== undefined || data.context_budget_chars !== undefined ? (
            <p>
              Chars used:{" "}
              <span className="font-semibold text-neural-text-primary">
                {formatNumber(data.context_used_chars)} / {formatNumber(data.context_budget_chars)}
              </span>
            </p>
          ) : null}
        </div>

        {/* Right Column: Decision & Reason */}
        <div className="space-y-1">
          {data.retrieval_decision ? (
            <p>
              Decision: <span className="font-mono text-[11px] text-neural-text-primary">{truncateString(data.retrieval_decision, 60)}</span>
            </p>
          ) : null}
          {data.retrieval_reason ? (
            <p className="text-neural-text-muted" title={data.retrieval_reason}>
              Reason: <span className="text-neural-text-secondary">{truncateString(data.retrieval_reason, 120)}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Context Sources */}
      {data.context_sources && data.context_sources.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {data.context_sources.map((src, idx) => (
              <Badge key={`${src}-${idx}`} variant={getSourceBadgeVariant(src)}>
                {src}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* Active Signals */}
      {activeSignals.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {activeSignals.map((signal) => (
              <TokenTag key={signal} className="border-neural-text-muted/10">
                {signal}
              </TokenTag>
            ))}
          </div>
        </div>
      ) : null}

      {/* Truncation warnings */}
      {isTruncated && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-neural-amber/20 bg-neural-amber/5 px-3 py-2 text-xs leading-relaxed text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neural-amber" />
          <span>Context window budget limit reached. Oldest/lowest relevance retrieved context items were truncated.</span>
        </div>
      )}
    </div>
  );
}
