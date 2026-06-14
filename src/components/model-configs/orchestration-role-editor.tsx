"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Select } from "@/components/ui/select";
import { createEmptyChainItem, type EditableChainItem } from "@/lib/model-configs/chain-utils";
import {
  findProviderCapability,
  normalizeProvider,
  OLLAMA_CLOUD_MODEL_EXAMPLES,
  providerBadgeVariant,
  providerChainWarnings,
  providerDisplayName
} from "@/lib/model-configs/provider-catalog-utils";
import { fetchOrchestrationConfig, patchOrchestrationConfig } from "@/lib/orchestration-roles/client";
import {
  buildRolesPatch,
  draftFromDefaultTemplate,
  draftFromEffectiveRoles,
  isOptionalRole,
  isRequiredRole
} from "@/lib/orchestration-roles/normalize";
import type {
  EditableOrchestrationRole,
  OrchestrationConfigView,
  OrchestrationConsoleError
} from "@/lib/orchestration-roles/types";
import { SUPPORTED_ORCHESTRATION_ROLE_IDS } from "@/lib/orchestration-roles/types";
import type { GatewayProviderCapability } from "@/lib/runtime-providers/types";

type OrchestrationRoleEditorProps = {
  modelId: string;
  providerCatalog: GatewayProviderCapability[];
  providerSuggestions: string[];
  disabled?: boolean;
};

function roleLabel(roleId: string): string {
  return roleId.charAt(0).toUpperCase() + roleId.slice(1);
}

export function OrchestrationRoleEditor({
  modelId,
  providerCatalog,
  providerSuggestions,
  disabled = false
}: OrchestrationRoleEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<OrchestrationConsoleError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<OrchestrationConfigView | null>(null);
  const [baselineRoles, setBaselineRoles] = useState<Record<string, EditableOrchestrationRole>>({});
  const [draftRoles, setDraftRoles] = useState<Record<string, EditableOrchestrationRole>>({});

  const load = useCallback(async () => {
    const safeModelId = modelId.trim();
    if (!safeModelId) {
      setView(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await fetchOrchestrationConfig(safeModelId);
    if (!result.ok) {
      setError(result.error);
      setView(null);
      setBaselineRoles({});
      setDraftRoles({});
      setLoading(false);
      return;
    }
    const nextView = result.data;
    const nextDraft = draftFromEffectiveRoles(nextView);
    setView(nextView);
    setBaselineRoles(nextDraft);
    setDraftRoles(nextDraft);
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  const dirty = useMemo(() => {
    return JSON.stringify(baselineRoles) !== JSON.stringify(draftRoles);
  }, [baselineRoles, draftRoles]);

  const validationWarnings = view?.validation_warnings || [];

  const updateRole = (roleId: string, updater: (prev: EditableOrchestrationRole) => EditableOrchestrationRole) => {
    setDraftRoles((prev) => ({
      ...prev,
      [roleId]: updater(prev[roleId] || draftFromDefaultTemplate(view!, roleId as (typeof SUPPORTED_ORCHESTRATION_ROLE_IDS)[number]))
    }));
  };

  const updateRoleChainItem = (
    roleId: string,
    index: number,
    updater: (prev: EditableChainItem) => EditableChainItem
  ) => {
    updateRole(roleId, (prev) => ({
      ...prev,
      providerChain: prev.providerChain.map((item, idx) => (idx === index ? updater(item) : item))
    }));
  };

  const resetDraft = () => {
    setDraftRoles(baselineRoles);
    setNotice("Reverted unsaved orchestration role changes.");
  };

  const resetRoleToTemplate = (roleId: (typeof SUPPORTED_ORCHESTRATION_ROLE_IDS)[number]) => {
    if (!view) return;
    const templateDraft = draftFromDefaultTemplate(view, roleId);
    setDraftRoles((prev) => ({ ...prev, [roleId]: templateDraft }));
    setNotice(`Reset '${roleId}' draft to Gateway default template. Save to apply.`);
  };

  const handleSave = async () => {
    if (!view) return;
    setSaving(true);
    setNotice(null);
    setError(null);

    const patchResult = buildRolesPatch(view.effective_roles, draftRoles);
    if ("error" in patchResult) {
      setSaving(false);
      setError({ code: "invalid_model_config", message: patchResult.error });
      return;
    }

    const result = await patchOrchestrationConfig(view.model_id, patchResult);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const nextView = result.data;
    const nextDraft = draftFromEffectiveRoles(nextView);
    setView(nextView);
    setBaselineRoles(nextDraft);
    setDraftRoles(nextDraft);
    setNotice("Orchestration role overrides saved.");
  };

  if (loading) {
    return <LoadingBlock label="Loading orchestration roles..." />;
  }

  if (error && !view) {
    return (
      <article className="rounded-lg border border-neural-text-muted/25 bg-neural-overlay/35 p-3">
        <h3 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">
          Nesty Pro Orchestration Roles
        </h3>
        <ErrorBanner className="mt-2" code={error.code} message={error.message} />
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/30 bg-neural-overlay/45 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-text-primary transition hover:border-neural-cyan/40"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </article>
    );
  }

  if (!view) {
    return null;
  }

  return (
    <article className="rounded-lg border border-neural-text-muted/25 bg-neural-overlay/35 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">
            Nesty Pro Orchestration Roles
          </h3>
          <p className="mt-1 text-[11px] text-neural-text-muted">
            Role saves are separate from alias-level provider chain saves. Gateway v1.6.2 orchestration API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neural-text-secondary">
          <Badge variant={view.orchestration_enabled ? "success" : "inactive"}>
            {view.orchestration_enabled ? "enabled" : "disabled"}
          </Badge>
          <Badge variant="ai">{view.orchestration_mode}</Badge>
        </div>
      </div>

      {error ? <ErrorBanner className="mt-2" code={error.code} message={error.message} /> : null}
      {notice ? <p className="mt-2 text-xs text-neural-cyan">{notice}</p> : null}

      {validationWarnings.length > 0 ? (
        <div className="mt-2 space-y-1 rounded border border-amber-500/30 bg-amber-500/10 p-2">
          {validationWarnings.map((warning) => (
            <p key={warning} className="text-[11px] text-amber-100">
              {warning}
            </p>
          ))}
          <p className="text-[10px] text-amber-200/80">Credential warnings are advisory only; Gateway validates on save.</p>
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        {SUPPORTED_ORCHESTRATION_ROLE_IDS.map((roleId) => {
          const roleDraft = draftRoles[roleId];
          if (!roleDraft) return null;
          const required = isRequiredRole(roleId);
          const optional = isOptionalRole(roleId);
          const hasOverride = Boolean(view.override_roles[roleId] && Object.keys(view.override_roles[roleId]).length > 0);

          return (
            <section key={roleId} className="rounded border border-neural-text-muted/25 bg-neural-elevated/70 p-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-neural-text-primary">{roleLabel(roleId)}</p>
                {required ? <Badge variant="live">required</Badge> : null}
                {optional ? <Badge variant="inactive">optional</Badge> : null}
                {hasOverride ? <Badge variant="warning">override</Badge> : null}
                <button
                  type="button"
                  disabled={disabled || saving}
                  onClick={() => resetRoleToTemplate(roleId)}
                  className="ml-auto rounded border border-neural-text-muted/30 bg-neural-overlay/45 px-2 py-1 font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
                >
                  Reset to template
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <label className="space-y-1 text-xs text-neural-text-secondary">
                  <span>enabled</span>
                  {required ? (
                    <input
                      value="true"
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded border border-neural-text-muted/30 bg-neural-input/60 px-2 py-1 font-mono text-xs text-neural-text-muted"
                    />
                  ) : (
                    <Select
                      value={roleDraft.enabled ? "true" : "false"}
                      disabled={disabled || saving}
                      onChange={(event) =>
                        updateRole(roleId, (prev) => ({ ...prev, enabled: event.target.value !== "false" }))
                      }
                      className="font-mono text-xs py-1"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </Select>
                  )}
                </label>
                <label className="space-y-1 text-xs text-neural-text-secondary">
                  <span>temperature</span>
                  <input
                    value={roleDraft.temperature}
                    disabled={disabled || saving}
                    onChange={(event) => updateRole(roleId, (prev) => ({ ...prev, temperature: event.target.value }))}
                    placeholder="inherit"
                    className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none disabled:opacity-60"
                  />
                </label>
                <label className="space-y-1 text-xs text-neural-text-secondary">
                  <span>max_tokens</span>
                  <input
                    value={roleDraft.max_tokens}
                    disabled={disabled || saving}
                    onChange={(event) => updateRole(roleId, (prev) => ({ ...prev, max_tokens: event.target.value }))}
                    placeholder="inherit"
                    className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none disabled:opacity-60"
                  />
                </label>
                <label className="space-y-1 text-xs text-neural-text-secondary">
                  <span>timeout_seconds</span>
                  <input
                    value={roleDraft.timeout_seconds}
                    disabled={disabled || saving}
                    onChange={(event) => updateRole(roleId, (prev) => ({ ...prev, timeout_seconds: event.target.value }))}
                    placeholder="inherit"
                    className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-neural-text-secondary">provider_chain (empty inherits alias chain)</p>
                  <button
                    type="button"
                    disabled={disabled || saving}
                    onClick={() =>
                      updateRole(roleId, (prev) => ({
                        ...prev,
                        providerChain: [...prev.providerChain, createEmptyChainItem()]
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded border border-neural-cyan/35 bg-neural-cyan/10 px-2 py-1 font-display text-[10px] uppercase tracking-[0.06em] text-neural-cyan hover:bg-neural-cyan/20 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                {roleDraft.providerChain.length === 0 ? (
                  <p className="text-[11px] text-slate-300">No role-specific chain — inherits alias provider_chain.</p>
                ) : (
                  <div className="space-y-2">
                    {roleDraft.providerChain.map((item, index) => {
                      const capability = findProviderCapability(providerCatalog, item.provider);
                      const chainWarnings = providerChainWarnings(providerCatalog, item.provider);
                      return (
                        <div
                          key={item.clientId}
                          className="rounded border border-neural-text-muted/20 bg-neural-overlay/40 p-2"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <Badge variant={providerBadgeVariant(normalizeProvider(item.provider))}>
                              {capability?.display_name || providerDisplayName(normalizeProvider(item.provider))}
                            </Badge>
                            {normalizeProvider(item.provider) === "ollama_cloud" ? (
                              <span className="text-[10px] text-neural-text-secondary">
                                Examples: {OLLAMA_CLOUD_MODEL_EXAMPLES.join(", ")}
                              </span>
                            ) : null}
                          </div>
                          {chainWarnings.map((warning) => (
                            <p key={warning} className="mb-1 text-[10px] text-amber-200">
                              {warning}
                            </p>
                          ))}
                          <div className="grid gap-2 md:grid-cols-2">
                            <label className="space-y-1 text-[11px] text-neural-text-secondary">
                              <span>provider</span>
                              <input
                                list="orchestration-provider-suggestions"
                                value={item.provider}
                                disabled={disabled || saving}
                                onChange={(event) =>
                                  updateRoleChainItem(roleId, index, (prev) => ({ ...prev, provider: event.target.value }))
                                }
                                className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-[11px] text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none disabled:opacity-60"
                              />
                            </label>
                            <label className="space-y-1 text-[11px] text-neural-text-secondary">
                              <span>model</span>
                              <input
                                value={item.model}
                                disabled={disabled || saving}
                                onChange={(event) =>
                                  updateRoleChainItem(roleId, index, (prev) => ({ ...prev, model: event.target.value }))
                                }
                                className="w-full rounded border border-neural-text-muted/30 bg-neural-input px-2 py-1 font-mono text-[11px] text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none disabled:opacity-60"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            disabled={disabled || saving}
                            onClick={() =>
                              updateRole(roleId, (prev) => ({
                                ...prev,
                                providerChain: prev.providerChain.filter((_, idx) => idx !== index)
                              }))
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded border border-neural-red/35 bg-neural-red/12 px-2 py-1 font-display text-[10px] uppercase tracking-[0.06em] text-rose-100 hover:bg-neural-red/22 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <datalist id="orchestration-provider-suggestions">
        {providerSuggestions.map((providerId) => (
          <option key={providerId} value={providerId} />
        ))}
      </datalist>

      <p className="mt-2 text-[11px] text-neural-text-muted">
        Runtime provider IDs from{" "}
        <Link href="/settings/providers" className="underline underline-offset-2 hover:text-neural-cyan">
          Settings {"->"} Providers
        </Link>{" "}
        appear as suggestions. Role prompts and intermediate answers are never loaded or displayed.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled || saving || !dirty}
          className="inline-flex items-center gap-2 rounded-lg border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-cyan transition hover:bg-neural-cyan/25 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save role overrides
        </button>
        <button
          type="button"
          onClick={resetDraft}
          disabled={disabled || saving || !dirty}
          className="inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/30 bg-neural-overlay/45 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:opacity-60"
        >
          Cancel role changes
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={disabled || saving}
          className="inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/30 bg-neural-overlay/45 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh roles
        </button>
        <ConfirmAction
          confirmMessage="Reset all role drafts to Gateway default templates? You must still save to apply overrides."
          onConfirm={() => {
            if (!view) return;
            const next: Record<string, EditableOrchestrationRole> = {};
            for (const roleId of SUPPORTED_ORCHESTRATION_ROLE_IDS) {
              next[roleId] = draftFromDefaultTemplate(view, roleId);
            }
            setDraftRoles(next);
            setNotice("All role drafts reset to Gateway default templates. Save to apply.");
          }}
          disabled={disabled || saving}
          className="inline-flex items-center gap-2 rounded-lg border border-neural-amber/40 bg-neural-amber/14 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-amber transition hover:bg-neural-amber/24 disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          Reset all drafts
        </ConfirmAction>
      </div>
    </article>
  );
}
