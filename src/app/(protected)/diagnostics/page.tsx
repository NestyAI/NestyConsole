"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import {
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

function reliabilityBadgeClass(level: ReturnType<typeof reliabilityLevel>): string {
  if (level === "high") {
    return "bg-emerald-400/20 text-emerald-100";
  }
  if (level === "medium") {
    return "bg-amber-400/20 text-amber-100";
  }
  if (level === "low") {
    return "bg-rose-400/20 text-rose-100";
  }
  return "bg-slate-500/30 text-slate-200";
}

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "ok") {
    return "bg-emerald-400/20 text-emerald-100";
  }
  if (normalized === "failed" || normalized === "timeout" || normalized === "unavailable") {
    return "bg-rose-400/20 text-rose-100";
  }
  if (normalized === "skipped") {
    return "bg-amber-400/20 text-amber-100";
  }
  return "bg-slate-500/30 text-slate-200";
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

export default function DiagnosticsPage() {
  const [summary, setSummary] = useState<ProviderHealthSummary>({});
  const [reliability, setReliability] = useState<ProviderReliabilityRecord[]>([]);
  const [latestChecks, setLatestChecks] = useState<ProviderHealthCheck[]>([]);
  const [summaryError, setSummaryError] = useState<DiagnosticsConsoleError | null>(null);
  const [latestError, setLatestError] = useState<DiagnosticsConsoleError | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);
  const [credentialsError, setCredentialsError] = useState<DiagnosticsConsoleError | null>(null);

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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void Promise.all([loadDiagnostics(), loadCredentialsView()]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadCredentialsView, loadDiagnostics]);

  const refresh = async () => {
    await Promise.all([loadDiagnostics(), loadCredentialsView()]);
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Diagnostics</h1>
          <p className="text-sm text-slate-300">
            Gateway provider health, reliability, and latest diagnostic checks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void runHealthCheckNow()}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-60"
            disabled={runningCheck}
          >
            {runningCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Run health check
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>
      ) : null}

      <article className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-cyan-200" />
          <h2 className="text-sm font-semibold text-white">Admin Configuration Status</h2>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-slate-300">
          <p>Internal admin enabled: {credentialsView?.internal_admin_enabled ? "yes" : "no"}</p>
          <p>Internal admin token configured: {credentialsView?.internal_admin_token_configured ? "yes" : "no"}</p>
          {credentialsView ? (
            <p className="text-xs text-slate-400">
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
      </article>

      {combinedError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">{combinedError.code}</p>
          <p className="mt-1">{combinedError.message}</p>
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
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Provider Health Summary</h2>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-300">Total checks</p>
            <p className="mt-1 text-xl font-semibold text-white">{summaryStats.total}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-300">Healthy / OK</p>
            <p className="mt-1 text-xl font-semibold text-emerald-100">{summaryStats.ok}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-300">Failed / unavailable / timeout</p>
            <p className="mt-1 text-xl font-semibold text-rose-100">{summaryStats.failed}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-300">Stale</p>
            <p className="mt-1 text-xl font-semibold text-amber-100">{summaryStats.stale}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-300">Last check time</p>
            <p className="mt-1 text-sm font-medium text-slate-100">{formatTimestamp(summaryStats.lastCheckAt)}</p>
          </article>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Reliability Scores</h2>
        {reliability.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No reliability records found yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-300">
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
                    <tr key={`${row.provider || "unknown"}-${row.model_alias || row.model || "model"}-${index}`} className="border-t border-white/10 text-slate-100">
                      <td className="px-3 py-2">{String(row.provider || "-")}</td>
                      <td className="px-3 py-2">{String(row.model_alias || row.model || "-")}</td>
                      <td className="px-3 py-2">{String(row.role || "-")}</td>
                      <td className="px-3 py-2">{score === null ? "-" : score.toFixed(2)}</td>
                      <td className="px-3 py-2">{String(row.confidence || "-")}</td>
                      <td className="px-3 py-2">{samples === null ? "-" : samples}</td>
                      <td className="px-3 py-2">{avgLatency === null ? "-" : `${Math.round(avgLatency)} ms`}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${reliabilityBadgeClass(level)}`}>
                          {level === "insufficient" ? "insufficient_data" : level}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Latest Provider Checks</h2>
        {latestChecks.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No provider health check records found yet. Run a health check or use Gateway diagnostics scripts.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Alias</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Latency</th>
                  <th className="px-3 py-2">Checked at</th>
                  <th className="px-3 py-2">Error code</th>
                  <th className="px-3 py-2">Output preview</th>
                </tr>
              </thead>
              <tbody>
                {latestChecks.map((row, index) => (
                  <tr
                    key={`${String(row.provider || "provider")}-${String(row.model_alias || row.model || "model")}-${index}`}
                    className="border-t border-white/10 text-slate-100"
                  >
                    <td className="px-3 py-2">{String(row.provider || "-")}</td>
                    <td className="px-3 py-2">{String(row.model || "-")}</td>
                    <td className="px-3 py-2">{String(row.model_alias || "-")}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${statusBadgeClass(String(row.status || "unknown"))}`}>
                        {String(row.status || "unknown")}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {toNumber(row.latency_ms) === null ? "-" : `${Math.round(toNumber(row.latency_ms) || 0)} ms`}
                    </td>
                    <td className="px-3 py-2">{formatTimestamp(row.checked_at || row.created_at)}</td>
                    <td className="px-3 py-2">{String(row.error_code || "-")}</td>
                    <td className="px-3 py-2 text-slate-300">{truncate(row.output_preview, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
