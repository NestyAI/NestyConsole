"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";

import { OrchestrationRoleEditor } from "@/components/model-configs/orchestration-role-editor";
import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Panel } from "@/components/ui/panel";
import { TerminalBlock } from "@/components/ui/terminal-block";
import { TokenTag } from "@/components/ui/token-tag";
import {
  getModelConfig,
  listModelConfigs,
  redactSensitiveModelConfig,
  resetModelConfig,
  updateModelConfig,
  type ModelConfigConsoleError,
  type ModelConfigDetailView,
  type ModelConfigListItem
} from "@/lib/model-configs/client";
import { fetchRuntimeProviders } from "@/lib/runtime-providers/client";
import { fetchBuiltinProviders } from "@/lib/builtin-providers/client";
import {
  sanitizeChainItems,
  toEditableItem,
  providerChainSummary,
  type EditableChainItem
} from "@/lib/model-configs/chain-utils";
import {
  findProviderCapability,
  normalizeProvider,
  OLLAMA_CLOUD_MODEL_EXAMPLES,
  providerBadgeVariant,
  providerChainWarnings,
  providerDisplayName
} from "@/lib/model-configs/provider-catalog-utils";
import type { GatewayProviderCapability } from "@/lib/runtime-providers/types";
import { safeStringify } from "@/lib/security/redact";

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
  internal_admin_enabled_source: "stored" | "env";
  internal_admin_token_source: "stored" | "env" | "missing";
};

const DEFAULT_ALIASES = ["nesty-flash-1.0", "nesty-combined-1.0", "nesty-pro-1.0"] as const;

function normalizeError(payload: unknown, fallback: string): ModelConfigConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

export default function ModelConfigsPage() {
  const [listItems, setListItems] = useState<ModelConfigListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<ModelConfigConsoleError | null>(null);

  const [selectedAlias, setSelectedAlias] = useState<string>("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<ModelConfigConsoleError | null>(null);
  const [detail, setDetail] = useState<ModelConfigDetailView | null>(null);

  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftProviderChain, setDraftProviderChain] = useState<EditableChainItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);
  const [credentialsError, setCredentialsError] = useState<ModelConfigConsoleError | null>(null);
  const [providerCatalog, setProviderCatalog] = useState<GatewayProviderCapability[]>([]);

  const providerSuggestions = useMemo(
    () =>
      providerCatalog
        .map((item) => String(item.provider_id || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [providerCatalog]
  );

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

  const loadProviderCatalog = useCallback(async () => {
    try {
      const [runtimePayload, builtinPayload] = await Promise.all([
        fetchRuntimeProviders().catch(() => ({ providers: [] as GatewayProviderCapability[] })),
        fetchBuiltinProviders().catch(() => ({ providers: [] as GatewayProviderCapability[] }))
      ]);
      const runtimeList = Array.isArray(runtimePayload.providers) ? runtimePayload.providers : [];
      const builtinList = (Array.isArray(builtinPayload.providers) ? builtinPayload.providers : []).map(
        (provider) =>
          ({
            provider_id: provider.provider_id,
            display_name: provider.display_name,
            source: "builtin" as const,
            provider_type: provider.provider_type,
            enabled: provider.enabled,
            secret_status: provider.secret_status,
            credential_source: provider.credential_source,
            supports_streaming: provider.supports_streaming,
            supports_chat_completions: provider.supports_chat_completions,
            supports_json_mode: provider.supports_json_mode,
            supports_tools: provider.supports_tools,
            supports_reasoning_effort: provider.supports_reasoning_effort,
            health_check_model: provider.health_check_model,
            default_timeout_seconds: provider.default_timeout_seconds,
            api_key_env_name: provider.api_key_env_name
          }) satisfies GatewayProviderCapability
      );
      const merged = new Map<string, GatewayProviderCapability>();
      for (const provider of [...builtinList, ...runtimeList]) {
        const id = String(provider.provider_id || "").trim().toLowerCase();
        if (!id) continue;
        merged.set(id, { ...merged.get(id), ...provider, provider_id: provider.provider_id });
      }
      setProviderCatalog(Array.from(merged.values()));
    } catch {
      setProviderCatalog([]);
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const result = await listModelConfigs();
    if (!result.ok) {
      setListError(result.error);
      setListItems(
        DEFAULT_ALIASES.map((alias) => ({
          modelAlias: alias,
          displayName: alias,
          configSource: "unknown",
          providerChain: [],
          raw: {
            model_alias: alias
          }
        }))
      );
      setListLoading(false);
      return;
    }

    const dynamicList = result.data;
    if (dynamicList.length === 0) {
      setListItems(
        DEFAULT_ALIASES.map((alias) => ({
          modelAlias: alias,
          displayName: alias,
          configSource: "unknown",
          providerChain: [],
          raw: {
            model_alias: alias
          }
        }))
      );
    } else {
      setListItems(dynamicList);
    }
    setListLoading(false);
  }, []);

  const loadDetail = useCallback(async (alias: string) => {
    const safeAlias = alias.trim();
    if (!safeAlias) {
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    setNotice(null);

    const result = await getModelConfig(safeAlias);
    if (!result.ok) {
      setDetailError(result.error);
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    const nextDetail = result.data;
    setDetail(nextDetail);
    setSelectedAlias(nextDetail.modelAlias);
    setDraftDisplayName(nextDetail.displayName || "");
    setDraftNotes(nextDetail.notes || "");
    setDraftProviderChain(nextDetail.providerChain.map((item) => toEditableItem(item)));
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void Promise.all([loadCredentialsView(), loadList(), loadProviderCatalog()]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadCredentialsView, loadList, loadProviderCatalog]);

  useEffect(() => {
    if (!selectedAlias && listItems.length > 0) {
      /* eslint-disable react-hooks/set-state-in-effect */
      void loadDetail(listItems[0].modelAlias);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [listItems, loadDetail, selectedAlias]);

  const refreshAll = async () => {
    await Promise.all([loadCredentialsView(), loadList(), loadProviderCatalog()]);
    if (selectedAlias) {
      await loadDetail(selectedAlias);
    }
  };

  const adminConfigured = Boolean(
    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured
  );

  const modelConfigError = detailError || listError;
  const tokenIssue =
    modelConfigError?.code === "internal_admin_not_configured" ||
    modelConfigError?.code === "internal_admin_invalid";
  const credentialIssue =
    modelConfigError?.code === "credentials_not_configured" ||
    modelConfigError?.code === "invalid_gateway_api_key";

  const rawRedactedConfig = useMemo(() => {
    if (!detail?.effectiveConfig) {
      return null;
    }
    return safeStringify(redactSensitiveModelConfig(detail.effectiveConfig));
  }, [detail]);

  const dirty = useMemo(() => {
    if (!detail) {
      return false;
    }
    const currentChain = JSON.stringify(detail.providerChain);
    const draftChainSafe = sanitizeChainItems(draftProviderChain);
    const draftChain = JSON.stringify(draftChainSafe || []);
    return (
      (detail.displayName || "") !== draftDisplayName ||
      (detail.notes || "") !== draftNotes ||
      currentChain !== draftChain
    );
  }, [detail, draftDisplayName, draftNotes, draftProviderChain]);

  const handleSelectAlias = async (alias: string) => {
    await loadDetail(alias);
  };

  const updateChainItem = (index: number, updater: (prev: EditableChainItem) => EditableChainItem) => {
    setDraftProviderChain((prev) => prev.map((item, idx) => (idx === index ? updater(item) : item)));
  };

  const addChainItem = () => {
    setDraftProviderChain((prev) => [
      ...prev,
      {
        provider: "",
        model: "",
        enabled: true
      }
    ]);
  };

  const removeChainItem = (index: number) => {
    setDraftProviderChain((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveChainItem = (index: number, direction: -1 | 1) => {
    setDraftProviderChain((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const current = copy[index];
      copy[index] = copy[target];
      copy[target] = current;
      return copy;
    });
  };

  const resetDraft = () => {
    if (!detail) {
      return;
    }
    setDraftDisplayName(detail.displayName || "");
    setDraftNotes(detail.notes || "");
    setDraftProviderChain(detail.providerChain.map((item) => toEditableItem(item)));
    setNotice("Reverted unsaved changes.");
  };

  const handleSave = async () => {
    if (!detail) {
      return;
    }
    setSaving(true);
    setNotice(null);
    setDetailError(null);

    const safeProviderChain = sanitizeChainItems(draftProviderChain);
    if (!safeProviderChain) {
      setSaving(false);
      setDetailError({
        code: "invalid_model_config",
        message: "Provider chain entries must have non-empty provider and model fields."
      });
      return;
    }

    const patch = {
      provider_chain: safeProviderChain,
      display_name: draftDisplayName.trim() || undefined,
      notes: draftNotes.trim() || undefined
    };

    const result = await updateModelConfig(detail.modelAlias, patch);
    setSaving(false);
    if (!result.ok) {
      setDetailError(result.error);
      return;
    }
    setNotice("Model config override saved.");
    await Promise.all([loadList(), loadDetail(detail.modelAlias)]);
  };

  const handleResetOverride = async () => {
    if (!detail) {
      return;
    }
    setResetting(true);
    setNotice(null);
    setDetailError(null);
    const result = await resetModelConfig(detail.modelAlias);
    setResetting(false);
    if (!result.ok) {
      setDetailError(result.error);
      return;
    }

    setNotice("Runtime override reset to default.");
    await Promise.all([loadList(), loadDetail(detail.modelAlias)]);
  };

  return (
    <MotionPage>
      <PageHeader
        title="Model Configs"
        description="Runtime model aliases, effective configuration, and governed provider chains."
        actions={
          <Button
            type="button"
            onClick={() => void refreshAll()}
            variant="secondary"
            className="min-h-11"
            disabled={listLoading || detailLoading}
          >
            <RefreshCw className={`h-4 w-4 ${listLoading || detailLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {!adminConfigured ? (
        <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Internal admin token is required for runtime model config admin. Configure it in{" "}
          <Link href="/settings/gateway" className="underline underline-offset-2">
            Settings {"->"} Gateway Credentials
          </Link>
          .
        </div>
      ) : null}

      {credentialsError ? (
        <ErrorBanner code={credentialsError.code} message={credentialsError.message} />
      ) : null}

      {modelConfigError ? (
        <ErrorBanner code={modelConfigError.code} message={modelConfigError.message}>
          {tokenIssue ? (
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
              Check Gateway credentials in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
        </ErrorBanner>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">Model Alias List</h2>
          {listLoading ? <LoadingBlock label="Loading model aliases..." className="p-3 text-xs" /> : null}
          {!listLoading && listItems.length === 0 ? (
            <EmptyState title="No model aliases returned." className="p-3 text-xs" />
          ) : null}
          <div className="neural-scroll max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {listItems.map((item) => {
              const active = item.modelAlias === selectedAlias;
              return (
                <button
                  type="button"
                  key={item.modelAlias}
                  onClick={() => void handleSelectAlias(item.modelAlias)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-neural-cyan/45 bg-neural-cyan/12 text-neural-cyan"
                      : "border-neural-text-muted/25 bg-neural-overlay/35 text-neural-text-primary hover:bg-neural-overlay/55"
                  }`}
                >
                  <p className="font-mono text-xs text-neural-text-code">{item.modelAlias}</p>
                  <p className="mt-1 text-xs text-neural-text-secondary">{item.displayName}</p>
                  <p className="mt-1 text-xs">
                    source: <span className="font-mono">{item.configSource || "unknown"}</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-neural-text-muted">{providerChainSummary(item.providerChain)}</p>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="space-y-4">
          {detailLoading ? (
            <LoadingBlock label="Loading model config..." className="p-3 text-xs" />
          ) : null}

          {!detailLoading && !detail ? (
            <EmptyState title="Select a model alias to inspect runtime configuration." className="p-3 text-xs" />
          ) : null}

          {detail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-neural-text-muted/25 bg-neural-overlay/40 p-3">
                <p className="font-display text-[11px] uppercase tracking-[0.07em] text-neural-text-secondary">Selected alias</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <TokenTag>{detail.modelAlias}</TokenTag>
                  <Badge variant="live">{detail.configSource || "unknown"}</Badge>
                </div>
                <p className="mt-2 text-sm text-neural-text-secondary">Display name: {detail.displayName || "-"}</p>
                <p className="text-sm text-neural-text-secondary">
                  Override status: {detail.overrideConfig ? "override active" : "default only"}
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-neural-text-muted/25 bg-neural-overlay/35 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">Provider Chain Editor</h3>
                  <button
                    type="button"
                    onClick={addChainItem}
                    className="inline-flex items-center gap-1 rounded border border-neural-cyan/35 bg-neural-cyan/10 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-neural-cyan hover:bg-neural-cyan/18"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                {draftProviderChain.length === 0 ? (
                  <p className="text-xs text-slate-300">No provider chain items configured.</p>
                ) : (
                  <div className="neural-scroll space-y-2 overflow-x-auto">
                    {draftProviderChain.map((item, index) => {
                      const capability = findProviderCapability(providerCatalog, item.provider);
                      const chainWarnings = providerChainWarnings(providerCatalog, item.provider);
                      return (
                      <article key={`${item.provider}-${item.model}-${index}`} className="rounded border border-neural-text-muted/25 bg-neural-elevated/70 p-2">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={providerBadgeVariant(normalizeProvider(item.provider))}>
                            {capability?.display_name || providerDisplayName(normalizeProvider(item.provider))}
                          </Badge>
                          {capability?.source === "runtime" ? <Badge variant="live">runtime</Badge> : null}
                          {capability?.source === "builtin" ? <Badge variant="ai">builtin</Badge> : null}
                          {capability?.enabled === false ? <Badge variant="inactive">disabled</Badge> : null}
                          {String(capability?.secret_status || "").toLowerCase() === "missing" ? (
                            <Badge variant="warning">missing secret</Badge>
                          ) : null}
                          {String(capability?.secret_status || "").toLowerCase() === "managed" ? (
                            <Badge variant="warning">managed credential</Badge>
                          ) : null}
                          {normalizeProvider(item.provider) === "ollama_cloud" ? (
                            <span className="text-[11px] text-neural-text-secondary">
                              Examples: {OLLAMA_CLOUD_MODEL_EXAMPLES.join(", ")}
                            </span>
                          ) : null}
                        </div>
                        {chainWarnings.length > 0 ? (
                          <div className="mb-2 space-y-1">
                            {chainWarnings.map((warning) => (
                              <p key={warning} className="text-[11px] text-amber-200">
                                {warning}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        <div className="grid gap-2 md:grid-cols-2">
                          <label className="space-y-1 text-xs text-neural-text-secondary">
                            <span>provider</span>
                            <input
                              list="runtime-provider-suggestions"
                              value={item.provider}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, provider: event.target.value }))
                              }
                              placeholder="groq | openrouter | nvidia | ollama_cloud | runtime-id"
                              className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-neural-text-secondary">
                            <span>model</span>
                            <input
                              value={item.model}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, model: event.target.value }))
                              }
                              className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-neural-text-secondary">
                            <span>timeout_seconds</span>
                            <input
                              value={item.timeout_seconds || ""}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, timeout_seconds: event.target.value }))
                              }
                              className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-neural-text-secondary">
                            <span>max_tokens</span>
                            <input
                              value={item.max_tokens || ""}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, max_tokens: event.target.value }))
                              }
                              className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-neural-text-secondary">
                            <span>temperature</span>
                            <input
                              value={item.temperature || ""}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, temperature: event.target.value }))
                              }
                              className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-neural-text-secondary">
                            <span>enabled</span>
                            <Select
                              value={item.enabled === false ? "false" : "true"}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, enabled: event.target.value !== "false" }))
                              }
                              className="font-mono text-xs py-1"
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </Select>
                          </label>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => moveChainItem(index, -1)}
                            disabled={index === 0}
                            className="rounded border border-neural-text-muted/30 bg-neural-overlay/45 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveChainItem(index, 1)}
                            disabled={index === draftProviderChain.length - 1}
                            className="rounded border border-neural-text-muted/30 bg-neural-overlay/45 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChainItem(index)}
                            className="inline-flex items-center gap-1 rounded border border-neural-red/35 bg-neural-red/12 px-2 py-1 font-display text-[11px] uppercase tracking-[0.06em] text-rose-100 hover:bg-neural-red/22"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </article>
                    );
                    })}
                  </div>
                )}
                <datalist id="runtime-provider-suggestions">
                  {providerSuggestions.map((providerId) => (
                    <option key={providerId} value={providerId} />
                  ))}
                </datalist>
                <p className="text-[11px] text-neural-text-muted">
                  Runtime provider IDs from{" "}
                  <Link href="/settings/providers" className="underline underline-offset-2 hover:text-neural-cyan">
                    Settings {"->"} Runtime Providers
                  </Link>{" "}
                  appear as suggestions. Manual provider ID entry is still supported.
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1 text-xs text-neural-text-secondary">
                  <span>display_name</span>
                  <input
                    value={draftDisplayName}
                    onChange={(event) => setDraftDisplayName(event.target.value)}
                    className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1.5 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs text-neural-text-secondary">
                  <span>notes</span>
                  <input
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1.5 text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                  />
                </label>
              </div>

              <OrchestrationRoleEditor
                modelId={detail.modelAlias}
                providerCatalog={providerCatalog}
                providerSuggestions={providerSuggestions}
                disabled={saving || resetting || !adminConfigured}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void handleSave()} disabled={saving || resetting || !dirty} className="inline-flex items-center gap-2 rounded-lg border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-cyan transition hover:bg-neural-cyan/25 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save override
                </button>
                <button
                  type="button"
                  onClick={resetDraft}
                  disabled={saving || resetting || !dirty}
                  className="inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/30 bg-neural-overlay/45 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:opacity-60"
                >
                  Cancel changes
                </button>
                <ConfirmAction
                  confirmMessage="Reset runtime override for this model alias? This may immediately change live routing behavior."
                  onConfirm={async () => {
                    await handleResetOverride();
                  }}
                  disabled={saving || resetting}
                  className="inline-flex items-center gap-2 rounded-lg border border-neural-amber/40 bg-neural-amber/14 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-amber transition hover:bg-neural-amber/24 disabled:opacity-60"
                >
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Reset override
                </ConfirmAction>
                <button
                  type="button"
                  onClick={() => void loadDetail(detail.modelAlias)}
                  disabled={saving || resetting}
                  className="inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/30 bg-neural-overlay/45 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh detail
                </button>
              </div>

              <details className="rounded-lg border border-neural-text-muted/25 bg-neural-overlay/35 p-3">
                <summary className="cursor-pointer font-display text-sm uppercase tracking-[0.06em] text-neural-text-primary">Raw effective config</summary>
                <TerminalBlock className="mt-2 text-xs">{rawRedactedConfig || "No effective config available."}</TerminalBlock>
              </details>
            </div>
          ) : null}
        </Panel>
      </div>
    </MotionPage>
  );
}
