"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { RequestIdTag } from "@/components/ui/request-id-tag";
import { StateCard } from "@/components/ui/state-card";
import {
  createRuntimeOpenAIProvider,
  deleteRuntimeProvider,
  disableRuntimeProvider,
  enableRuntimeProvider,
  fetchRuntimeProviders,
  testRuntimeProvider,
  updateRuntimeProvider
} from "@/lib/runtime-providers/client";
import type { GatewayProviderCapability } from "@/lib/runtime-providers/types";

type ConsoleError = {
  code: string;
  message: string;
  details?: { request_id?: string };
};

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
};

const BUILTIN_IDS = new Set(["groq", "openrouter", "nvidia", "nvidia_nim", "deepseek", "ollama_cloud"]);

function secretStatusLabel(status: string | null | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (!value || value === "none") return "none";
  if (value === "missing") return "missing";
  if (value === "env_ref") return "env";
  if (value === "stored") return "stored";
  return value;
}

function secretBadgeVariant(status: string | null | undefined): "success" | "warning" | "error" | "inactive" {
  const value = String(status || "").trim().toLowerCase();
  if (value === "stored" || value === "env_ref") return "success";
  if (value === "missing") return "error";
  return "inactive";
}

type ProviderFormState = {
  provider_id: string;
  display_name: string;
  base_url: string;
  chat_completions_path: string;
  api_key_mode: "env" | "secret_file" | "none";
  api_key_env_name: string;
  api_key: string;
  default_timeout_seconds: string;
  health_check_model: string;
  enabled: boolean;
};

const EMPTY_FORM: ProviderFormState = {
  provider_id: "",
  display_name: "",
  base_url: "",
  chat_completions_path: "/v1/chat/completions",
  api_key_mode: "env",
  api_key_env_name: "",
  api_key: "",
  default_timeout_seconds: "60",
  health_check_model: "",
  enabled: true
};

export default function RuntimeProvidersSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<GatewayProviderCapability[]>([]);
  const [error, setError] = useState<ConsoleError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<ProviderFormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProviderFormState>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const adminConfigured = Boolean(
    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured
  );

  const runtimeProviders = useMemo(
    () => providers.filter((item) => String(item.source || "").toLowerCase() === "runtime"),
    [providers]
  );
  const builtinProviders = useMemo(
    () => providers.filter((item) => String(item.source || "").toLowerCase() !== "runtime"),
    [providers]
  );

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRequestId(null);
    try {
      const payload = await fetchRuntimeProviders();
      setProviders(Array.isArray(payload.providers) ? payload.providers : []);
      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);
    } catch (caught) {
      const err = caught as Error & { code?: string; details?: { request_id?: string } };
      setError({
        code: String(err.code || "unknown_error"),
        message: err.message || "Failed to load runtime providers.",
        details: err.details
      });
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCredentialsView = useCallback(async () => {
    try {
      const response = await fetch("/api/console/gateway-credentials", { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; data?: GatewayCredentialsView };
      if (response.ok && payload.ok && payload.data) {
        setCredentialsView(payload.data);
      }
    } catch {
      setCredentialsView(null);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void Promise.all([loadProviders(), loadCredentialsView()]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadCredentialsView, loadProviders]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    setRequestId(null);
    try {
      const payload = await createRuntimeOpenAIProvider({
        provider_id: createForm.provider_id.trim(),
        display_name: createForm.display_name.trim(),
        base_url: createForm.base_url.trim(),
        chat_completions_path: createForm.chat_completions_path.trim() || "/v1/chat/completions",
        api_key_mode: createForm.api_key_mode,
        api_key_env_name: createForm.api_key_env_name.trim() || null,
        api_key: createForm.api_key.trim() || null,
        default_timeout_seconds: Number(createForm.default_timeout_seconds) || 60,
        health_check_model: createForm.health_check_model.trim() || null,
        enabled: createForm.enabled
      });
      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);
      setNotice(`Runtime provider "${payload.provider_id || createForm.provider_id}" created.`);
      setShowCreateForm(false);
      setCreateForm(EMPTY_FORM);
      await loadProviders();
    } catch (caught) {
      const err = caught as Error & { code?: string; details?: { request_id?: string } };
      setError({
        code: String(err.code || "unknown_error"),
        message: err.message || "Failed to create runtime provider.",
        details: err.details
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (provider: GatewayProviderCapability) => {
    const id = String(provider.provider_id || "");
    setEditId(id);
    setEditForm({
      provider_id: id,
      display_name: String(provider.display_name || id),
      base_url: String((provider as Record<string, unknown>).base_url || ""),
      chat_completions_path: String((provider as Record<string, unknown>).chat_completions_path || "/v1/chat/completions"),
      api_key_mode: (String(provider.api_key_mode || "env") as ProviderFormState["api_key_mode"]) || "env",
      api_key_env_name: String(provider.api_key_env_name || ""),
      api_key: "",
      default_timeout_seconds: String(provider.default_timeout_seconds || 60),
      health_check_model: String(provider.health_check_model || ""),
      enabled: provider.enabled !== false
    });
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    setRequestId(null);
    try {
      const body: Record<string, unknown> = {
        display_name: editForm.display_name.trim(),
        base_url: editForm.base_url.trim(),
        chat_completions_path: editForm.chat_completions_path.trim() || "/v1/chat/completions",
        api_key_mode: editForm.api_key_mode,
        api_key_env_name: editForm.api_key_env_name.trim() || null,
        default_timeout_seconds: Number(editForm.default_timeout_seconds) || 60,
        health_check_model: editForm.health_check_model.trim() || null,
        enabled: editForm.enabled
      };
      if (editForm.api_key.trim()) {
        body.api_key = editForm.api_key.trim();
      }
      const payload = await updateRuntimeProvider(editId, body);
      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);
      setNotice(`Runtime provider "${editId}" updated.`);
      setEditId(null);
      await loadProviders();
    } catch (caught) {
      const err = caught as Error & { code?: string; details?: { request_id?: string } };
      setError({
        code: String(err.code || "unknown_error"),
        message: err.message || "Failed to update runtime provider.",
        details: err.details
      });
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (providerId: string, action: "test" | "enable" | "disable" | "delete") => {
    setBusyId(providerId);
    setError(null);
    setNotice(null);
    setRequestId(null);
    try {
      let payload;
      if (action === "test") payload = await testRuntimeProvider(providerId);
      else if (action === "enable") payload = await enableRuntimeProvider(providerId);
      else if (action === "disable") payload = await disableRuntimeProvider(providerId);
      else payload = await deleteRuntimeProvider(providerId);

      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);
      if (action === "test") {
        const status = String(payload.extra?.status || (payload.ok ? "ok" : "failed"));
        setNotice(`Test for "${providerId}": ${status}.`);
      } else if (action === "delete") {
        setNotice(`Runtime provider "${providerId}" deleted.`);
        if (editId === providerId) setEditId(null);
      } else {
        setNotice(`Runtime provider "${providerId}" ${action}d.`);
      }
      await loadProviders();
    } catch (caught) {
      const err = caught as Error & { code?: string; details?: { request_id?: string } };
      setError({
        code: String(err.code || "unknown_error"),
        message: err.message || `Failed to ${action} provider.`,
        details: err.details
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <MotionPage>
      <PageHeader
        title="Runtime Providers"
        description="Manage OpenAI-compatible runtime providers through protected server routes. Submitted API keys are never echoed back."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadProviders()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm((value) => !value)}
              disabled={!adminConfigured}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/24 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add runtime provider
            </button>
          </div>
        }
      />

      {!adminConfigured ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
          Internal admin access is required. Configure the admin token in{" "}
          <Link href="/settings/gateway" className="underline underline-offset-2">
            Gateway Credentials
          </Link>
          .
        </div>
      ) : null}

      {error ? (
        <ErrorBanner code={error.code} message={error.message}>
          {error.code === "internal_admin_not_configured" || error.code === "internal_admin_invalid" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              Update internal admin settings in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
          <RequestIdTag requestId={error.details?.request_id} />
        </ErrorBanner>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100">
          {notice}
          <RequestIdTag requestId={requestId || undefined} />
        </div>
      ) : null}

      {loading ? <LoadingBlock label="Loading runtime providers..." /> : null}

      {!loading ? (
        <>
          <StateCard title={`Built-in providers (${builtinProviders.length})`}>
            <p className="mb-3 text-xs text-neural-text-secondary">
              Built-in providers are read-only. Use disable to stop routing without deleting configuration.
            </p>
            <div className="space-y-2">
              {builtinProviders.length === 0 ? (
                <p className="text-sm text-neural-text-muted">No built-in providers returned.</p>
              ) : (
                builtinProviders.map((provider) => {
                  const id = String(provider.provider_id || "");
                  const busy = busyId === id;
                  return (
                    <article
                      key={id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neural-text-secondary"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-neural-text-primary">{id}</span>
                          <Badge variant="ai">builtin</Badge>
                          <Badge variant={provider.enabled === false ? "inactive" : "success"}>
                            {provider.enabled === false ? "disabled" : "enabled"}
                          </Badge>
                          <Badge variant={secretBadgeVariant(provider.secret_status)}>
                            secret: {secretStatusLabel(provider.secret_status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || !adminConfigured}
                            onClick={() => void runAction(id, "test")}
                            className="rounded border border-neural-cyan/35 bg-neural-cyan/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-neural-cyan disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
                          </button>
                          {provider.enabled === false ? (
                            <button
                              type="button"
                              disabled={busy || !adminConfigured}
                              onClick={() => void runAction(id, "enable")}
                              className="rounded border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-emerald-100 disabled:opacity-50"
                            >
                              Enable
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy || !adminConfigured}
                              onClick={() => void runAction(id, "disable")}
                              className="rounded border border-amber-300/35 bg-amber-500/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-amber-100 disabled:opacity-50"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      </div>
                      {provider.display_name ? (
                        <p className="mt-1 text-xs text-neural-text-muted">{provider.display_name}</p>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </StateCard>

          <StateCard title={`Runtime providers (${runtimeProviders.length})`}>
            <div className="space-y-2">
              {runtimeProviders.length === 0 ? (
                <p className="text-sm text-neural-text-muted">No runtime providers configured yet.</p>
              ) : (
                runtimeProviders.map((provider) => {
                  const id = String(provider.provider_id || "");
                  const busy = busyId === id;
                  return (
                    <article
                      key={id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neural-text-secondary"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-neural-text-primary">{id}</span>
                          <Badge variant="live">runtime</Badge>
                          <Badge variant={provider.enabled === false ? "inactive" : "success"}>
                            {provider.enabled === false ? "disabled" : "enabled"}
                          </Badge>
                          <Badge variant={secretBadgeVariant(provider.secret_status)}>
                            secret: {secretStatusLabel(provider.secret_status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || !adminConfigured}
                            onClick={() => startEdit(provider)}
                            className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-neural-text-primary disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy || !adminConfigured}
                            onClick={() => void runAction(id, "test")}
                            className="rounded border border-neural-cyan/35 bg-neural-cyan/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-neural-cyan disabled:opacity-50"
                          >
                            Test
                          </button>
                          {provider.enabled === false ? (
                            <button
                              type="button"
                              disabled={busy || !adminConfigured}
                              onClick={() => void runAction(id, "enable")}
                              className="rounded border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-emerald-100 disabled:opacity-50"
                            >
                              Enable
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy || !adminConfigured}
                              onClick={() => void runAction(id, "disable")}
                              className="rounded border border-amber-300/35 bg-amber-500/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-amber-100 disabled:opacity-50"
                            >
                              Disable
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy || !adminConfigured}
                            onClick={() => {
                              if (window.confirm(`Delete runtime provider "${id}"?`)) {
                                void runAction(id, "delete");
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded border border-neural-red/35 bg-neural-red/12 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-rose-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                      {provider.display_name ? (
                        <p className="mt-1 text-xs text-neural-text-muted">{provider.display_name}</p>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </StateCard>
        </>
      ) : null}

      <Drawer
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Add runtime provider"
        description="Create an OpenAI-compatible provider. Credentials remain transient in the browser."
        size="xl"
      >
          <form onSubmit={(event) => void handleCreate(event)} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>provider_id</span>
              <input
                required
                value={createForm.provider_id}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, provider_id: event.target.value }))}
                placeholder="my-openai-proxy"
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>display_name</span>
              <input
                required
                value={createForm.display_name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, display_name: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary md:col-span-2">
              <span>base_url</span>
              <input
                required
                value={createForm.base_url}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, base_url: event.target.value }))}
                placeholder="https://api.example.com"
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>api_key_mode</span>
              <select
                value={createForm.api_key_mode}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    api_key_mode: event.target.value as ProviderFormState["api_key_mode"]
                  }))
                }
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              >
                <option value="env">env</option>
                <option value="secret_file">secret_file</option>
                <option value="none">none</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>api_key_env_name</span>
              <input
                value={createForm.api_key_env_name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, api_key_env_name: event.target.value }))}
                placeholder="MY_PROVIDER_API_KEY"
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary md:col-span-2">
              <span>api_key (optional, transient — not stored in browser)</span>
              <input
                type="password"
                value={createForm.api_key}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, api_key: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>health_check_model</span>
              <input
                value={createForm.health_check_model}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, health_check_model: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>default_timeout_seconds</span>
              <input
                value={createForm.default_timeout_seconds}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, default_timeout_seconds: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !adminConfigured || BUILTIN_IDS.has(createForm.provider_id.trim().toLowerCase())}
                className="rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create provider"}
              </button>
            </div>
          </form>
      </Drawer>

      <Drawer
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title={`Edit runtime provider${editId ? `: ${editId}` : ""}`}
        description="Update routing metadata or submit a replacement credential."
        size="xl"
      >
          <form onSubmit={(event) => void handleUpdate(event)} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs text-neural-text-secondary md:col-span-2">
              <span>display_name</span>
              <input
                required
                value={editForm.display_name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, display_name: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary md:col-span-2">
              <span>base_url</span>
              <input
                required
                value={editForm.base_url}
                onChange={(event) => setEditForm((prev) => ({ ...prev, base_url: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>api_key_mode</span>
              <select
                value={editForm.api_key_mode}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    api_key_mode: event.target.value as ProviderFormState["api_key_mode"]
                  }))
                }
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              >
                <option value="env">env</option>
                <option value="secret_file">secret_file</option>
                <option value="none">none</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary">
              <span>api_key_env_name</span>
              <input
                value={editForm.api_key_env_name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, api_key_env_name: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-neural-text-secondary md:col-span-2">
              <span>Replace api_key (optional)</span>
              <input
                type="password"
                value={editForm.api_key}
                onChange={(event) => setEditForm((prev) => ({ ...prev, api_key: event.target.value }))}
                className="w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !adminConfigured}
                className="rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary"
              >
                Cancel
              </button>
            </div>
          </form>
      </Drawer>
    </MotionPage>
  );
}
