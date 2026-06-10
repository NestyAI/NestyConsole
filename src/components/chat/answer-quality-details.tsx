"use client";

import { Award, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GatewayAnswerQualityMetadata } from "@/lib/gateway/types";

type AnswerQualityDetailsProps = {
  metadata?: GatewayAnswerQualityMetadata | null;
};

function hasAnswerQualityData(metadata?: GatewayAnswerQualityMetadata | null): boolean {
  if (!metadata) return false;
  return Object.values(metadata).some((value) => value !== undefined && value !== null);
}

function formatValue(value: string): string {
  return value
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getActionVariant(value: string): "success" | "warning" | "error" | "inactive" | "ai" | "live" {
  const v = value.toLowerCase().trim();
  if (v === "none") return "success";
  if (["cleaned_internal_markup", "skipped_streaming"].includes(v)) return "warning";
  if (["fallback_empty", "metadata_only"].includes(v)) return "error";
  return "inactive";
}

function getFlagVariant(value: string): "success" | "warning" | "error" | "inactive" | "ai" | "live" {
  const v = value.toLowerCase().trim();
  if (["empty_answer", "claimed_search_without_search"].includes(v)) return "error";
  if (["internal_markup_detected", "skipped_streaming"].includes(v)) return "warning";
  return "inactive";
}

export function AnswerQualityDetails({ metadata }: AnswerQualityDetailsProps) {
  if (!hasAnswerQualityData(metadata)) {
    return null;
  }

  const data = metadata!;
  const flags = Array.isArray(data.flags) ? data.flags.filter(Boolean) : [];
  const hasFlags = flags.length > 0;

  let panelBorderColor = "border-white/10";
  let panelBgColor = "bg-white/[0.03]";
  let titleTextColor = "text-neural-text-primary";
  let HeaderIcon = Award;

  if (data.checked) {
    if (hasFlags) {
      panelBorderColor = "border-neural-amber/30";
      panelBgColor = "bg-neural-amber/5";
      titleTextColor = "text-neural-amber";
      HeaderIcon = ShieldAlert;
    } else {
      panelBorderColor = "border-neural-green/30";
      panelBgColor = "bg-neural-green/5";
      titleTextColor = "text-neural-green";
      HeaderIcon = CheckCircle2;
    }
  }

  return (
    <div className={`rounded-2xl border ${panelBorderColor} ${panelBgColor} p-4 animate-fade-in-up space-y-3`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <HeaderIcon className={`h-4 w-4 ${titleTextColor}`} />
          <p className={`font-display text-[11px] uppercase tracking-[0.12em] ${titleTextColor}`}>Answer Quality</p>
        </div>
        {data.checked ? (
          <Badge variant={hasFlags ? "warning" : "success"}>
            {hasFlags ? "flags raised" : "passed"}
          </Badge>
        ) : (
          <Badge variant="inactive">unchecked</Badge>
        )}
      </div>

      <div className="grid gap-3 text-xs leading-relaxed text-neural-text-secondary sm:grid-cols-2">
        <div>
          <p>
            Checked: <span className="font-semibold text-neural-text-primary">{data.checked ? "yes" : "no"}</span>
          </p>
        </div>

        {data.action ? (
          <div>
            <p className="flex items-center gap-1.5">
              <span>Remediation Action:</span>
              <Badge variant={getActionVariant(data.action)}>
                {formatValue(data.action)}
              </Badge>
            </p>
          </div>
        ) : null}
      </div>

      {/* Flags Section */}
      <div className="mt-2 space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Quality Flags</p>
        {hasFlags ? (
          <div className="flex flex-wrap gap-1.5">
            {flags.map((flag, idx) => (
              <Badge key={`${flag}-${idx}`} variant={getFlagVariant(flag)}>
                {flag}
              </Badge>
            ))}
          </div>
        ) : data.checked ? (
          <p className="text-xs text-neural-text-muted italic">No quality flags.</p>
        ) : (
          <p className="text-xs text-neural-text-muted italic">Gateway answer quality check did not run.</p>
        )}
      </div>
    </div>
  );
}
