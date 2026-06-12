"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import {
  RuntimeProviderForm,
  buildCreatePayload,
  buildUpdatePayload,
  EMPTY_PROVIDER_FORM,
  formStateFromDetail,
  type ProviderFormState
} from "@/components/providers/runtime-provider-form";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ErrorBanner } from "@/components/ui/error-banner";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadingBlock } from "@/components/ui/loading-block";
import { ProviderBadge } from "@/components/ui/provider-badge";
import { RequestIdTag } from "@/components/ui/request-id-tag";
import { SecretStatusBadge } from "@/components/ui/secret-status-badge";
import { StateCard } from "@/components/ui/state-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  createRuntimeOpenAIProvider,
  deleteRuntimeProvider,
  disableRuntimeProvider,
  enableRuntimeProvider,
  fetchRuntimeProvider,
  fetchRuntimeProviders,
  testRuntimeProvider,
  updateRuntimeProvider
} from "@/lib/runtime-providers/client";
import type { GatewayProviderCapability, RuntimeProviderTestResponse } from "@/lib/runtime-providers/types";

type ConsoleError = {
  code: string;
  message: string;
  details?: { request_id?: string };
};

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
};

type TestResultView = {
  providerId: string;
  status: string;
  outputPreview?: string;
  outputChars?: number;
  warnings: string[];
  requestId?: string;
};

const BUILTIN_IDS = new Set(["groq", "openrouter", "nvidia", "nvidia_nim", "deepseek", "ollama_cloud"]);

function isRuntimeProvider(provider: GatewayProviderCapability): boolean {
  return String(provider.source || "").trim().toLowerCase() === "runtime";
}

export default function RuntimeProvidersSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<GatewayProviderCapability[]>([]);
  const [error, setError] = useState<ConsoleError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<ProviderFormState>(EMPTY_PROVIDER_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProviderFormState>(EMPTY_PROVIDER_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editLoadError, setEditLoadError] = useState<ConsoleError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResultView | null>(null);

  const adminConfigured = Boolean(
    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured
  );

  const runtimeProviders = useMemo(() => providers.filter(isRuntimeProvider), [providers]);
  const builtinProviders = useMemo(() => providers.filter((item) => !isRuntimeProvider(item)), [providers]);

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

  const closeCreateDrawer = () => {
    setShowCreateForm(false);
    setCreateForm(EMPTY_PROVIDER_FORM);
  };

  const closeEditDrawer = () => {
    setEditId(null);
    setEditForm(EMPTY_PROVIDER_FORM);
    setEditLoadError(null);
    setEditLoading(false);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    setRequestId(null);
    setTestResult(null);
    try {
      const payload = await createRuntimeOpenAIProvider(buildCreatePayload(createForm));
      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);
      setNotice(`Runtime provider "${payload.provider_id || createForm.provider_id}" created.`);
      closeCreateDrawer();
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

  const startEdit = async (providerId: string) => {
    setEditId(providerId);
    setEditLoading(true);
    setEditLoadError(null);
    setEditForm(EMPTY_PROVIDER_FORM);
    try {
      const detail = await fetchRuntimeProvider(providerId);
      const provider = (detail.provider || detail) as Record<string, unknown>;
      setEditForm(formStateFromDetail(provider, providerId));
      if (typeof detail.request_id === "string") {
        setRequestId(detail.request_id);
      }
    } catch (caught) {
      const err = caught as Error & { code?: string; details?: { request_id?: string } };
      setEditLoadError({
        code: String(err.code || "unknown_error"),
        message: err.message || "Failed to load provider details.",
        details: err.details
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    setRequestId(null);
    setTestResult(null);
    try {
      const payload = await updateRuntimeProvider(editId, buildUpdatePayload(editForm));
      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);
      setNotice(`Runtime provider "${editId}" updated.`);
      closeEditDrawer();
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
    if (action !== "test") {
      setTestResult(null);
    }
    try {
      let payload: RuntimeProviderTestResponse | Awaited<ReturnType<typeof deleteRuntimeProvider>>;
      if (action === "test") payload = await testRuntimeProvider(providerId);
      else if (action === "enable") payload = await enableRuntimeProvider(providerId);
      else if (action === "disable") payload = await disableRuntimeProvider(providerId);
      else payload = await deleteRuntimeProvider(providerId);

      const nextRequestId = typeof payload.request_id === "string" ? payload.request_id : null;
      setRequestId(nextRequestId);

      if (action === "test") {
        const testPayload = payload as RuntimeProviderTestResponse;
        setTestResult({
          providerId,
          status: String(testPayload.extra?.status || (testPayload.ok ? "ok" : "failed")),
          outputPreview:
            typeof testPayload.extra?.output_preview === "string" ? testPayload.extra.output_preview : undefined,
          outputChars:
            typeof testPayload.extra?.output_chars === "number" ? testPayload.extra.output_chars : undefined,
          warnings: Array.isArray(testPayload.warnings) ? testPayload.warnings.map(String) : [],
          requestId: nextRequestId || undefined
        });
        setNotice(`Test completed for "${providerId}".`);
      } else if (action === "delete") {
        setNotice(`Runtime provider "${providerId}" deleted.`);
        if (editId === providerId) closeEditDrawer();
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

  const renderProviderRow = (provider: GatewayProviderCapability, runtime: boolean) => {
    const id = String(provider.provider_id || "");
    const busy = busyId === id;

    return (
      <GlassCard key={id} className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-neural-text-primary">{id}</span>
            <ProviderBadge provider={id} source={runtime ? "runtime" : "builtin"} />
            <StatusPill tone={provider.enabled === false ? "inactive" : "success"}>
              {provider.enabled === false ? "disabled" : "enabled"}
            </StatusPill>
            <SecretStatusBadge status={provider.secret_status} />
          </div>
          <div className="flex flex-wrap gap-2">
            {runtime ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !adminConfigured}
                onClick={() => void startEdit(id)}
                className="px-3 py-1.5 text-[11px]"
              >
                Edit
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !adminConfigured}
              onClick={() => void runAction(id, "test")}
              className="px-3 py-1.5 text-[11px]"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
            </Button>
            {provider.enabled === false ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !adminConfigured}
                onClick={() => void runAction(id, "enable")}
                className="px-3 py-1.5 text-[11px]"
              >
                Enable
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !adminConfigured}
                onClick={() => void runAction(id, "disable")}
                className="px-3 py-1.5 text-[11px]"
              >
                Disable
              </Button>
            )}
            {runtime ? (
              <Button
                type="button"
                variant="danger"
                disabled={busy || !adminConfigured}
                onClick={() => {
                  if (window.confirm(`Delete runtime provider "${id}"?`)) {
                    void runAction(id, "delete");
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
        {provider.display_name ? (
          <p className="mt-2 text-xs text-neural-text-muted">{provider.display_name}</p>
        ) : null}
      </GlassCard>
    );
  };

  return (
    <MotionPage>
      <PageHeader
        title="Runtime Providers"
        description="Manage OpenAI-compatible runtime providers through protected server routes. Submitted API keys are never echoed back."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={() => void loadProviders()}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!adminConfigured}
              onClick={() => {
                setCreateForm(EMPTY_PROVIDER_FORM);
                setShowCreateForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add runtime provider
            </Button>
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
          {error.code === "internal_admin_not_configured" ||
          error.code === "internal_admin_invalid" ||
          error.code === "console_client_unauthorized" ||
          error.code === "console_client_auth_failed" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              Update internal admin or console client settings in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
          {error.code === "runtime_providers_disabled" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              Runtime provider CRUD may still work for preconfiguration, but routing/tests can fail while disabled on
              Gateway.
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

      {testResult ? (
        <StateCard title={`Test result: ${testResult.providerId}`}>
          <div className="space-y-2 text-sm text-neural-text-secondary">
            <p>
              Status: <span className="font-mono text-neural-text-primary">{testResult.status}</span>
            </p>
            {testResult.outputPreview ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-neural-text-primary">
                {testResult.outputPreview}
              </p>
            ) : null}
            {typeof testResult.outputChars === "number" ? (
              <p className="text-xs text-neural-text-muted">Output chars: {testResult.outputChars}</p>
            ) : null}
            {testResult.warnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-100">
                {testResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <RequestIdTag requestId={testResult.requestId} />
          </div>
        </StateCard>
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
                builtinProviders.map((provider) => renderProviderRow(provider, false))
              )}
            </div>
          </StateCard>

          <StateCard title={`Runtime providers (${runtimeProviders.length})`}>
            <div className="space-y-2">
              {runtimeProviders.length === 0 ? (
                <p className="text-sm text-neural-text-muted">No runtime providers configured yet.</p>
              ) : (
                runtimeProviders.map((provider) => renderProviderRow(provider, true))
              )}
            </div>
          </StateCard>
        </>
      ) : null}

      <Drawer
        open={showCreateForm}
        onClose={closeCreateDrawer}
        title="Add runtime provider"
        description="Create an OpenAI-compatible provider. Credentials remain transient in the browser."
        size="xl"
      >
        <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <RuntimeProviderForm mode="create" form={createForm} onChange={setCreateForm} disabled={saving} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={
                saving || !adminConfigured || BUILTIN_IDS.has(createForm.provider_id.trim().toLowerCase())
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create provider"}
            </Button>
            <Button type="button" variant="secondary" onClick={closeCreateDrawer}>
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(editId)}
        onClose={closeEditDrawer}
        title={`Edit runtime provider${editId ? `: ${editId}` : ""}`}
        description="Update routing metadata or submit a replacement credential."
        size="xl"
      >
        {editLoading ? <LoadingBlock label="Loading provider details..." /> : null}
        {editLoadError ? (
          <ErrorBanner code={editLoadError.code} message={editLoadError.message}>
            <RequestIdTag requestId={editLoadError.details?.request_id} />
          </ErrorBanner>
        ) : null}
        {!editLoading && !editLoadError ? (
          <form onSubmit={(event) => void handleUpdate(event)} className="space-y-4">
            <RuntimeProviderForm mode="edit" form={editForm} onChange={setEditForm} disabled={saving} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={saving || !adminConfigured}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeEditDrawer}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </MotionPage>
  );
}
