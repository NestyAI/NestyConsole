"use client";



import Link from "next/link";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { KeyRound, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";



import { MotionPage } from "@/components/motion/motion-page";

import { PageHeader } from "@/components/layout/page-header";

import {

  BuiltinProviderCredentialForm,

  EMPTY_BUILTIN_CREDENTIAL_FORM,

  type BuiltinCredentialFormState

} from "@/components/providers/builtin-provider-credential-form";

import {

  RuntimeProviderForm,

  buildCreatePayload,

  buildUpdatePayload,

  EMPTY_PROVIDER_FORM,

  formStateFromDetail,

  type ProviderFormState

} from "@/components/providers/runtime-provider-form";

import { Badge } from "@/components/ui/badge";

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

  deleteBuiltinProviderApiKey,

  fetchBuiltinProviders,

  rotateBuiltinProviderApiKey,

  testBuiltinProviderApiKey,

  updateBuiltinProviderApiKey

} from "@/lib/builtin-providers/client";

import type { BuiltinProviderCapability } from "@/lib/builtin-providers/types";

import {

  createRuntimeOpenAIProvider,

  deleteRuntimeProvider,

  disableRuntimeProvider,

  enableRuntimeProvider,

  fetchRuntimeProvider,

  fetchRuntimeProviders,

  fetchRuntimeStatus,

  testRuntimeProvider,

  updateRuntimeProvider

} from "@/lib/runtime-providers/client";

import type { GatewayProviderCapability, RuntimeProviderTestResponse } from "@/lib/runtime-providers/types";

import { BUILTIN_PROVIDER_IDS } from "@/lib/builtin-providers/types";



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



const BUILTIN_IDS = new Set<string>(BUILTIN_PROVIDER_IDS);



function isRuntimeProvider(provider: GatewayProviderCapability): boolean {

  return String(provider.source || "").trim().toLowerCase() === "runtime";

}



function providerTypeLabel(provider: BuiltinProviderCapability): string {

  return String(provider.provider_type || "").trim().toLowerCase() === "native"

    ? "Native"

    : "OpenAI-compatible";

}



export default function ProvidersSettingsPage() {

  const [loading, setLoading] = useState(true);

  const [builtinProviders, setBuiltinProviders] = useState<BuiltinProviderCapability[]>([]);

  const [runtimeProviders, setRuntimeProviders] = useState<GatewayProviderCapability[]>([]);

  const [disabledProviders, setDisabledProviders] = useState<Set<string>>(new Set());

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

  const [credentialId, setCredentialId] = useState<string | null>(null);

  const [credentialForm, setCredentialForm] = useState<BuiltinCredentialFormState>(EMPTY_BUILTIN_CREDENTIAL_FORM);

  const [credentialSaving, setCredentialSaving] = useState(false);

  const [credentialRotating, setCredentialRotating] = useState(false);

  const [credentialDeleting, setCredentialDeleting] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [testResult, setTestResult] = useState<TestResultView | null>(null);



  const adminConfigured = Boolean(

    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured

  );



  const credentialProvider = useMemo(

    () => builtinProviders.find((item) => item.provider_id === credentialId) || null,

    [builtinProviders, credentialId]

  );



  const isProviderDisabled = useCallback(

    (providerId: string) => disabledProviders.has(providerId),

    [disabledProviders]

  );



  const loadProviders = useCallback(async () => {

    setLoading(true);

    setError(null);

    setRequestId(null);

    try {

      const [builtinPayload, runtimePayload, statusPayload] = await Promise.all([

        fetchBuiltinProviders(),

        fetchRuntimeProviders(),

        fetchRuntimeStatus()

      ]);

      setBuiltinProviders(Array.isArray(builtinPayload.providers) ? builtinPayload.providers : []);

      const runtimeList = Array.isArray(runtimePayload.providers) ? runtimePayload.providers : [];

      setRuntimeProviders(runtimeList.filter(isRuntimeProvider));

      setDisabledProviders(new Set((statusPayload.disabled_providers || []).map(String)));

      setRequestId(

        typeof builtinPayload.request_id === "string"

          ? builtinPayload.request_id

          : typeof runtimePayload.request_id === "string"

            ? runtimePayload.request_id

            : null

      );

    } catch (caught) {

      const err = caught as Error & { code?: string; details?: { request_id?: string } };

      setError({

        code: String(err.code || "unknown_error"),

        message: err.message || "Failed to load providers.",

        details: err.details

      });

      setBuiltinProviders([]);

      setRuntimeProviders([]);

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



  const closeCredentialDrawer = () => {

    setCredentialId(null);

    setCredentialForm(EMPTY_BUILTIN_CREDENTIAL_FORM);

    setCredentialSaving(false);

    setCredentialRotating(false);

    setCredentialDeleting(false);

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



  const runRuntimeAction = async (providerId: string, action: "test" | "enable" | "disable" | "delete") => {

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

        setNotice(`Provider "${providerId}" ${action}d.`);

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



  const runBuiltinTest = async (providerId: string) => {

    setBusyId(providerId);

    setError(null);

    setNotice(null);

    setRequestId(null);

    try {

      const payload = await testBuiltinProviderApiKey(providerId);

      const nextRequestId = typeof payload.request_id === "string" ? payload.request_id : null;

      setRequestId(nextRequestId);

      const result = payload.test_result || {};

      setTestResult({

        providerId,

        status: String(result.status || (result.ok ? "ok" : "failed")),

        outputPreview: typeof result.output_preview === "string" ? result.output_preview : undefined,

        outputChars: typeof result.output_chars === "number" ? result.output_chars : undefined,

        warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],

        requestId: nextRequestId || undefined

      });

      setNotice(`Credential test completed for "${providerId}".`);

    } catch (caught) {

      const err = caught as Error & { code?: string; details?: { request_id?: string } };

      setError({

        code: String(err.code || "unknown_error"),

        message: err.message || "Built-in provider test failed.",

        details: err.details

      });

    } finally {

      setBusyId(null);

    }

  };



  const handleCredentialSave = async (event: FormEvent) => {

    event.preventDefault();

    if (!credentialId) return;

    setCredentialSaving(true);

    setError(null);

    setNotice(null);

    try {

      const payload = await updateBuiltinProviderApiKey(credentialId, { api_key: credentialForm.apiKey });

      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);

      setNotice(`Managed API key saved for "${credentialId}".`);

      setCredentialForm(EMPTY_BUILTIN_CREDENTIAL_FORM);

      await loadProviders();

    } catch (caught) {

      const err = caught as Error & { code?: string; details?: { request_id?: string } };

      setError({

        code: String(err.code || "unknown_error"),

        message: err.message || "Failed to save built-in provider API key.",

        details: err.details

      });

    } finally {

      setCredentialSaving(false);

    }

  };



  const handleCredentialRotate = async (event: FormEvent) => {

    event.preventDefault();

    if (!credentialId) return;

    setCredentialRotating(true);

    setError(null);

    setNotice(null);

    try {

      const payload = await rotateBuiltinProviderApiKey(credentialId, { api_key: credentialForm.apiKey });

      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);

      setNotice(`Managed API key rotated for "${credentialId}".`);

      setCredentialForm(EMPTY_BUILTIN_CREDENTIAL_FORM);

      await loadProviders();

    } catch (caught) {

      const err = caught as Error & { code?: string; details?: { request_id?: string } };

      setError({

        code: String(err.code || "unknown_error"),

        message: err.message || "Failed to rotate built-in provider API key.",

        details: err.details

      });

    } finally {

      setCredentialRotating(false);

    }

  };



  const handleCredentialDelete = async () => {

    if (!credentialId) return;

    if (!window.confirm(`Delete managed API key for "${credentialId}"? Gateway will fall back per credential priority.`)) {

      return;

    }

    setCredentialDeleting(true);

    setError(null);

    setNotice(null);

    try {

      const payload = await deleteBuiltinProviderApiKey(credentialId);

      setRequestId(typeof payload.request_id === "string" ? payload.request_id : null);

      setNotice(`Managed API key removed for "${credentialId}".`);

      setCredentialForm(EMPTY_BUILTIN_CREDENTIAL_FORM);

      await loadProviders();

    } catch (caught) {

      const err = caught as Error & { code?: string; details?: { request_id?: string } };

      setError({

        code: String(err.code || "unknown_error"),

        message: err.message || "Failed to delete managed API key.",

        details: err.details

      });

    } finally {

      setCredentialDeleting(false);

    }

  };



  const renderBuiltinRow = (provider: BuiltinProviderCapability) => {

    const id = String(provider.provider_id || "");

    const busy = busyId === id;

    const disabled = isProviderDisabled(id);



    return (

      <GlassCard key={id} className="p-4">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex flex-wrap items-center gap-2">

            <span className="font-mono text-sm text-neural-text-primary">{id}</span>

            <ProviderBadge provider={id} source="builtin" />

            <Badge variant="ai">{providerTypeLabel(provider)}</Badge>

            <StatusPill tone={disabled ? "inactive" : "success"}>{disabled ? "routing off" : "routing on"}</StatusPill>

            <SecretStatusBadge status={provider.secret_status} />

            {provider.credential_source ? (

              <Badge variant="inactive">{String(provider.credential_source)}</Badge>

            ) : null}

          </div>

          <div className="flex flex-wrap gap-2">

            <Button

              type="button"

              variant="secondary"

              disabled={busy || !adminConfigured}

              onClick={() => {

                setCredentialForm(EMPTY_BUILTIN_CREDENTIAL_FORM);

                setCredentialId(id);

              }}

              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px]"

            >

              <KeyRound className="h-3.5 w-3.5" />

              Credentials

            </Button>

            <Button

              type="button"

              variant="secondary"

              disabled={busy || !adminConfigured}

              onClick={() => void runBuiltinTest(id)}

              className="px-3 py-1.5 text-[11px]"

            >

              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}

            </Button>

            {disabled ? (

              <Button

                type="button"

                variant="secondary"

                disabled={busy || !adminConfigured}

                onClick={() => void runRuntimeAction(id, "enable")}

                className="px-3 py-1.5 text-[11px]"

              >

                Enable routing

              </Button>

            ) : (

              <Button

                type="button"

                variant="secondary"

                disabled={busy || !adminConfigured}

                onClick={() => void runRuntimeAction(id, "disable")}

                className="px-3 py-1.5 text-[11px]"

              >

                Disable routing

              </Button>

            )}

          </div>

        </div>

        {provider.display_name ? (

          <p className="mt-2 text-xs text-neural-text-muted">{provider.display_name}</p>

        ) : null}

        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neural-text-muted">

          {provider.supports_streaming ? <span>streaming</span> : null}

          {provider.supports_tools ? <span>tools</span> : null}

          {provider.supports_json_mode ? <span>json</span> : null}

        </div>

      </GlassCard>

    );

  };



  const renderRuntimeRow = (provider: GatewayProviderCapability) => {

    const id = String(provider.provider_id || "");

    const busy = busyId === id;



    return (

      <GlassCard key={id} className="p-4">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex flex-wrap items-center gap-2">

            <span className="font-mono text-sm text-neural-text-primary">{id}</span>

            <ProviderBadge provider={id} source="runtime" />

            <StatusPill tone={provider.enabled === false ? "inactive" : "success"}>

              {provider.enabled === false ? "disabled" : "enabled"}

            </StatusPill>

            <SecretStatusBadge status={provider.secret_status} />

          </div>

          <div className="flex flex-wrap gap-2">

            <Button

              type="button"

              variant="secondary"

              disabled={busy || !adminConfigured}

              onClick={() => void startEdit(id)}

              className="px-3 py-1.5 text-[11px]"

            >

              Edit

            </Button>

            <Button

              type="button"

              variant="secondary"

              disabled={busy || !adminConfigured}

              onClick={() => void runRuntimeAction(id, "test")}

              className="px-3 py-1.5 text-[11px]"

            >

              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}

            </Button>

            {provider.enabled === false ? (

              <Button

                type="button"

                variant="secondary"

                disabled={busy || !adminConfigured}

                onClick={() => void runRuntimeAction(id, "enable")}

                className="px-3 py-1.5 text-[11px]"

              >

                Enable

              </Button>

            ) : (

              <Button

                type="button"

                variant="secondary"

                disabled={busy || !adminConfigured}

                onClick={() => void runRuntimeAction(id, "disable")}

                className="px-3 py-1.5 text-[11px]"

              >

                Disable

              </Button>

            )}

            <Button

              type="button"

              variant="danger"

              disabled={busy || !adminConfigured}

              onClick={() => {

                if (window.confirm(`Delete runtime provider "${id}"?`)) {

                  void runRuntimeAction(id, "delete");

                }

              }}

              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px]"

            >

              <Trash2 className="h-3.5 w-3.5" />

              Delete

            </Button>

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

        title="Providers"

        description="Built-in Gateway providers and runtime OpenAI-compatible providers. API keys are never echoed after save."

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

          {error.code === "provider_credentials_disabled" ? (

            <p className="mt-2 text-xs text-neural-text-secondary">

              Enable NESTY_PROVIDER_CREDENTIALS_ENABLED on Gateway to store managed built-in provider keys.

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



      {loading ? <LoadingBlock label="Loading providers..." /> : null}



      {!loading ? (

        <>

          <StateCard title={`Built-in providers (${builtinProviders.length})`}>

            <p className="mb-3 text-xs text-neural-text-secondary">

              Built-in provider definitions are immutable. Manage credentials and routing only.

            </p>

            <div className="space-y-2">

              {builtinProviders.length === 0 ? (

                <p className="text-sm text-neural-text-muted">No built-in providers returned.</p>

              ) : (

                builtinProviders.map((provider) => renderBuiltinRow(provider))

              )}

            </div>

          </StateCard>



          <StateCard title={`Runtime OpenAI-compatible providers (${runtimeProviders.length})`}>

            <div className="space-y-2">

              {runtimeProviders.length === 0 ? (

                <p className="text-sm text-neural-text-muted">No runtime providers configured yet.</p>

              ) : (

                runtimeProviders.map((provider) => renderRuntimeRow(provider))

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



      <Drawer

        open={Boolean(credentialId && credentialProvider)}

        onClose={closeCredentialDrawer}

        title={credentialProvider ? `Built-in credentials: ${credentialProvider.provider_id}` : "Built-in credentials"}

        description="Store or rotate managed API keys through Gateway. Secrets are never shown after save."

        size="lg"

      >

        {credentialProvider ? (

          <BuiltinProviderCredentialForm

            provider={credentialProvider}

            form={credentialForm}

            onChange={setCredentialForm}

            onSubmit={(event) => void handleCredentialSave(event)}

            onRotate={(event) => void handleCredentialRotate(event)}

            onDeleteManaged={() => void handleCredentialDelete()}

            disabled={!adminConfigured}

            saving={credentialSaving}

            rotating={credentialRotating}

            deleting={credentialDeleting}

          />

        ) : null}

      </Drawer>

    </MotionPage>

  );

}


