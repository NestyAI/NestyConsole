"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";

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
import type { GatewayProviderChainItem } from "@/lib/gateway/types";

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
  internal_admin_enabled_source: "stored" | "env";
  internal_admin_token_source: "stored" | "env" | "missing";
};

const DEFAULT_ALIASES = ["nesty-flash-1.0", "nesty-combined-1.0", "nesty-pro-1.0"] as const;
const SECRET_LIKE_PATTERN = /(key|token|secret|password|auth|credential)/i;

type EditableChainItem = {
  provider: string;
  model: string;
  enabled?: boolean;
  timeout_seconds?: string;
  max_tokens?: string;
  temperature?: string;
  base_url?: string;
  label?: string;
  name?: string;
};

function normalizeError(payload: unknown, fallback: string): ModelConfigConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value.trim());
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function toEditableItem(raw: GatewayProviderChainItem): EditableChainItem {
  return {
    provider: String(raw.provider || ""),
    model: String(raw.model || ""),
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : undefined,
    timeout_seconds: raw.timeout_seconds !== undefined ? String(raw.timeout_seconds) : undefined,
    max_tokens: raw.max_tokens !== undefined ? String(raw.max_tokens) : undefined,
    temperature: raw.temperature !== undefined ? String(raw.temperature) : undefined,
    base_url: typeof raw.base_url === "string" ? raw.base_url : undefined,
    label: typeof raw.label === "string" ? raw.label : undefined,
    name: typeof raw.name === "string" ? raw.name : undefined
  };
}

function sanitizeChainItems(items: EditableChainItem[]): GatewayProviderChainItem[] | null {
  const output: GatewayProviderChainItem[] = [];

  for (const item of items) {
    const provider = item.provider.trim();
    const model = item.model.trim();
    if (!provider || !model) {
      return null;
    }
    if (SECRET_LIKE_PATTERN.test(provider) || SECRET_LIKE_PATTERN.test(model)) {
      return null;
    }

    const next: GatewayProviderChainItem = {
      provider,
      model
    };

    if (typeof item.enabled === "boolean") {
      next.enabled = item.enabled;
    }

    const timeout = parseOptionalNumber(item.timeout_seconds);
    if (timeout !== undefined) {
      next.timeout_seconds = timeout;
    }
    const maxTokens = parseOptionalNumber(item.max_tokens);
    if (maxTokens !== undefined) {
      next.max_tokens = maxTokens;
    }
    const temperature = parseOptionalNumber(item.temperature);
    if (temperature !== undefined) {
      next.temperature = temperature;
    }
    const baseUrl = item.base_url?.trim();
    if (baseUrl) {
      next.base_url = baseUrl;
    }
    const label = item.label?.trim();
    if (label) {
      next.label = label;
    }
    const name = item.name?.trim();
    if (name) {
      next.name = name;
    }
    output.push(next);
  }

  return output;
}

function providerChainSummary(chain: GatewayProviderChainItem[]): string {
  if (!chain.length) {
    return "No provider chain";
  }
  return chain.map((item) => `${String(item.provider || "-")}:${String(item.model || "-")}`).join(" -> ");
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
    void Promise.all([loadCredentialsView(), loadList()]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadCredentialsView, loadList]);

  useEffect(() => {
    if (!selectedAlias && listItems.length > 0) {
      /* eslint-disable react-hooks/set-state-in-effect */
      void loadDetail(listItems[0].modelAlias);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [listItems, loadDetail, selectedAlias]);

  const refreshAll = async () => {
    await Promise.all([loadCredentialsView(), loadList()]);
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
    try {
      return JSON.stringify(redactSensitiveModelConfig(detail.effectiveConfig), null, 2);
    } catch {
      return null;
    }
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
    const confirmed = window.confirm("Reset runtime override for this model alias?");
    if (!confirmed) {
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Model Configs</h1>
          <p className="text-sm text-slate-300">Runtime model alias configuration and provider chains.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
          disabled={listLoading || detailLoading}
        >
          <RefreshCw className={`h-4 w-4 ${listLoading || detailLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">{credentialsError.code}</p>
          <p className="mt-1">{credentialsError.message}</p>
        </div>
      ) : null}

      {modelConfigError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">{modelConfigError.code}</p>
          <p className="mt-1">{modelConfigError.message}</p>
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
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Model Alias List</h2>
          {listLoading ? <p className="text-sm text-slate-300">Loading model aliases...</p> : null}
          {!listLoading && listItems.length === 0 ? (
            <p className="text-sm text-slate-300">No model aliases returned.</p>
          ) : null}
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {listItems.map((item) => {
              const active = item.modelAlias === selectedAlias;
              return (
                <button
                  type="button"
                  key={item.modelAlias}
                  onClick={() => void handleSelectAlias(item.modelAlias)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    active
                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  }`}
                >
                  <p className="text-sm font-medium">{item.modelAlias}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.displayName}</p>
                  <p className="mt-1 text-xs">
                    source: <span className="font-medium">{item.configSource || "unknown"}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{providerChainSummary(item.providerChain)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading model config...
            </div>
          ) : null}

          {!detailLoading && !detail ? (
            <p className="text-sm text-slate-300">Select a model alias to inspect runtime configuration.</p>
          ) : null}

          {detail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Selected alias</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{detail.modelAlias}</h2>
                <p className="mt-1 text-sm text-slate-300">Display name: {detail.displayName || "-"}</p>
                <p className="text-sm text-slate-300">Config source: {detail.configSource || "unknown"}</p>
                <p className="text-sm text-slate-300">
                  Override status: {detail.overrideConfig ? "override active" : "default only"}
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Provider Chain Editor</h3>
                  <button
                    type="button"
                    onClick={addChainItem}
                    className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                {draftProviderChain.length === 0 ? (
                  <p className="text-xs text-slate-300">No provider chain items configured.</p>
                ) : (
                  <div className="space-y-2">
                    {draftProviderChain.map((item, index) => (
                      <article key={`${item.provider}-${item.model}-${index}`} className="rounded border border-white/10 bg-surface-950/50 p-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>provider</span>
                            <input
                              value={item.provider}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, provider: event.target.value }))
                              }
                              className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>model</span>
                            <input
                              value={item.model}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, model: event.target.value }))
                              }
                              className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>timeout_seconds</span>
                            <input
                              value={item.timeout_seconds || ""}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, timeout_seconds: event.target.value }))
                              }
                              className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>max_tokens</span>
                            <input
                              value={item.max_tokens || ""}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, max_tokens: event.target.value }))
                              }
                              className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>temperature</span>
                            <input
                              value={item.temperature || ""}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, temperature: event.target.value }))
                              }
                              className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-slate-300">
                            <span>enabled</span>
                            <select
                              value={item.enabled === false ? "false" : "true"}
                              onChange={(event) =>
                                updateChainItem(index, (prev) => ({ ...prev, enabled: event.target.value !== "false" }))
                              }
                              className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1 text-xs text-white"
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          </label>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => moveChainItem(index, -1)}
                            disabled={index === 0}
                            className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-50"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveChainItem(index, 1)}
                            disabled={index === draftProviderChain.length - 1}
                            className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-50"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChainItem(index)}
                            className="inline-flex items-center gap-1 rounded border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-100 hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-300">
                  <span>display_name</span>
                  <input
                    value={draftDisplayName}
                    onChange={(event) => setDraftDisplayName(event.target.value)}
                    className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-300">
                  <span>notes</span>
                  <input
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    className="w-full rounded border border-white/15 bg-surface-950/70 px-2 py-1.5 text-xs text-white"
                  />
                </label>
              </div>

              <article className="rounded-lg border border-white/10 bg-white/5 p-3">
                <h3 className="text-sm font-semibold text-white">Nesty Pro Orchestration Roles</h3>
                {Object.keys(detail.orchestrationRoles || {}).length === 0 ? (
                  <p className="mt-2 text-xs text-slate-300">No orchestration roles found.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {Object.entries(detail.orchestrationRoles).map(([roleName, roleValue]) => (
                      <div key={roleName} className="rounded border border-white/10 bg-surface-950/50 p-2 text-xs text-slate-200">
                        <p className="font-medium text-white">{roleName}</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-slate-300">
                          {JSON.stringify(redactSensitiveModelConfig(roleValue), null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  Role configs are read-only in v0.5.0 for safety. Main alias provider_chain editor is supported.
                </p>
              </article>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || resetting || !dirty}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save override
                </button>
                <button
                  type="button"
                  onClick={resetDraft}
                  disabled={saving || resetting || !dirty}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel changes
                </button>
                <button
                  type="button"
                  onClick={() => void handleResetOverride()}
                  disabled={saving || resetting}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-400/25 disabled:opacity-60"
                >
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Reset override
                </button>
                <button
                  type="button"
                  onClick={() => void loadDetail(detail.modelAlias)}
                  disabled={saving || resetting}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh detail
                </button>
              </div>

              <details className="rounded-lg border border-white/10 bg-white/5 p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-100">Raw effective config</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">
                  {rawRedactedConfig || "No effective config available."}
                </pre>
              </details>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
