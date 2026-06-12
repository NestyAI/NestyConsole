"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Panel } from "@/components/ui/panel";
import { RequestIdTag } from "@/components/ui/request-id-tag";
import { StatCard } from "@/components/ui/stat-card";
import { TokenTag } from "@/components/ui/token-tag";
import {
  clearProviderHealth,
  getLatestProviderHealth,
  getProviderHealthSummary,
  runProviderHealthCheck,
  type DiagnosticsConsoleError
} from "@/lib/diagnostics/client";
import type {
  ProviderHealthCheck,
  ProviderHealthSummary,
  ProviderReliabilityRecord
} from "@/lib/gateway/types";
import { fetchRuntimeStatus } from "@/lib/runtime-providers/client";
import type { GatewayProviderCapability, RuntimeStatusResponse } from "@/lib/runtime-providers/types";

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
  internal_admin_enabled_source: "stored" | "env";
  internal_admin_token_source: "stored" | "env" | "missing";
};

function normalizeError(payload: unknown, fallback: string): DiagnosticsConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

function formatTimestamp(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return "-";
  }
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    return "-";
  }
  return value.toLocaleString();
}

function truncate(value: unknown, max = 120): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "-";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}...`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function reliabilityLevel(row: ProviderReliabilityRecord): "high" | "medium" | "low" | "insufficient" {
  const score = toNumber(row.reliability_score ?? row.score);
  const sampleCount = toNumber(row.sample_count);
  if (score === null || sampleCount === null || sampleCount < 1) {
    return "insufficient";
  }
  if (score >= 0.8) {
    return "high";
  }
  if (score >= 0.5) {
    return "medium";
  }
  return "low";
}

function readHealthSummary(summary: ProviderHealthSummary) {
  const ok = toNumber(summary.ok) ?? toNumber(summary.healthy) ?? 0;
  const failed =
    (toNumber(summary.failed) ?? 0) +
    (toNumber(summary.unavailable) ?? 0) +
    (toNumber(summary.timeout) ?? 0);
  const stale = toNumber(summary.stale) ?? 0;
  const total = toNumber(summary.total_checks) ?? ok + failed + (toNumber(summary.skipped) ?? 0);
  const lastCheckAt = summary.last_check_at;
  return { ok, failed, stale, total, lastCheckAt };
}

function providerLabel(value: unknown): string {
  const provider = String(value || "").trim().toLowerCase();
  if (!provider) return "unknown";
  if (provider === "nvidia_nim") return "nvidia";
  return provider;
}

function providerBadgeVariant(provider: string): "success" | "live" | "ai" | "warning" | "inactive" {
  if (provider === "groq") return "live";
  if (provider === "openrouter") return "ai";
  if (provider === "nvidia") return "warning";
  if (provider === "ollama_cloud") return "success";
  return "inactive";
}

function readConfigSource(row: ProviderHealthCheck): string {
  if (typeof (row as Record<string, unknown>).config_source === "string") {
    return String((row as Record<string, unknown>).config_source).toLowerCase();
  }
  const metadata = (row as Record<string, unknown>).metadata;
  if (metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>).config_source === "string") {
    return String((metadata as Record<string, unknown>).config_source).toLowerCase();
  }
  return "unknown";
}

function readConfigRevision(row: ProviderHealthCheck): string | null {
  if (typeof (row as Record<string, unknown>).config_revision === "string") {
    return String((row as Record<string, unknown>).config_revision);
  }
  const metadata = (row as Record<string, unknown>).metadata;
  if (metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>).config_revision === "string") {
    return String((metadata as Record<string, unknown>).config_revision);
  }
  return null;
}

function configSourceVariant(value: string): "success" | "warning" | "ai" | "inactive" {
  if (value === "override") return "success";
  if (value === "default") return "ai";
  if (value === "effective") return "warning";
  return "inactive";
}

function errorCodeVariant(code: string): "error" | "warning" | "inactive" {
  if (["provider_auth_failed", "provider_model_unavailable", "provider_failed"].includes(code)) return "error";
  if (["rate_limited", "provider_timeout", "provider_unavailable"].includes(code)) return "warning";
  return "inactive";
}

export default function DiagnosticsPage() {
  const [summary, setSummary] = useState<ProviderHealthSummary>({});
  const [reliability, setReliability] = useState<ProviderReliabilityRecord[]>([]);
  const [latestChecks, setLatestChecks] = useState<ProviderHealthCheck[]>([]);
  const [summaryError, setSummaryError] = useState<DiagnosticsConsoleError | null>(null);
  const [latestError, setLatestError] = useState<DiagnosticsConsoleError | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearProvider, setClearProvider] = useState("");
  const [clearModelAlias, setClearModelAlias] = useState("");
  const [clearStatus, setClearStatus] = useState("");
  const [clearOlderThanSeconds, setClearOlderThanSeconds] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);
  const [credentialsError, setCredentialsError] = useState<DiagnosticsConsoleError | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusResponse | null>(null);
  const [runtimeStatusError, setRuntimeStatusError] = useState<DiagnosticsConsoleError | null>(null);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    setSummaryError(null);
    setLatestError(null);

    const [summaryResult, latestResult] = await Promise.all([
      getProviderHealthSummary({ since_seconds: 24 * 60 * 60 }),
      getLatestProviderHealth({ since_seconds: 24 * 60 * 60 })
    ]);

    if (!summaryResult.ok) {
      setSummaryError(summaryResult.error);
      setSummary({});
      setReliability([]);
    } else {
      setSummary(summaryResult.data.summary);
      setReliability(summaryResult.data.reliability);
    }

    if (!latestResult.ok) {
      setLatestError(latestResult.error);
      setLatestChecks([]);
    } else {
      setLatestChecks(latestResult.data.data);
    }

    setLoading(false);
  }, []);

  const loadCredentialsView = useCallback(async () => {
    setCredentialsError(null);
    try {
      const response = await fetch("/api/console/gateway-credentials", { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; data?: GatewayCredentialsView; error?: unknown };
      if (!response.ok || !payload.ok || !payload.data) {
        setCredentialsError(normalizeError(payload, "Failed to load gateway credential status."));
        setCredentialsView(null);
        return;
      }
      setCredentialsView(payload.data);
    } catch {
      setCredentialsError({
        code: "gateway_unreachable",
        message: "Failed to load gateway credential status."
      });
      setCredentialsView(null);
    }
  }, []);

  const loadRuntimeStatus = useCallback(async () => {
    setRuntimeStatusError(null);
    try {
      const payload = await fetchRuntimeStatus();
      setRuntimeStatus(payload);
    } catch (caught) {
      const err = caught as Error & { code?: string; message?: string };
      setRuntimeStatusError({
        code: String(err.code || "unknown_error"),
        message: err.message || "Failed to load Gateway runtime status."
      });
      setRuntimeStatus(null);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void Promise.all([loadDiagnostics(), loadCredentialsView(), loadRuntimeStatus()]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadCredentialsView, loadDiagnostics, loadRuntimeStatus]);

  const refresh = async () => {
    await Promise.all([loadDiagnostics(), loadCredentialsView(), loadRuntimeStatus()]);
  };

  const runHealthCheckNow = async () => {
    const confirmed = window.confirm(
      "Run provider health check now? This may call external providers and consume quota."
    );
    if (!confirmed) {
      return;
    }

    setRunningCheck(true);
    setNotice(null);
    const result = await runProviderHealthCheck({
      include_roles: true
    });
    setRunningCheck(false);

    if (!result.ok) {
      setSummaryError(result.error);
      return;
    }

    setNotice("Provider health check started successfully.");
    await loadDiagnostics();
  };

  const clearDiagnosticsHistory = async () => {
    const confirmed = window.confirm(
      "Clear provider health diagnostics history now? This only removes diagnostics history records."
    );
    if (!confirmed) {
      return;
    }
    setClearingHistory(true);
    setSummaryError(null);
    setLatestError(null);
    const result = await clearProviderHealth({
      provider: clearProvider.trim() || undefined,
      model_alias: clearModelAlias.trim() || undefined,
      status: clearStatus.trim() || undefined,
      older_than_seconds: clearOlderThanSeconds.trim()
        ? Number.parseInt(clearOlderThanSeconds.trim(), 10)
        : undefined
    });
    setClearingHistory(false);
    if (!result.ok) {
      setSummaryError(result.error);
      return;
    }
    setNotice(`Deleted ${result.data.deleted} provider health records.`);
    await loadDiagnostics();
  };

  const adminConfigured = Boolean(
    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured
  );

  const combinedError = summaryError || latestError;
  const credentialIssue =
    combinedError?.code === "credentials_not_configured" ||
    combinedError?.code === "invalid_gateway_api_key" ||
    combinedError?.code === "gateway_unreachable";
  const internalAdminIssue =
    combinedError?.code === "internal_admin_not_configured" || combinedError?.code === "internal_admin_invalid";
  const diagnosticsDisabled = combinedError?.code === "diagnostics_disabled";

  const summaryStats = useMemo(() => readHealthSummary(summary), [summary]);

  return (
    <MotionPage>
      <PageHeader
        title="Diagnostics"
        description="Provider health, reliability, and recent checks with quota-consuming actions kept explicit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:bg-white/[0.08] hover:text-neural-cyan disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void runHealthCheckNow()}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-amber/35 bg-neural-amber/14 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-amber transition hover:bg-neural-amber/24 disabled:opacity-60"
            disabled={runningCheck}
          >
            {runningCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Run health check
          </button>
          </div>
        }
      />

      <Panel accent="cyan" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">Gateway Runtime Status</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neural-text-secondary">
              Synced from Gateway v1.5 runtime APIs. Shows disabled providers and capability metadata without secrets.
            </p>
          </div>
          <Link
            href="/settings/providers"
            className="rounded-2xl border border-neural-cyan/35 bg-neural-cyan/12 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
          >
            Manage providers
          </Link>
        </div>

        {runtimeStatusError ? (
          <div className="mt-4">
            <ErrorBanner code={runtimeStatusError.code} message={runtimeStatusError.message} />
          </div>
        ) : null}

        {runtimeStatus ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <StatCard
                label="Disabled providers"
                value={String((runtimeStatus.disabled_providers || []).length)}
                hint="Routing-disabled provider IDs"
                accent="amber"
              />
              <p className="font-mono text-xs text-neural-text-muted">
                Updated: {formatTimestamp(runtimeStatus.runtime_state_updated_at)}
              </p>
              {(runtimeStatus.disabled_providers || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(runtimeStatus.disabled_providers || []).map((providerId) => (
                    <TokenTag key={providerId}>{providerId}</TokenTag>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neural-text-secondary">No providers are currently disabled.</p>
              )}
              <RequestIdTag requestId={runtimeStatus.request_id || undefined} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">Provider capabilities</h3>
              <div className="mt-3 space-y-2">
                {(runtimeStatus.provider_capabilities || []).slice(0, 12).map((provider: GatewayProviderCapability) => (
                  <div
                    key={String(provider.provider_id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-neural-text-primary">{provider.provider_id}</span>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={provider.source === "runtime" ? "live" : "ai"}>{provider.source || "builtin"}</Badge>
                      <Badge variant={provider.enabled === false ? "inactive" : "success"}>
                        {provider.enabled === false ? "disabled" : "enabled"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel accent="amber" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">Clear Diagnostics History</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neural-text-secondary">
              Deletes provider health diagnostics history only. It does not delete conversations, model configs, API keys, or usage logs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void clearDiagnosticsHistory()}
            disabled={clearingHistory || !adminConfigured}
            className="inline-flex items-center gap-2 rounded-2xl border border-neural-red/35 bg-neural-red/12 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-rose-100 transition hover:bg-neural-red/24 disabled:opacity-60"
          >
            {clearingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Clear history
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <input
            value={clearProvider}
            onChange={(event) => setClearProvider(event.target.value)}
            placeholder="provider (optional)"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
          />
          <input
            value={clearModelAlias}
            onChange={(event) => setClearModelAlias(event.target.value)}
            placeholder="model_alias (optional)"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
          />
          <input
            value={clearStatus}
            onChange={(event) => setClearStatus(event.target.value)}
            placeholder="status (optional)"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
          />
          <input
            value={clearOlderThanSeconds}
            onChange={(event) => setClearOlderThanSeconds(event.target.value)}
            placeholder="older_than_seconds"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
          />
        </div>
      </Panel>

      {notice ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100">
          {notice}
        </div>
      ) : null}

      <Panel accent="cyan" className="p-6">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-neural-cyan" />
          <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
            Admin Configuration Status
          </h2>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-neural-text-secondary">
          <p>Internal admin enabled: {credentialsView?.internal_admin_enabled ? "yes" : "no"}</p>
          <p>Internal admin token configured: {credentialsView?.internal_admin_token_configured ? "yes" : "no"}</p>
          {credentialsView ? (
            <p className="font-mono text-xs text-neural-text-muted">
              Sources: enabled={credentialsView.internal_admin_enabled_source}, token=
              {credentialsView.internal_admin_token_source}
            </p>
          ) : null}
          {!adminConfigured ? (
            <p className="text-amber-200">
              Internal admin token is required for diagnostics. Configure it in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
          {credentialsError ? (
            <p className="text-rose-200">
              {credentialsError.code}: {credentialsError.message}
            </p>
          ) : null}
        </div>
      </Panel>

      {combinedError ? (
        <ErrorBanner code={combinedError.code} message={combinedError.message}>
          {internalAdminIssue ? (
            <p className="mt-2">
              Configure internal admin token in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
          {credentialIssue ? (
            <p className="mt-2">
              Check Gateway connection in{" "}
              <Link href="/status" className="underline underline-offset-2">
                Status
              </Link>{" "}
              and{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
          {diagnosticsDisabled ? (
            <p className="mt-2">
              Diagnostics may be disabled on Gateway (`DIAGNOSTICS_ENABLED=false`).
            </p>
          ) : null}
          <RequestIdTag requestId={combinedError.details?.request_id} showLogHint />
        </ErrorBanner>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
          Provider Health Summary
        </h2>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total checks" value={summaryStats.total} accent="cyan" />
          <StatCard label="Healthy / OK" value={summaryStats.ok} accent="green" />
          <StatCard label="Failed / timeout" value={summaryStats.failed} accent="red" />
          <StatCard label="Stale" value={summaryStats.stale} accent="amber" />
          <StatCard label="Last check time" value={<TokenTag>{formatTimestamp(summaryStats.lastCheckAt)}</TokenTag>} accent="cyan" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
          Reliability Scores
        </h2>
        {reliability.length === 0 ? (
          <EmptyState title="No reliability records found yet." />
        ) : (
          <DataTable>
            <table className="min-w-full text-sm">
              <thead className="bg-neural-overlay/55 text-left font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-secondary">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Model / Alias</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Samples</th>
                  <th className="px-3 py-2">Avg latency</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {reliability.map((row, index) => {
                  const level = reliabilityLevel(row);
                  const score = toNumber(row.reliability_score ?? row.score);
                  const samples = toNumber(row.sample_count);
                  const avgLatency = toNumber(row.avg_latency_ms);
                  return (
                    <tr key={`${row.provider || "unknown"}-${row.model_alias || row.model || "model"}-${index}`} className="border-t border-neural-text-muted/20 text-neural-text-primary hover:bg-neural-overlay/25">
                      <td className="px-3 py-2 font-mono">{String(row.provider || "-")}</td>
                      <td className="px-3 py-2 font-mono">{String(row.model_alias || row.model || "-")}</td>
                      <td className="px-3 py-2 font-mono">{String(row.role || "-")}</td>
                      <td className="px-3 py-2 font-mono">{score === null ? "-" : score.toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono">{String(row.confidence || "-")}</td>
                      <td className="px-3 py-2 font-mono">{samples === null ? "-" : samples}</td>
                      <td className="px-3 py-2 font-mono">{avgLatency === null ? "-" : `${Math.round(avgLatency)} ms`}</td>
                      <td className="px-3 py-2">
                        <Badge variant={level === "high" ? "success" : level === "medium" ? "warning" : level === "low" ? "error" : "inactive"}>
                          {level === "insufficient" ? "insufficient_data" : level}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">Latest Provider Checks</h2>
        {latestChecks.length === 0 ? (
          <EmptyState
            title="No provider health check records found yet."
            description="Run a health check or use Gateway diagnostics scripts."
          />
        ) : (
          <DataTable>
            <table className="min-w-full text-sm">
              <thead className="bg-neural-overlay/55 text-left font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-secondary">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Alias</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Latency</th>
                  <th className="px-3 py-2">Checked at</th>
                  <th className="px-3 py-2">Error code</th>
                  <th className="px-3 py-2">Config source</th>
                  <th className="px-3 py-2">Config revision</th>
                  <th className="px-3 py-2">Output preview</th>
                </tr>
              </thead>
              <tbody>
                {latestChecks.map((row, index) => {
                  const provider = providerLabel(row.provider);
                  const status = String(row.status || "unknown").toLowerCase();
                  const configSource = readConfigSource(row);
                  const configRevision = readConfigRevision(row);
                  const errorCode = String(row.error_code || "").trim().toLowerCase();
                  return (
                    <tr
                      key={`${String(row.provider || "provider")}-${String(row.model_alias || row.model || "model")}-${index}`}
                      className="border-t border-neural-text-muted/20 text-neural-text-primary hover:bg-neural-overlay/25"
                    >
                      <td className="px-3 py-2 font-mono">
                        <Badge variant={providerBadgeVariant(provider)}>{provider}</Badge>
                      </td>
                      <td className="px-3 py-2 font-mono">{String(row.model || "-")}</td>
                      <td className="px-3 py-2 font-mono">{String(row.model_alias || "-")}</td>
                      <td className="px-3 py-2 font-mono">{String(row.role || "-")}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            status === "ok"
                              ? "success"
                              : ["failed", "timeout", "unavailable"].includes(status)
                                ? "error"
                                : status === "skipped"
                                  ? "warning"
                                  : "inactive"
                          }
                        >
                          {String(row.status || "unknown")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {toNumber(row.latency_ms) === null ? "-" : `${Math.round(toNumber(row.latency_ms) || 0)} ms`}
                      </td>
                      <td className="px-3 py-2 font-mono">{formatTimestamp(row.checked_at || row.created_at)}</td>
                      <td className="px-3 py-2">
                        {errorCode ? <Badge variant={errorCodeVariant(errorCode)}>{errorCode}</Badge> : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={configSourceVariant(configSource)}>{configSource}</Badge>
                      </td>
                      <td className="px-3 py-2">{configRevision ? <TokenTag>{configRevision}</TokenTag> : "-"}</td>
                      <td className="px-3 py-2 text-neural-text-secondary">{truncate(row.output_preview, 80)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </section>
    </MotionPage>
  );
}
