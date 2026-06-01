"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { StateCard } from "@/components/ui/state-card";

type CredentialSource = "stored" | "env" | "missing";

type GatewayCredentialsView = {
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
    | "gateway_unreachable"
    | "internal_admin_invalid"
    | "unknown_error";
  message: string;
  probes: {
    health: { ok: boolean; status: number; error_code?: string };
    ready: { ok: boolean; status: number; error_code?: string };
    models: { ok: boolean; status: number; error_code?: string };
    internal_admin?: { ok: boolean; status: number; error_code?: string };
  };
};

export default function GatewaySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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
        headers: { "Content-Type": "application/json" }
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
        setSuccess("Gateway connection test passed.");
      } else if (payload.status === "invalid_api_key") {
        setError(
          "Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from startup logs and update it here."
        );
      } else {
        setError(payload.message || "Connection test failed.");
      }
      await load();
    } catch {
      setError("Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const invalidApiKeyHint = useMemo(
    () => view?.last_status === "invalid_api_key" || testResult?.status === "invalid_api_key",
    [testResult?.status, view?.last_status]
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Gateway Credentials</h1>
        <p className="text-sm text-slate-300">
          Credentials are stored server-side with encryption. Secret values are never shown in the browser.
        </p>
      </div>

      <StateCard title="Effective configuration">
        <div className="text-sm text-slate-300">
        <p className="mt-2">Gateway URL: {view?.gateway_url || "Not configured"}</p>
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
        <p className="mt-2 text-xs text-slate-400">Last verified: {view?.last_verified_at || "Never tested"}</p>
        <p className="text-xs text-slate-400">Last status: {view?.last_status || "-"}</p>
        {view?.last_error ? <p className="text-xs text-rose-200">Last error: {view.last_error}</p> : null}
        <p className="mt-2 text-xs text-cyan-200">
          Diagnostics dashboard requires internal admin enabled + internal admin token configured.
        </p>
        </div>
      </StateCard>

      {invalidApiKeyHint ? (
        <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from
          Gateway startup logs and update it here.
        </div>
      ) : null}

      {error ? (
        <ErrorBanner message={error} />
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-2">
          <label htmlFor="gateway_url" className="text-sm text-slate-200">
            Gateway URL
          </label>
          <input
            id="gateway_url"
            value={gatewayUrl}
            onChange={(event) => setGatewayUrl(event.target.value)}
            placeholder="https://your-gateway.example.com"
            className="w-full rounded-lg border border-white/15 bg-surface-900/70 px-3 py-2 text-sm text-white outline-none ring-cyan-300/50 focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="gateway_api_key" className="text-sm text-slate-200">
            Replace Gateway API Key (optional)
          </label>
          <input
            id="gateway_api_key"
            type="password"
            value={gatewayApiKey}
            onChange={(event) => setGatewayApiKey(event.target.value)}
            placeholder="Leave blank to keep existing value"
            className="w-full rounded-lg border border-white/15 bg-surface-900/70 px-3 py-2 text-sm text-white outline-none ring-cyan-300/50 focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="internal_admin_token" className="text-sm text-slate-200">
            Replace Internal Admin Token (optional)
          </label>
          <input
            id="internal_admin_token"
            type="password"
            value={internalAdminToken}
            onChange={(event) => setInternalAdminToken(event.target.value)}
            placeholder="Leave blank to keep existing value"
            className="w-full rounded-lg border border-white/15 bg-surface-900/70 px-3 py-2 text-sm text-white outline-none ring-cyan-300/50 focus:ring"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-200">
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
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save credentials
          </button>
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test connection
          </button>
          <Link href="/settings" className="text-sm text-slate-300 underline underline-offset-2">
            Back to settings
          </Link>
        </div>
      </form>

      {testResult ? (
        <article className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <p className="font-medium text-white">Test summary: {testResult.status}</p>
          <p className="mt-1">{testResult.message}</p>
          <div className="mt-3 space-y-1 text-xs text-slate-300">
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
        </article>
      ) : null}

      {loading ? <LoadingBlock label="Loading credentials..." /> : null}
    </section>
  );
}
