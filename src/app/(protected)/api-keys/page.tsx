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
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { TokenTag } from "@/components/ui/token-tag";
import { StatCard } from "@/components/ui/stat-card";

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
  const [searchTerm, setSearchTerm] = useState("");
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
  const [confirmCopied, setConfirmCopied] = useState(false);

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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setQ(searchTerm);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

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
  }, [loadKeys, q]); // Reload when q changes from debounced search

  const handleRefresh = async () => {
    await Promise.all([loadCredentialsStatus(), loadKeys(offset)]);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setQ("");
    setEnvironment("all");
    setRevoked("all");
    setOffset(0);
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

    // Validate integer formats
    if (formDaily.trim() && !/^\d+$/.test(formDaily.trim())) {
      setFormError("Daily limit must be a positive integer.");
      setSaving(false);
      return;
    }
    if (formMonthly.trim() && !/^\d+$/.test(formMonthly.trim())) {
      setFormError("Monthly limit must be a positive integer.");
      setSaving(false);
      return;
    }

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

    // Daily limit cannot exceed monthly limit
    if (dailyLimit !== null && monthlyLimit !== null && monthlyLimit < dailyLimit) {
      setFormError("Monthly limit cannot be lower than daily limit.");
      setSaving(false);
      return;
    }

    // Prefix validation: alphanumeric, underscores, hyphens, max 20 chars
    if (formPrefix.trim()) {
      const prefix = formPrefix.trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) {
        setFormError("Key prefix must contain only alphanumeric characters, underscores (_), or hyphens (-).");
        setSaving(false);
        return;
      }
      if (prefix.length > 20) {
        setFormError("Key prefix must be at most 20 characters.");
        setSaving(false);
        return;
      }
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
      setConfirmCopied(false);
      setRawKeyOpen(true);
    }
  };

  const closeRawKeyModal = () => {
    if (!copied && !confirmCopied) {
      const ok = window.confirm(
        "You have not copied this key yet. Closing will permanently hide it. Are you sure you want to proceed?"
      );
      if (!ok) return;
    }
    // Crucial security constraint: Clear raw key completely from state memory
    setCreatedRawKey(null);
    setCreatedApiKey(null);
    setRawKeyOpen(false);
    setCopied(false);
    setConfirmCopied(false);
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

    // Validate integer formats
    if (formDaily.trim() && !/^\d+$/.test(formDaily.trim())) {
      setFormError("Daily limit must be a positive integer.");
      setSaving(false);
      return;
    }
    if (formMonthly.trim() && !/^\d+$/.test(formMonthly.trim())) {
      setFormError("Monthly limit must be a positive integer.");
      setSaving(false);
      return;
    }

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

    // Daily limit cannot exceed monthly limit
    if (dailyLimit !== null && monthlyLimit !== null && monthlyLimit < dailyLimit) {
      setFormError("Monthly limit cannot be lower than daily limit.");
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
      alert(result.data.is_revoked ? "API Key revoked successfully." : "Already revoked.");
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
      return "—";
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const keyEnvBadge = (env?: string) => {
    const clean = String(env || "").toLowerCase().trim();
    if (clean === "prod" || clean === "live") return <Badge variant="live">{clean}</Badge>;
    if (clean === "dev") return <Badge variant="warning">{clean}</Badge>;
    if (clean === "local") return <Badge variant="ai">{clean}</Badge>;
    return <Badge variant="inactive">{clean || "unknown"}</Badge>;
  };

  // Status statistics helper calculations
  const totalKeys = keys.length;
  const activeKeys = keys.filter((k) => !k.is_revoked).length;
  const revokedKeys = keys.filter((k) => k.is_revoked).length;

  const usageTodayAvailable = keys.some((k) => k.usage_today !== null && k.usage_today !== undefined);
  const usageMonthAvailable = keys.some((k) => k.usage_month !== null && k.usage_month !== undefined);

  const totalUsageToday = usageTodayAvailable
    ? keys.reduce((acc, k) => acc + (k.usage_today || 0), 0)
    : null;
  const totalUsageMonth = usageMonthAvailable
    ? keys.reduce((acc, k) => acc + (k.usage_month || 0), 0)
    : null;

  const hasActiveFilters = searchTerm.trim().length > 0 || environment !== "all" || revoked !== "all";

  // Determine main layout content based on error/loading/empty state
  let mainContent;

  if (!adminConfigured) {
    mainContent = (
      <div className="neural-panel rounded-2xl p-8 text-center space-y-4 border border-neural-red/25 bg-neural-red/5">
        <TriangleAlert className="h-10 w-10 text-neural-red mx-auto animate-pulse" />
        <h3 className="text-lg font-semibold text-neural-red font-display uppercase tracking-[0.05em]">
          Internal Admin Token Required
        </h3>
        <p className="text-sm text-neural-text-secondary max-w-md mx-auto">
          You must configure the Gateway internal admin token to manage API keys. Your configuration is stored encrypted server-side.
        </p>
        <div className="pt-2">
          <Link
            href="/settings/gateway"
            className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
          >
            Go to Settings → Gateway Credentials
          </Link>
        </div>
      </div>
    );
  } else if (error) {
    const isTokenIssue = error.code === "internal_admin_not_configured" || error.code === "internal_admin_invalid";
    const isCredIssue = error.code === "credentials_not_configured";
    const isUnreachable = error.code === "gateway_unreachable";
    const isNotFound = error.code === "api_key_not_found";
    const isInvalidRequest = error.code === "invalid_api_key_request";

    let errorTitle = "Gateway Communication Error";
    let errorDesc = error.message || "An unexpected error occurred while communicating with the Gateway.";
    let actionLink = "/settings/gateway";
    let actionText = "Go to Settings → Gateway Credentials";

    if (isTokenIssue) {
      errorTitle = "Invalid or Missing Admin Token";
      errorDesc = "The Gateway rejected your internal admin token, or it has not been configured yet.";
    } else if (isCredIssue) {
      errorTitle = "Gateway Credentials Missing";
      errorDesc = "Gateway URL or API key is not configured on Nesty Console.";
    } else if (isUnreachable) {
      errorTitle = "Gateway Unreachable";
      errorDesc = "Nesty Console cannot connect to the NestyAI Gateway at the current address. Ensure the service is running.";
      actionLink = "/status";
      actionText = "Check Gateway Status";
    } else if (isNotFound) {
      errorTitle = "API Key Not Found";
      errorDesc = "The requested API key does not exist or has been deleted from the Gateway database.";
      actionLink = "#";
      actionText = "Refresh Keys List";
    } else if (isInvalidRequest) {
      errorTitle = "Invalid Key Request";
      errorDesc = error.message || "The request payload did not meet the Gateway's validation rules.";
    }

    mainContent = (
      <div className="neural-panel rounded-2xl p-8 text-center space-y-4 border border-neural-amber/25 bg-neural-amber/5">
        <TriangleAlert className="h-10 w-10 text-neural-amber mx-auto" />
        <h3 className="text-lg font-semibold text-neural-text-primary font-display uppercase tracking-[0.05em]">{errorTitle}</h3>
        <p className="text-sm text-neural-text-secondary max-w-md mx-auto">{errorDesc}</p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          {actionLink !== "#" ? (
            <Link
              href={actionLink}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
            >
              {actionText}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
            >
              {actionText}
            </button>
          )}
          {isUnreachable && (
            <Link
              href="/settings/gateway"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Configure Credentials
            </Link>
          )}
          {!isNotFound && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  } else if (loading) {
    mainContent = <LoadingBlock label="Retrieving API Keys..." />;
  } else if (keys.length === 0) {
    if (hasActiveFilters) {
      mainContent = (
        <div className="neural-panel rounded-2xl p-8 text-center space-y-4 border border-white/5 bg-white/[0.01]">
          <h3 className="text-lg font-semibold text-neural-text-primary font-display uppercase tracking-[0.05em]">No Search Results</h3>
          <p className="text-sm text-neural-text-secondary max-w-md mx-auto">
            No API keys matched the active environment, status, or search filters.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
            >
              Clear Filters
            </button>
          </div>
        </div>
      );
    } else {
      mainContent = (
        <div className="neural-panel rounded-2xl p-8 text-center space-y-4 border border-white/5 bg-white/[0.01]">
          <h3 className="text-lg font-semibold text-neural-text-primary font-display uppercase tracking-[0.05em]">No API Keys Created</h3>
          <p className="text-sm text-neural-text-secondary max-w-md mx-auto">
            No API keys have been generated yet for this Gateway instance. Create one to get started.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
            >
              Create API Key
            </button>
          </div>
        </div>
      );
    }
  } else {
    mainContent = (
      <section className="space-y-4 animate-fade-in">
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
                <th className="px-4 py-3">Usage Month</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t border-white/[0.06] text-neural-text-primary hover:bg-white/[0.02] transition ${
                    item.is_revoked ? "opacity-45 grayscale-[25%]" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3">{keyEnvBadge(item.environment)}</td>
                  <td className="px-4 py-3">
                    <TokenTag>{item.key_prefix || "—"}</TokenTag>
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
                    {item.daily_limit !== null && item.daily_limit !== undefined ? item.daily_limit.toLocaleString() : "Unlimited"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.monthly_limit !== null && item.monthly_limit !== undefined ? item.monthly_limit.toLocaleString() : "Unlimited"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.usage_today !== null && item.usage_today !== undefined ? item.usage_today.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.usage_month !== null && item.usage_month !== undefined ? item.usage_month.toLocaleString() : "—"}
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

        {/* Paginated Navigation Controls */}
        {(hasMore || offset > 0) && (
          <div className="flex items-center justify-between gap-4 py-2 border-t border-white/[0.04]">
            <div>
              {offset > 0 && (
                <button
                  type="button"
                  onClick={() => handlePaginate(Math.max(0, offset - limit))}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 disabled:opacity-40 transition"
                >
                  Previous
                </button>
              )}
            </div>
            <span className="font-mono text-xs text-neural-text-secondary">
              Page {Math.floor(offset / limit) + 1}
            </span>
            <div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => handlePaginate(offset + limit)}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 disabled:opacity-40 transition"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

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

      {/* Summary Cards Grid */}
      {adminConfigured && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Keys Shown" value={totalKeys} accent="cyan" />
          <StatCard label="Active Keys" value={activeKeys} accent="green" />
          <StatCard label="Revoked Keys" value={revokedKeys} accent="red" />
          <StatCard
            label="Total Usage Today"
            value={totalUsageToday !== null ? totalUsageToday.toLocaleString() : "—"}
            accent="violet"
          />
          <StatCard
            label="Total Usage Month"
            value={totalUsageMonth !== null ? totalUsageMonth.toLocaleString() : "—"}
            accent="amber"
          />
        </div>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keys..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary outline-none focus:border-neural-cyan/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Environment
              </label>
              <Select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="text-xs py-2"
              >
                <option value="all">All Environments</option>
                <option value="prod">Production (prod)</option>
                <option value="dev">Development (dev)</option>
                <option value="local">Local (local)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Status
              </label>
              <Select
                value={revoked}
                onChange={(e) => setRevoked(e.target.value)}
                className="text-xs py-2"
              >
                <option value="all">All Keys</option>
                <option value="active">Active Only</option>
                <option value="revoked">Revoked Only</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                Limit
              </label>
              <Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs py-2"
              >
                <option value="25">25 keys</option>
                <option value="50">50 keys</option>
                <option value="100">100 keys</option>
                <option value="200">200 keys</option>
              </Select>
            </div>

            <div className="flex items-end h-full pb-0.5 animate-fade-in">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary hover:border-white/20 hover:bg-white/[0.05] hover:text-neural-text-primary transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* Main Content Area */}
      {mainContent}

      {/* CREATE API KEY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Panel accent="cyan" className="w-full max-w-lg p-6 bg-neural-bg border border-white/15 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-neural-cyan" />
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-neural-text-primary font-display uppercase tracking-[0.05em]">Create API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-neural-text-secondary hover:text-neural-text-primary transition"
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
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Environment
                  </label>
                  <Select
                    value={formEnv}
                    onChange={(e) => setFormEnv(e.target.value)}
                  >
                    <option value="prod">Production (prod)</option>
                    <option value="dev">Development (dev)</option>
                    <option value="local">Local (local)</option>
                  </Select>
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
                  />
                  <p className="text-[10px] text-neural-text-muted mt-0.5">
                    Alphanumeric, underscores, hyphens only (max 20 chars).
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Daily limit (requests)
                  </label>
                  <input
                    type="text"
                    value={formDaily}
                    onChange={(e) => setFormDaily(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Monthly limit (requests)
                  </label>
                  <input
                    type="text"
                    value={formMonthly}
                    onChange={(e) => setFormMonthly(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
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
                    <label key={alias} className="inline-flex items-center gap-2 text-sm text-neural-text-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formModels.includes(alias)}
                        onChange={() => toggleModelSelection(alias)}
                        className="h-4 w-4 rounded border-white/20 bg-surface-900/70 text-neural-cyan focus:ring-neural-cyan focus:ring-offset-0"
                      />
                      <span className="font-mono text-xs">{alias}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-cyan hover:bg-neural-cyan/25 transition"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-neural-green">
                <h3 className="text-lg font-semibold tracking-[-0.03em] font-display uppercase tracking-[0.05em]">API Key Created — Copy It Now</h3>
              </div>
              <button
                type="button"
                onClick={closeRawKeyModal}
                className="text-neural-text-secondary hover:text-neural-text-primary transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-neural-amber/20 bg-neural-amber/10 p-3.5 text-xs leading-relaxed text-neural-amber space-y-1">
              <p className="font-semibold">This raw key is shown only once. After closing this panel, it cannot be recovered.</p>
              <p className="text-[11px] text-neural-text-secondary">
                For security, Console does not store raw keys. Closing this dialog clears all temporary copy state from browser memory.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">API Key metadata</p>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-neural-text-secondary space-y-1 font-mono">
                <p>ID: {createdApiKey?.id}</p>
                <p>Name: {createdApiKey?.name}</p>
                <p>Environment: {createdApiKey?.environment}</p>
                <p>Prefix: {createdApiKey?.key_prefix || "—"}</p>
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
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-xs text-neural-cyan select-all outline-none border-dashed"
                />
                <button
                  type="button"
                  onClick={handleCopyRawKey}
                  className="rounded-xl border border-neural-cyan/30 bg-neural-cyan/10 px-3.5 py-2 text-neural-cyan hover:bg-neural-cyan/20 transition flex items-center gap-1.5"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="confirm-copied-checkbox"
                checked={confirmCopied}
                onChange={(e) => setConfirmCopied(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-surface-900/70 text-neural-green focus:ring-neural-green focus:ring-offset-0"
              />
              <label htmlFor="confirm-copied-checkbox" className="text-xs text-neural-text-secondary cursor-pointer select-none">
                I confirm that I have copied and safely stored this key
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeRawKeyModal}
                disabled={!confirmCopied && !copied}
                className="w-full sm:w-auto rounded-xl border border-neural-green/45 bg-neural-green/12 px-6 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-green hover:bg-neural-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-neural-text-primary font-display uppercase tracking-[0.05em]">Edit API Key Metadata</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-neural-text-secondary hover:text-neural-text-primary transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <ErrorBanner message={formError} />}

            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-neural-text-secondary font-mono leading-relaxed">
                <p>ID: {editingKey.id}</p>
                <p>Prefix: {editingKey.key_prefix || "—"}</p>
                <p className="text-neural-text-muted text-[11px] font-sans mt-1">
                  Note: Prefix and raw keys are immutable and cannot be updated after creation.
                </p>
              </div>

              {editingKey.is_revoked && (
                <div className="rounded-xl border border-neural-red/20 bg-neural-red/10 p-3 text-xs text-neural-red font-semibold">
                  This key is currently revoked and cannot be modified.
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                  Key Name <span className="text-neural-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  disabled={editingKey.is_revoked}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                  Environment
                </label>
                <Select
                  value={formEnv}
                  disabled={editingKey.is_revoked}
                  onChange={(e) => setFormEnv(e.target.value)}
                >
                  <option value="prod">Production (prod)</option>
                  <option value="dev">Development (dev)</option>
                  <option value="local">Local (local)</option>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Daily limit (requests)
                  </label>
                  <input
                    type="text"
                    value={formDaily}
                    disabled={editingKey.is_revoked}
                    onChange={(e) => setFormDaily(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-display uppercase tracking-[0.08em] text-neural-text-secondary">
                    Monthly limit (requests)
                  </label>
                  <input
                    type="text"
                    value={formMonthly}
                    disabled={editingKey.is_revoked}
                    onChange={(e) => setFormMonthly(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-cyan/50 transition font-mono"
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
                    <label key={alias} className="inline-flex items-center gap-2 text-sm text-neural-text-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={editingKey.is_revoked}
                        checked={formModels.includes(alias)}
                        onChange={() => toggleModelSelection(alias)}
                        className="h-4 w-4 rounded border-white/20 bg-surface-900/70 text-neural-cyan focus:ring-neural-cyan focus:ring-offset-0"
                      />
                      <span className="font-mono text-xs">{alias}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || editingKey.is_revoked}
                  className="inline-flex items-center gap-2 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-cyan hover:bg-neural-cyan/25 transition"
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
              <h3 className="text-lg font-semibold tracking-[-0.03em] font-display uppercase tracking-[0.05em]">Revoke API Key</h3>
            </div>

            <div className="text-sm text-neural-text-secondary leading-relaxed space-y-2">
              <p>
                You are about to revoke the key <strong className="text-neural-text-primary font-bold">&ldquo;{revokingKey.name}&rdquo;</strong> (Prefix: <span className="font-mono text-xs text-neural-cyan">{revokingKey.key_prefix || "—"}</span>).
              </p>
              <div className="rounded-xl border border-neural-red/20 bg-neural-red/10 p-3 text-xs text-neural-red font-semibold leading-relaxed">
                Revoking this key immediately prevents it from authenticating public Gateway requests. External clients calling Gateway public routes will receive <code className="font-mono">api_key_revoked</code> (HTTP 403). This cannot be undone.
              </div>
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
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neural-text-primary outline-none focus:border-neural-red/50 transition font-mono animate-fade-in"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRevoke}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-neural-red/35 bg-neural-red/12 px-4 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-rose-100 hover:bg-neural-red/20 transition"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Revoke key
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
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-neural-text-primary font-display uppercase tracking-[0.05em]">API Key Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="text-neural-text-secondary hover:text-neural-text-primary transition"
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
                  <p className="mt-1 font-mono text-xs text-neural-text-primary">{detailKey.key_prefix || "—"}</p>
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
                    {detailKey.daily_limit !== null && detailKey.daily_limit !== undefined ? `${detailKey.daily_limit.toLocaleString()} requests` : "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Monthly Limit</p>
                  <p className="text-neural-text-primary">
                    {detailKey.monthly_limit !== null && detailKey.monthly_limit !== undefined ? `${detailKey.monthly_limit.toLocaleString()} requests` : "Unlimited"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3 font-mono text-xs">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Requests Today</p>
                  <p className="text-neural-text-primary">
                    {detailKey.usage_today !== null && detailKey.usage_today !== undefined ? detailKey.usage_today.toLocaleString() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted mb-1 font-sans">Requests Month</p>
                  <p className="text-neural-text-primary">
                    {detailKey.usage_month !== null && detailKey.usage_month !== undefined ? detailKey.usage_month.toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3 font-mono text-xs">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Created At</p>
                  <p className="mt-1 text-neural-text-primary">{formatTimestamp(detailKey.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Updated At</p>
                  <p className="mt-1 text-neural-text-primary">{formatTimestamp(detailKey.updated_at || detailKey.created_at)}</p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 border-b border-white/5 pb-3 font-mono text-xs">
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Last Used At</p>
                  <p className="mt-1 text-neural-text-primary">{formatTimestamp(detailKey.last_used_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={detailKey.is_revoked ? "error" : "success"}>
                      {detailKey.is_revoked ? "Revoked" : "Active"}
                    </Badge>
                  </div>
                </div>
              </div>

              {detailKey.is_revoked && detailKey.revoked_at && (
                <div className="font-mono text-xs">
                  <p className="text-xs uppercase font-display tracking-[0.08em] text-neural-text-muted font-sans">Revoked At</p>
                  <p className="mt-1 text-neural-red font-semibold">{formatTimestamp(detailKey.revoked_at)}</p>
                  <p className="mt-2 text-[11px] font-sans text-neural-text-secondary leading-relaxed">
                    External clients calling Gateway public routes will receive <code className="font-mono">api_key_revoked</code> (HTTP 403).
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-neural-text-secondary font-mono leading-relaxed">
                <p className="text-neural-text-muted text-[11px] font-sans">
                  Note: Raw keys cannot be viewed after creation. Create a new key if the original was lost.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs font-display uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 transition"
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
