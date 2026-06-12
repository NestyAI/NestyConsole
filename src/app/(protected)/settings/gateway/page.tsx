"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { RequestIdTag } from "@/components/ui/request-id-tag";
import { StateCard } from "@/components/ui/state-card";
import { rateLimitFallbackMessage } from "@/lib/gateway/provider-error-parsers";

type CredentialSource = "stored" | "env" | "missing";

type GatewayCredentialsView = {
  source: CredentialSource;
  gateway_url: string | null;
  gateway_url_source: CredentialSource;
  api_key_configured: boolean;
  api_key_source: CredentialSource;
  internal_admin_token_configured: boolean;
  internal_admin_token_source: CredentialSource;
  internal_admin_enabled: boolean;
  internal_admin_enabled_source: "stored" | "env";
  last_verified_at: string | null;
  last_status: string | null;
  last_error: string | null;
  updated_at: string | null;
  storage_mode: "sqlite" | "redis_kv" | "env_only";
  storage_available: boolean;
  storage_warning?: string;
};

type CredentialsResponse = {
  ok: boolean;
  data: GatewayCredentialsView;
};

type TestResponse = {
  ok: boolean;
  status:
    | "ok"
    | "credentials_not_configured"
    | "invalid_api_key"
    | "api_key_revoked"
    | "gateway_rate_limited"
    | "gateway_quota_exceeded"
    | "gateway_model_not_allowed"
    | "gateway_invalid_model"
    | "gateway_unreachable"
    | "internal_admin_invalid"
    | "unknown_error";
  message: string;
  request_id?: string;
  probes: {
    health: { ok: boolean; status: number; error_code?: string; request_id?: string };
    ready: { ok: boolean; status: number; error_code?: string; request_id?: string };
    models: { ok: boolean; status: number; error_code?: string; request_id?: string };
    internal_admin?: { ok: boolean; status: number; error_code?: string; request_id?: string };
  };
  warning?: string;
  storage_mode?: "sqlite" | "redis_kv" | "env_only";
  storage_available?: boolean;
};

export default function GatewaySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResponse | null>(null);
  const [view, setView] = useState<GatewayCredentialsView | null>(null);

  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayApiKey, setGatewayApiKey] = useState("");
  const [internalAdminToken, setInternalAdminToken] = useState("");
  const [internalAdminEnabled, setInternalAdminEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/console/gateway-credentials", { cache: "no-store" });
      const payload = (await response.json()) as CredentialsResponse & {
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || "Failed to load gateway credentials.");
        setView(null);
        return;
      }
      setView(payload.data);
      setGatewayUrl(payload.data.gateway_url || "");
      setInternalAdminEnabled(payload.data.internal_admin_enabled);
    } catch {
      setError("Failed to load gateway credentials.");
      setView(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/console/gateway-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway_url: gatewayUrl,
          gateway_api_key: gatewayApiKey,
          internal_admin_token: internalAdminToken,
          internal_admin_enabled: internalAdminEnabled
        })
      });
      const payload = (await response.json()) as CredentialsResponse & {
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || "Failed to save gateway credentials.");
        return;
      }
      setView(payload.data);
      setGatewayApiKey("");
      setInternalAdminToken("");
      setSuccess("Gateway credentials updated successfully.");
    } catch {
      setError("Failed to save gateway credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/console/gateway-credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway_url: gatewayUrl,
          gateway_api_key: gatewayApiKey,
          internal_admin_token: internalAdminToken,
          internal_admin_enabled: internalAdminEnabled
        })
      });
      const payload = (await response.json()) as TestResponse & {
        error?: { code?: string; message?: string };
      };

      if (!response.ok && !payload.status) {
        setError(payload.error?.message || "Connection test failed.");
        return;
      }

      setTestResult(payload);
      if (payload.status === "ok") {
        if (payload.warning) {
          setSuccess(`Gateway connection test passed. Warning: ${payload.warning}`);
        } else {
          setSuccess("Gateway connection test passed.");
        }
      } else if (payload.status === "invalid_api_key") {
        setError(
          "Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from startup logs and update it here."
        );
      } else if (payload.status === "api_key_revoked") {
        setError("Gateway API key was revoked. Create a new key in API Keys and update it here.");
      } else {
        let errMsg = payload.message || "Connection test failed.";
        if (payload.warning) {
          errMsg += ` (${payload.warning})`;
        }
        setError(errMsg);
      }
      await load();
    } catch {
      setError("Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleClearStoredCredentials = async () => {
    if (!window.confirm("Clear stored Gateway credentials? Environment variables will not be changed.")) {
      return;
    }
    setClearing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/console/gateway-credentials", {
        method: "DELETE"
      });
      const payload = (await response.json()) as CredentialsResponse & {
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || "Failed to clear stored gateway credentials.");
        return;
      }
      setView(payload.data);
      setGatewayUrl(payload.data.gateway_url || "");
      setGatewayApiKey("");
      setInternalAdminToken("");
      setInternalAdminEnabled(payload.data.internal_admin_enabled);
      setSuccess("Stored Gateway credentials cleared. Environment fallback values were not changed.");
    } catch {
      setError("Failed to clear stored gateway credentials.");
    } finally {
      setClearing(false);
    }
  };

  const invalidApiKeyHint = useMemo(
    () => view?.last_status === "invalid_api_key" || testResult?.status === "invalid_api_key",
    [testResult?.status, view?.last_status]
  );
  const revokedApiKeyHint = useMemo(
    () => view?.last_status === "api_key_revoked" || testResult?.status === "api_key_revoked",
    [testResult?.status, view?.last_status]
  );
  const saveDisabled = saving || loading || !view?.storage_available || view.storage_mode === "env_only";
  const hasStoredCredentials =
    view?.gateway_url_source === "stored" ||
    view?.api_key_source === "stored" ||
    view?.internal_admin_token_source === "stored" ||
    view?.internal_admin_enabled_source === "stored";
  const storageLabel =
    view?.storage_mode === "redis_kv"
      ? "Redis KV / Upstash"
      : view?.storage_mode === "env_only"
        ? "Env-only"
        : "SQLite";

  return (
    <MotionPage>
      <PageHeader
        title="Gateway Credentials"
        description="Manage encrypted server-side gateway access. Secret values are never rendered back into the browser."
        actions={
          <Badge variant="warning" withDot>
            protected
          </Badge>
        }
      />

      {view?.storage_mode === "redis_kv" && view.storage_available ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100 space-y-2">
          <p className="font-semibold">Persistent credential storage is active through Redis KV.</p>
          <p>Gateway credentials saved here can be updated on Vercel without redeploying.</p>
        </div>
      ) : null}

      {view?.storage_mode === "redis_kv" && !view.storage_available ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100 space-y-2">
          <p className="font-semibold">Redis KV storage unavailable</p>
          <p>
            Redis KV storage is selected but UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, or
            NESTY_CONSOLE_CREDENTIALS_SECRET is missing.
          </p>
        </div>
      ) : null}

      {view?.storage_mode === "env_only" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100 space-y-2">
          <p className="font-semibold flex items-center gap-2">Environment-Only Mode Active</p>
          <p>
            Nesty Console is running in environment-only mode (credential storage is disabled or unavailable in this serverless runtime).
            Saving credentials to the local database is disabled. The application relies on environment variables set in your hosting platform (e.g. Vercel).
          </p>
        </div>
      ) : null}

      <StateCard title="Effective configuration">
        <div className="text-sm text-neural-text-secondary space-y-1">
          <p className="pt-1">Gateway URL: {view?.gateway_url || "Not configured"}</p>
          <p>Credential source: {view?.source || "missing"}</p>
          <p>Gateway URL source: {view?.gateway_url_source || "missing"}</p>
          <p>API key configured: {view?.api_key_configured ? "yes" : "no"} ({view?.api_key_source || "missing"})</p>
          <p>
            Internal admin token configured: {view?.internal_admin_token_configured ? "yes" : "no"} (
            {view?.internal_admin_token_source || "missing"})
          </p>
          <p>
            Internal admin enabled: {view?.internal_admin_enabled ? "yes" : "no"} (
            {view?.internal_admin_enabled_source || "env"})
          </p>
          <div className="border-t border-white/5 my-2 pt-2 space-y-1">
            <p>Storage mode: <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-200">{storageLabel}</span></p>
            <p>Storage available: {view?.storage_available ? "yes" : "no"}</p>
            {view?.storage_warning ? (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded mt-1">
                {view.storage_warning}
              </p>
            ) : null}
          </div>
          <p className="pt-2 font-mono text-xs text-neural-text-muted">Last verified: {view?.last_verified_at || "Never tested"}</p>
          <p className="font-mono text-xs text-neural-text-muted">Last status: {view?.last_status || "-"}</p>
          {view?.last_error ? <p className="text-xs text-rose-200">Last error: {view.last_error}</p> : null}
          <p className="pt-1 text-xs text-cyan-200">
            Diagnostics dashboard requires internal admin enabled + internal admin token configured.
          </p>
        </div>
      </StateCard>

      {invalidApiKeyHint ? (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
          Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from
          Gateway startup logs and update it here.
        </div>
      ) : null}

      {revokedApiKeyHint ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm leading-relaxed text-rose-100">
          Gateway API key was revoked. Create a new key in{" "}
          <Link href="/api-keys" className="underline underline-offset-2">
            API Keys
          </Link>{" "}
          and paste it here.
        </div>
      ) : null}

      {error ? (
        <ErrorBanner message={error} />
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-4">
        <Panel accent="cyan" className="space-y-4 p-6 sm:p-7">
        <div className="space-y-2">
          <label htmlFor="gateway_url" className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
            Gateway URL
          </label>
          <input
            id="gateway_url"
            value={gatewayUrl}
            onChange={(event) => setGatewayUrl(event.target.value)}
            placeholder="https://your-gateway.example.com"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-neural-text-primary outline-none ring-neural-cyan/50 focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="gateway_api_key" className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
            Replace Gateway API Key (optional)
          </label>
          <input
            id="gateway_api_key"
            type="password"
            value={gatewayApiKey}
            onChange={(event) => setGatewayApiKey(event.target.value)}
            placeholder={view?.storage_mode === "env_only" ? "Used for Test connection only in env-only mode" : "Leave blank to keep existing value"}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-neural-text-primary outline-none ring-neural-cyan/50 focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="internal_admin_token" className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
            Replace Internal Admin Token (optional)
          </label>
          <input
            id="internal_admin_token"
            type="password"
            value={internalAdminToken}
            onChange={(event) => setInternalAdminToken(event.target.value)}
            placeholder={view?.storage_mode === "env_only" ? "Used for Test connection only in env-only mode" : "Leave blank to keep existing value"}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-neural-text-primary outline-none ring-neural-cyan/50 focus:ring"
          />
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neural-text-secondary">
          <input
            type="checkbox"
            checked={internalAdminEnabled}
            onChange={(event) => setInternalAdminEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-surface-900/70"
          />
          Enable internal admin access for server-side internal endpoint calls
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saveDisabled}
            className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save credentials
          </button>
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing || loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test connection
          </button>
          {view?.storage_available && hasStoredCredentials ? (
            <button
              type="button"
              onClick={() => void handleClearStoredCredentials()}
              disabled={clearing || loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-red/35 bg-neural-red/12 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-rose-100 transition hover:bg-neural-red/22 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear stored credentials
            </button>
          ) : null}
          <Link href="/settings" className="text-sm text-neural-text-secondary underline underline-offset-4">
            Back to settings
          </Link>
        </div>
        </Panel>
      </form>

      {testResult ? (
        <Panel accent="green" className="p-4 sm:p-6 text-sm text-neural-text-secondary">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
            Test summary: {testResult.status}
          </p>
          <p className="mt-2 leading-relaxed">{testResult.message}</p>
          {testResult.status === "gateway_rate_limited" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">{rateLimitFallbackMessage()}</p>
          ) : null}
          <RequestIdTag requestId={testResult.request_id} />
          {testResult.warning ? (
            <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
              Warning: {testResult.warning}
            </p>
          ) : null}
          <div className="mt-3 space-y-1 font-mono text-xs text-neural-text-secondary">
            <p>health: {testResult.probes.health.ok ? "ok" : testResult.probes.health.error_code || "error"}</p>
            <p>ready: {testResult.probes.ready.ok ? "ok" : testResult.probes.ready.error_code || "error"}</p>
            <p>models: {testResult.probes.models.ok ? "ok" : testResult.probes.models.error_code || "error"}</p>
            {testResult.probes.internal_admin ? (
              <p>
                internal_admin:{" "}
                {testResult.probes.internal_admin.ok ? "ok" : testResult.probes.internal_admin.error_code || "error"}
              </p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {view?.storage_mode === "env_only" ? (
        <Panel accent="violet" className="space-y-3 p-4 sm:p-6">
          <h3 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
            Vercel Environment Setup
          </h3>
          <p className="text-xs leading-relaxed text-neural-text-secondary">
            Since database storage is disabled, configure these environment variables on Vercel:
          </p>
          <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-neural-text-secondary">
            <li>NESTY_GATEWAY_URL - Base URL of NestyAI Gateway (e.g. https://your-gateway.vercel.app)</li>
            <li>NESTY_API_KEY - API key used to authorize requests against the Gateway</li>
            <li>NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN - set to &quot;true&quot; to enable model configs / diagnostics</li>
            <li>NESTY_INTERNAL_ADMIN_TOKEN - The token required for internal admin operations (optional)</li>
          </ul>
        </Panel>
      ) : null}

      {loading ? <LoadingBlock label="Loading credentials..." /> : null}
    </MotionPage>
  );
}
