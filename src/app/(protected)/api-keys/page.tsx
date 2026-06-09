"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Edit2,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  X
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { TokenTag } from "@/components/ui/token-tag";

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  updateApiKey,
  type ApiKeyConsoleError
} from "@/lib/api-keys/client";
import type { GatewayApiKeyPublicInfo } from "@/lib/gateway/types";

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
};

export default function ApiKeysPage() {
  // Lists and Pagination
  const [keys, setKeys] = useState<GatewayApiKeyPublicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<ApiKeyConsoleError | null>(null);

  // Filters state
  const [q, setQ] = useState("");
  const [environment, setEnvironment] = useState("all");
  const [revoked, setRevoked] = useState("all");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Credentials view
  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<GatewayApiKeyPublicInfo | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokingKey, setRevokingKey] = useState<GatewayApiKeyPublicInfo | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<GatewayApiKeyPublicInfo | null>(null);

  // One-time Raw Key Success State
  const [rawKeyOpen, setRawKeyOpen] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [createdApiKey, setCreatedApiKey] = useState<GatewayApiKeyPublicInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEnv, setFormEnv] = useState("prod");
  const [formPrefix, setFormPrefix] = useState("");
  const [formDaily, setFormDaily] = useState("");
  const [formMonthly, setFormMonthly] = useState("");
  const [formModels, setFormModels] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCredentialsStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/console/gateway-credentials", { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; data?: GatewayCredentialsView; error?: { message?: string } };
      if (!response.ok || !payload.ok || !payload.data) {
        setCredentialsView(null);
        return;
      }
      setCredentialsView(payload.data);
    } catch {
      setCredentialsView(null);
    }
  }, []);

  const loadKeys = useCallback(async (currentOffset = 0) => {
    setLoading(true);
    setError(null);

    const environmentParam = environment === "all" ? undefined : environment;
    const revokedParam = revoked === "all" ? undefined : revoked === "revoked";

    const result = await listApiKeys({
      environment: environmentParam,
      revoked: revokedParam,
      q: q.trim() || undefined,
      limit,
      offset: currentOffset
    });

    if (!result.ok) {
      setError(result.error);
      setKeys([]);
      setHasMore(false);
    } else {
      setKeys(result.data.items || []);
      setHasMore(result.data.has_more || false);
    }
    setLoading(false);
  }, [environment, revoked, q, limit]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadCredentialsStatus();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadCredentialsStatus]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOffset(0);
    void loadKeys(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadKeys]);

  const handleRefresh = async () => {
    await Promise.all([loadCredentialsStatus(), loadKeys(offset)]);
  };

  const handlePaginate = (newOffset: number) => {
    setOffset(newOffset);
    void loadKeys(newOffset);
  };

  const openCreateModal = () => {
    setFormName("");
    setFormEnv("prod");
    setFormPrefix("");
    setFormDaily("");
    setFormMonthly("");
    setFormModels([]);
    setFormError(null);
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Key name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const dailyLimit = formDaily.trim() ? Number.parseInt(formDaily, 10) : null;
    const monthlyLimit = formMonthly.trim() ? Number.parseInt(formMonthly, 10) : null;

    if (dailyLimit !== null && (Number.isNaN(dailyLimit) || dailyLimit < 0)) {
      setFormError("Daily limit must be a positive integer.");
      setSaving(false);
      return;
    }
    if (monthlyLimit !== null && (Number.isNaN(monthlyLimit) || monthlyLimit < 0)) {
      setFormError("Monthly limit must be a positive integer.");
      setSaving(false);
      return;
    }

    const payload = {
      name: formName.trim(),
      environment: formEnv.trim(),
      daily_limit: dailyLimit,
      monthly_limit: monthlyLimit,
      models: formModels.length > 0 ? formModels : undefined,
      key_prefix: formPrefix.trim() || undefined
    };

    const result = await createApiKey(payload);
    setSaving(false);

    if (!result.ok) {
      setFormError(result.error.message);
    } else {
      setCreateOpen(false);
      // Trigger raw key success flow
      setCreatedRawKey(result.data.raw_key);
      setCreatedApiKey(result.data.api_key);
      setCopied(false);
      setRawKeyOpen(true);
    }
  };

  const closeRawKeyModal = () => {
    // Crucial security constraint: Clear raw key completely from state memory
    setCreatedRawKey(null);
    setCreatedApiKey(null);
    setRawKeyOpen(false);
    setCopied(false);
    // Refresh table
    void loadKeys(offset);
  };

  const handleCopyRawKey = async () => {
    if (!createdRawKey) return;
    try {
      await navigator.clipboard.writeText(createdRawKey);
      setCopied(true);
    } catch {
      alert("Failed to copy automatically. Please select the text and copy manually.");
    }
  };

  const openEditModal = (keyInfo: GatewayApiKeyPublicInfo) => {
    setEditingKey(keyInfo);
    setFormName(keyInfo.name);
    setFormEnv(keyInfo.environment || "prod");
    setFormDaily(keyInfo.daily_limit !== undefined && keyInfo.daily_limit !== null ? String(keyInfo.daily_limit) : "");
    setFormMonthly(keyInfo.monthly_limit !== undefined && keyInfo.monthly_limit !== null ? String(keyInfo.monthly_limit) : "");
    setFormModels(keyInfo.models || []);
    setFormError(null);
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;
    if (!formName.trim()) {
      setFormError("Key name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const dailyLimit = formDaily.trim() ? Number.parseInt(formDaily, 10) : null;
    const monthlyLimit = formMonthly.trim() ? Number.parseInt(formMonthly, 10) : null;

    if (dailyLimit !== null && (Number.isNaN(dailyLimit) || dailyLimit < 0)) {
      setFormError("Daily limit must be a positive integer.");
      setSaving(false);
      return;
    }
    if (monthlyLimit !== null && (Number.isNaN(monthlyLimit) || monthlyLimit < 0)) {
      setFormError("Monthly limit must be a positive integer.");
      setSaving(false);
      return;
    }

    const payload = {
      name: formName.trim(),
      environment: formEnv.trim(),
      daily_limit: dailyLimit,
      monthly_limit: monthlyLimit,
      models: formModels
    };

    const result = await updateApiKey(editingKey.id, payload);
    setSaving(false);

    if (!result.ok) {
      setFormError(result.error.message);
    } else {
      setEditOpen(false);
      setEditingKey(null);
      void loadKeys(offset);
    }
  };

  const openRevokeModal = (keyInfo: GatewayApiKeyPublicInfo) => {
    setRevokingKey(keyInfo);
    setRevokeReason("");
    setRevokeOpen(true);
  };

  const submitRevoke = async () => {
    if (!revokingKey) return;
    setSaving(true);
    const result = await revokeApiKey(revokingKey.id, revokeReason.trim() || undefined);
    setSaving(false);

    if (!result.ok) {
      alert(`Failed to revoke key: ${result.error.message}`);
    } else {
      setRevokeOpen(false);
      setRevokingKey(null);
      void loadKeys(offset);
    }
  };

  const toggleModelSelection = (model: string) => {
    setFormModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const adminConfigured = Boolean(
    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured
  );

  const formatTimestamp = (raw: unknown): string => {
    if (typeof raw !== "string" || !raw.trim()) {
      return "-";
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const keyEnvBadge = (env?: string) => {
    const clean = String(env || "").toLowerCase().trim();
    if (clean === "prod" || clean === "live") return <Badge variant="live">{clean}</Badge>;
    if (clean === "dev") return <Badge variant="warning">{clean}</Badge>;
    return <Badge variant="inactive">{clean || "unknown"}</Badge>;
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      {/* Header and Quick Summary */}
      <Panel accent="cyan" className="p-6 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-neural-text-primary sm:text-4xl">
                API Keys
              </h1>
              <Badge variant="live" withDot>
                management
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neural-text-secondary">
              Create and manage NestyAI Gateway API keys for script execution, Console credentials, and external client requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:bg-white/[0.08] hover:text-neural-cyan disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!adminConfigured}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Create API Key
            </button>
          </div>
        </div>
      </Panel>

      {/* Warnings & Admin Configuration Block */}
      {!adminConfigured && (
        <Panel accent="red" className="p-5 flex items-start gap-4">
          <TriangleAlert className="h-5 w-5 text-neural-red mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-neural-red">Internal admin token is required to manage Gateway API keys.</p>
            <p className="text-sm text-neural-text-secondary">
              Configure or replace your token in{" "}
              <Link href="/settings/gateway" className="underline text-neural-text-primary hover:text-neural-cyan">
                Settings → Gateway Credentials
              </Link>
              .
            </p>
          </div>
        </Panel>
      )}

      {error && (
        <ErrorBanner code={error.code} message={error.message}>
          {error.code === "internal_admin_not_configured" || error.code === "internal_admin_invalid" ? (
            <p className="mt-2">
              Configure internal admin token in{" "}
              <Link href="/settings/gateway" className="underline text-neural-text-primary hover:text-neural-cyan">
                Settings → Gateway Credentials
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2">
              Verify Gateway state in{" "}
              <Link href="/status" className="underline text-neural-text-primary hover:text-neural-cyan">
                Status
              </Link>
              .
            </p>
          )}
        </ErrorBanner>
      )}

      {/* Filters Form */}
      {adminConfigured && (
        <Panel accent="cyan" className="p-4 flex flex-wrap gap-4 items-end justify-between bg-white/[0.01]">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 flex-1">
            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Search
              </label>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search keys..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary outline-none focus:border-neural-cyan/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary outline-none focus:border-neural-cyan/50"
              >
                <option value="all">All Environments</option>
                <option value="prod">Production (prod)</option>
                <option value="dev">Development (dev)</option>
                <option value="local">Local (local)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Status
              </label>
              <select
                value={revoked}
                onChange={(e) => setRevoked(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary outline-none focus:border-neural-cyan/50"
              >
                <option value="all">All Keys</option>
                <option value="active">Active Only</option>
                <option value="revoked">Revoked Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Limit
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary outline-none focus:border-neural-cyan/50"
              >
                <option value="25">25 keys</option>
                <option value="50">50 keys</option>
                <option value="100">100 keys</option>
                <option value="200">200 keys</option>
              </select>
            </div>
          </div>
        </Panel>
      )}

      {/* Main Keys List Table */}
      {adminConfigured && (
        <section className="space-y-4">
          {loading ? (
            <LoadingBlock label="Retrieving API Keys..." />
          ) : keys.length === 0 ? (
            <EmptyState title="No API keys found." description="Create a new key to authorize external client applications." />
          ) : (
            <DataTable>
              <table className="min-w-full text-sm">
                <thead className="bg-neural-overlay/55 text-left font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-secondary">
                  <tr>
                    <th className="px-4 py-3">Key Name</th>
                    <th className="px-4 py-3">Env</th>
                    <th className="px-4 py-3">Prefix</th>
                    <th className="px-4 py-3">Allowed Models</th>
                    <th className="px-4 py-3">Daily</th>
                    <th className="px-4 py-3">Monthly</th>
                    <th className="px-4 py-3">Usage Today</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/[0.06] text-neural-text-primary hover:bg-white/[0.02] transition"
                    >
                      <td className="px-4 py-3 font-semibold">{item.name}</td>
                      <td className="px-4 py-3">{keyEnvBadge(item.environment)}</td>
                      <td className="px-4 py-3">
                        <TokenTag>{item.key_prefix || "-"}</TokenTag>
                      </td>
                      <td className="px-4 py-3">
                        {item.models && item.models.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.models.map((m) => (
                              <TokenTag key={m}>{m}</TokenTag>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-neural-text-muted">all aliases</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.daily_limit !== null && item.daily_limit !== undefined ? item.daily_limit : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.monthly_limit !== null && item.monthly_limit !== undefined ? item.monthly_limit : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.usage_today !== null && item.usage_today !== undefined ? item.usage_today : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.is_revoked ? "error" : "success"}>
                          {item.is_revoked ? "revoked" : "active"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-neural-text-secondary">
                        {formatTimestamp(item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailKey(item);
                            setDetailOpen(true);
                          }}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-neural-text-secondary hover:text-neural-cyan hover:border-neural-cyan/30 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={item.is_revoked}
                          title="Edit Key"
                          className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-neural-text-secondary hover:text-neural-cyan hover:border-neural-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openRevokeModal(item)}
                          disabled={item.is_revoked}
                          title="Revoke Key"
                          className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-neural-text-secondary hover:text-neural-red hover:border-neural-red/35 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}

          {/* Simple Pagination Controls */}
          {keys.length > 0 && (hasMore || offset > 0) && (
            <div className="flex items-center justify-between gap-4 py-2">
              <button
                type="button"
                onClick={() => handlePaginate(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-xs text-neural-text-secondary">
                Page {Math.floor(offset / limit) + 1}
              </span>
              <button
                type="button"
                onClick={() => handlePaginate(offset + limit)}
                disabled={!hasMore}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {/* CREATE API KEY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Panel accent="cyan" className="w-full max-w-lg p-6 bg-neural-bg border border-white/15 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-neural-cyan" />
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-neural-text-primary">Create API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-neural-text-secondary hover:text-neural-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <ErrorBanner message={formError} />}

            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                  Key Name <span className="text-neural-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. CLI tool / internal app"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Environment
                  </label>
                  <select
                    value={formEnv}
                    onChange={(e) => setFormEnv(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                  >
                    <option value="prod">Production (prod)</option>
                    <option value="dev">Development (dev)</option>
                    <option value="local">Local (local)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Key Prefix (optional)
                  </label>
                  <input
                    type="text"
                    value={formPrefix}
                    onChange={(e) => setFormPrefix(e.target.value)}
                    placeholder="e.g. nsk_live"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Daily limit (requests)
                  </label>
                  <input
                    type="number"
                    value={formDaily}
                    onChange={(e) => setFormDaily(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Monthly limit (requests)
                  </label>
                  <input
                    type="number"
                    value={formMonthly}
                    onChange={(e) => setFormMonthly(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                  />
                </div>
              </div>

              {/* Models selection checkboxes */}
              <div className="space-y-2">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary block">
                  Allowed model aliases (leave empty to allow all)
                </label>
                <div className="flex flex-wrap gap-4">
                  {["nesty-flash-1.0", "nesty-combined-1.0", "nesty-pro-1.0"].map((alias) => (
                    <label key={alias} className="inline-flex items-center gap-2 text-sm text-neural-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formModels.includes(alias)}
                        onChange={() => toggleModelSelection(alias)}
                        className="h-4 w-4 rounded border-white/20 bg-surface-900/70"
                      />
                      {alias}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-cyan"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create key
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* ONE-TIME RAW KEY DISPLAY SUCCESS MODAL */}
      {rawKeyOpen && createdRawKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <Panel accent="green" className="w-full max-w-lg p-6 bg-neural-bg border border-white/15 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-neural-green">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">API Key Created Successfully</h3>
            </div>

            <div className="rounded-xl border border-neural-amber/20 bg-neural-amber/10 p-3.5 text-xs leading-relaxed text-neural-amber">
              <p className="font-semibold">Copy this API key now. It will not be shown again.</p>
              <p className="mt-1">For your security, we do not store this raw key server-side once created, and it will be completely cleared from the browser memory as soon as you close this box.</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">API Key metadata</p>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-neural-text-secondary space-y-1 font-mono">
                <p>ID: {createdApiKey?.id}</p>
                <p>Name: {createdApiKey?.name}</p>
                <p>Environment: {createdApiKey?.environment}</p>
                <p>Prefix: {createdApiKey?.key_prefix}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                Raw API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdRawKey}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-xs text-neural-cyan select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyRawKey}
                  className="rounded-xl border border-neural-cyan/30 bg-neural-cyan/10 px-3 py-2 text-neural-cyan hover:bg-neural-cyan/20 transition flex items-center gap-1.5"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeRawKeyModal}
                className="w-full sm:w-auto rounded-xl border border-neural-green/45 bg-neural-green/12 px-6 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-green hover:bg-neural-green/20"
              >
                I have copied this key
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* EDIT API KEY MODAL */}
      {editOpen && editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Panel accent="cyan" className="w-full max-w-lg p-6 bg-neural-bg border border-white/15 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-neural-cyan" />
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-neural-text-primary">Edit API Key Metadata</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-neural-text-secondary hover:text-neural-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <ErrorBanner message={formError} />}

            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-1 font-mono text-xs text-neural-text-muted">
                <p>ID: {editingKey.id}</p>
                <p>Prefix: {editingKey.key_prefix}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                  Key Name <span className="text-neural-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                  Environment
                </label>
                <select
                  value={formEnv}
                  onChange={(e) => setFormEnv(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                >
                  <option value="prod">Production (prod)</option>
                  <option value="dev">Development (dev)</option>
                  <option value="local">Local (local)</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Daily limit (requests)
                  </label>
                  <input
                    type="number"
                    value={formDaily}
                    onChange={(e) => setFormDaily(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Monthly limit (requests)
                  </label>
                  <input
                    type="number"
                    value={formMonthly}
                    onChange={(e) => setFormMonthly(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50"
                  />
                </div>
              </div>

              {/* Models selection checkboxes */}
              <div className="space-y-2">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary block">
                  Allowed model aliases (leave empty to allow all)
                </label>
                <div className="flex flex-wrap gap-4">
                  {["nesty-flash-1.0", "nesty-combined-1.0", "nesty-pro-1.0"].map((alias) => (
                    <label key={alias} className="inline-flex items-center gap-2 text-sm text-neural-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formModels.includes(alias)}
                        onChange={() => toggleModelSelection(alias)}
                        className="h-4 w-4 rounded border-white/20 bg-surface-900/70"
                      />
                      {alias}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-cyan"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* REVOKE KEY CONFIRMATION MODAL */}
      {revokeOpen && revokingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Panel accent="red" className="w-full max-w-md p-6 bg-neural-bg border border-white/15 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-neural-red">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">Revoke API Key</h3>
            </div>

            <div className="text-sm text-neural-text-secondary leading-relaxed">
              <p>Are you sure you want to revoke key <strong className="text-neural-text-primary font-bold">&ldquo;{revokingKey.name}&rdquo;</strong>?</p>
              <p className="mt-2 text-neural-red font-semibold">
                Revoking this API key will immediately prevent it from authenticating public Gateway requests. This cannot be undone.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                Reason for revocation (optional)
              </label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. rotated / key leaked"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-red/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRevoke}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-neural-red/35 bg-neural-red/12 px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-rose-100 hover:bg-neural-red/20"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Revoke immediately
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* DETAILED VIEW MODAL */}
      {detailOpen && detailKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Panel accent="violet" className="w-full max-w-lg p-6 bg-neural-bg border border-white/15 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-violet-200" />
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-neural-text-primary">API Key Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="text-neural-text-secondary hover:text-neural-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-neural-text-secondary">
              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted">Key Name</p>
                  <p className="mt-1 font-semibold text-neural-text-primary">{detailKey.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted">Environment</p>
                  <div className="mt-1">{keyEnvBadge(detailKey.environment)}</div>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted">Prefix</p>
                  <p className="mt-1 font-mono text-xs text-neural-text-primary">{detailKey.key_prefix}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted">ID</p>
                  <p className="mt-1 font-mono text-xs text-neural-text-primary">{detailKey.id}</p>
                </div>
              </div>

              <div className="border-b border-white/5 pb-3">
                <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1">Allowed Model Aliases</p>
                {detailKey.models && detailKey.models.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detailKey.models.map((m) => (
                      <TokenTag key={m}>{m}</TokenTag>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs italic text-neural-text-muted">All model aliases allowed</span>
                )}
              </div>

              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3 font-mono text-xs">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Daily Limit</p>
                  <p className="text-neural-text-primary">
                    {detailKey.daily_limit !== null && detailKey.daily_limit !== undefined ? `${detailKey.daily_limit} requests` : "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Monthly Limit</p>
                  <p className="text-neural-text-primary">
                    {detailKey.monthly_limit !== null && detailKey.monthly_limit !== undefined ? `${detailKey.monthly_limit} requests` : "Unlimited"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3 font-mono text-xs">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Requests Today</p>
                  <p className="text-neural-text-primary">{detailKey.usage_today ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Requests Month</p>
                  <p className="text-neural-text-primary">{detailKey.usage_month ?? 0}</p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 font-mono text-xs">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Created At</p>
                  <p className="mt-1 text-neural-text-primary">{formatTimestamp(detailKey.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Last Used At</p>
                  <p className="mt-1 text-neural-text-primary">{formatTimestamp(detailKey.last_used_at)}</p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={detailKey.is_revoked ? "error" : "success"}>
                    {detailKey.is_revoked ? "Revoked" : "Active"}
                  </Badge>
                  {detailKey.is_revoked && detailKey.revoked_at ? (
                    <span className="font-mono text-xs text-neural-text-muted">
                      on {formatTimestamp(detailKey.revoked_at)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary"
              >
                Close
              </button>
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}
