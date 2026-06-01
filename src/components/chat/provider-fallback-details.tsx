"use client";

import { Route } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  GatewayProviderAttempt,
  GatewayProviderError,
  GatewayRuntimeFallbackMetadata
} from "@/lib/gateway/types";

type ProviderFallbackDetailsProps = {
  metadata?: GatewayRuntimeFallbackMetadata | null;
};

function normalizeProviderName(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "unknown";
  if (raw === "groq") return "groq";
  if (raw === "openrouter") return "openrouter";
  if (raw === "nvidia" || raw === "nvidia_nim") return "nvidia";
  if (raw === "ollama_cloud") return "ollama_cloud";
  return raw;
}

function providerBadgeVariant(provider: string): "success" | "live" | "ai" | "warning" | "inactive" {
  if (provider === "groq") return "live";
  if (provider === "openrouter") return "ai";
  if (provider === "nvidia") return "warning";
  if (provider === "ollama_cloud") return "success";
  return "inactive";
}

function errorVariant(code: string): "error" | "warning" | "inactive" {
  if (["provider_auth_failed", "provider_model_unavailable", "provider_failed"].includes(code)) return "error";
  if (["rate_limited", "provider_timeout", "provider_unavailable"].includes(code)) return "warning";
  return "inactive";
}

function compactModel(model: string): string {
  if (model.length <= 44) return model;
  return `${model.slice(0, 20)}...${model.slice(-20)}`;
}

function hasFallbackData(metadata: GatewayRuntimeFallbackMetadata | null | undefined): boolean {
  if (!metadata) return false;
  return Boolean(
    (metadata.attempted_providers && metadata.attempted_providers.length > 0) ||
      (metadata.provider_errors && metadata.provider_errors.length > 0) ||
      metadata.fallback_used !== undefined ||
      metadata.fallback_reason ||
      metadata.selected_provider ||
      metadata.selected_model
  );
}

function safeAttempts(items: GatewayProviderAttempt[] | undefined): GatewayProviderAttempt[] {
  return Array.isArray(items) ? items : [];
}

function safeErrors(items: GatewayProviderError[] | undefined): GatewayProviderError[] {
  return Array.isArray(items) ? items : [];
}

export function ProviderFallbackDetails({ metadata }: ProviderFallbackDetailsProps) {
  if (!hasFallbackData(metadata)) {
    return null;
  }

  const attempts = safeAttempts(metadata?.attempted_providers);
  const errors = safeErrors(metadata?.provider_errors);
  const selectedProvider = normalizeProviderName(metadata?.selected_provider);
  const selectedModel = String(metadata?.selected_model || "").trim();
  const fallbackUsed = metadata?.fallback_used === true;
  const fallbackReason = String(metadata?.fallback_reason || "").trim();

  return (
    <div className="rounded-lg border border-neural-cyan/30 bg-neural-cyan/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-neural-cyan" />
          <p className="font-display text-xs uppercase tracking-[0.08em] text-neural-cyan">Provider Fallback</p>
        </div>
        <Badge variant={fallbackUsed ? "warning" : "inactive"}>{fallbackUsed ? "used" : "not used"}</Badge>
      </div>

      <div className="mt-2 grid gap-1 text-xs text-neural-text-secondary">
        <p>Selected provider: {selectedProvider !== "unknown" ? selectedProvider : "-"}</p>
        <p title={selectedModel || undefined}>Selected model: {selectedModel ? compactModel(selectedModel) : "-"}</p>
        <p>Fallback used: {fallbackUsed ? "yes" : "no"}</p>
        <p title={fallbackReason || undefined}>Fallback reason: {fallbackReason || "-"}</p>
      </div>

      {attempts.length > 0 ? (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.06em] text-neural-text-muted">Attempted provider chain</p>
          <div className="flex flex-wrap gap-1.5">
            {attempts.map((item, index) => {
              const provider = normalizeProviderName(item.provider);
              const model = String(item.model || "").trim();
              return (
                <span key={`${provider}:${model}:${index}`} className="inline-flex items-center gap-1">
                  <Badge variant={providerBadgeVariant(provider)}>{provider}</Badge>
                  {model ? (
                    <span
                      className="max-w-[240px] truncate rounded border border-neural-text-muted/30 bg-neural-overlay/35 px-2 py-1 font-mono text-[11px] text-neural-text-secondary"
                      title={model}
                    >
                      {compactModel(model)}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.06em] text-neural-text-muted">Provider errors</p>
          <div className="space-y-1.5">
            {errors.map((item, index) => {
              const provider = normalizeProviderName(item.provider);
              const model = String(item.model || "").trim();
              const errorCode = String(item.error_code || "unknown").trim().toLowerCase();
              const status = item.upstream_status ?? null;
              return (
                <div
                  key={`${provider}:${model}:${errorCode}:${index}`}
                  className="rounded border border-neural-text-muted/20 bg-neural-overlay/35 p-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={providerBadgeVariant(provider)}>{provider}</Badge>
                    {model ? (
                      <span
                        className="max-w-[240px] truncate rounded border border-neural-text-muted/30 bg-neural-overlay/35 px-2 py-1 font-mono text-[11px] text-neural-text-secondary"
                        title={model}
                      >
                        {compactModel(model)}
                      </span>
                    ) : null}
                    <Badge variant={errorVariant(errorCode)}>{errorCode}</Badge>
                    {status !== null && status !== undefined ? (
                      <span className="font-mono text-[11px] text-neural-text-muted">status {String(status)}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
