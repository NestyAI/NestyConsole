"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clipboard, RefreshCw } from "lucide-react";

import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { TerminalBlock } from "@/components/ui/terminal-block";
import { TokenTag } from "@/components/ui/token-tag";
import {
  clearConversation,
  exportConversation,
  getConversationDetail,
  getConversationMessages,
  getMemoryControls,
  listConversations,
  redactSensitiveMemoryValue,
  resetConversationSummary,
  runSemanticRecallTest,
  searchConversations,
  summarizeConversation,
  updateMessageMemory,
  type MemoryConsoleError
} from "@/lib/memory/client";
import type { GatewayConversation, GatewayConversationMessage } from "@/lib/gateway/types";
import { safeStringify } from "@/lib/security/redact";

type GatewayCredentialsView = {
  internal_admin_enabled: boolean;
  internal_admin_token_configured: boolean;
  internal_admin_enabled_source: "stored" | "env";
  internal_admin_token_source: "stored" | "env" | "missing";
};

type MessageMemoryDraft = {
  pinned: boolean;
  excluded: boolean;
  tagsText: string;
};

function normalizeError(payload: unknown, fallback: string): MemoryConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

function toConversationId(value: GatewayConversation | null): string {
  if (!value) {
    return "";
  }
  return String(value.id || value.conversation_id || "").trim();
}

function toConversationTitle(value: GatewayConversation | null): string {
  if (!value) {
    return "Untitled conversation";
  }
  const text = String(value.title || value.name || "").trim();
  return text || "Untitled conversation";
}

function formatDateTime(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return "-";
  }
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    return "-";
  }
  return value.toLocaleString();
}

function truncateText(value: unknown, max = 180): string {
  if (typeof value !== "string") {
    return "";
  }
  const text = value.trim();
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}...`;
}

function messageIdOf(message: GatewayConversationMessage): string {
  return String(message.id || message.message_id || "").trim();
}

function messageTagsText(message: GatewayConversationMessage): string {
  if (Array.isArray(message.memory_tags)) {
    return message.memory_tags.filter((item) => typeof item === "string").join(", ");
  }
  return "";
}

function parseTagsText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((tag) => tag.slice(0, 64));
}

async function copyText(value: string): Promise<boolean> {
  const safe = value.trim();
  if (!safe) {
    return false;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(safe);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export default function MemoryPage() {
  const [searchText, setSearchText] = useState("");
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [limit, setLimit] = useState("50");
  const [offset, setOffset] = useState("0");

  const [conversations, setConversations] = useState<GatewayConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<MemoryConsoleError | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<GatewayConversation | null>(null);
  const [messages, setMessages] = useState<GatewayConversationMessage[]>([]);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, MessageMemoryDraft>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<MemoryConsoleError | null>(null);
  const [messageSaveBusyId, setMessageSaveBusyId] = useState<string | null>(null);

  const [memoryControls, setMemoryControls] = useState<Record<string, unknown> | null>(null);
  const [memoryControlsError, setMemoryControlsError] = useState<MemoryConsoleError | null>(null);

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);

  const [recallText, setRecallText] = useState("");
  const [recallTopK, setRecallTopK] = useState("5");
  const [recallScope, setRecallScope] = useState("");
  const [recallIncludeArchived, setRecallIncludeArchived] = useState(false);
  const [recallBusy, setRecallBusy] = useState(false);
  const [recallResult, setRecallResult] = useState<unknown[]>([]);
  const [recallError, setRecallError] = useState<MemoryConsoleError | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [credentialsView, setCredentialsView] = useState<GatewayCredentialsView | null>(null);
  const [credentialsError, setCredentialsError] = useState<MemoryConsoleError | null>(null);

  const selectedConversationId = toConversationId(selectedConversation);
  const adminConfigured = Boolean(
    credentialsView?.internal_admin_enabled && credentialsView?.internal_admin_token_configured
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

  const loadMemoryControlsData = useCallback(async () => {
    setMemoryControlsError(null);
    const result = await getMemoryControls({});
    if (!result.ok) {
      setMemoryControlsError(result.error);
      setMemoryControls(null);
      return;
    }
    const source =
      (result.data.summary as Record<string, unknown> | undefined) ||
      (result.data.counts as Record<string, unknown> | undefined) ||
      {
        rows: result.data.data || result.data.items || []
      };
    setMemoryControls(source);
  }, []);

  const loadConversationsData = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);
    setNotice(null);

    const parsedLimit = Number.parseInt(limit, 10);
    const parsedOffset = Number.parseInt(offset, 10);

    const result = searchText.trim()
      ? await searchConversations({
          q: searchText,
          archived: archivedOnly,
          limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
          offset: Number.isNaN(parsedOffset) ? undefined : parsedOffset
        })
      : await listConversations({
          archived: archivedOnly,
          q: undefined,
          limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
          offset: Number.isNaN(parsedOffset) ? undefined : parsedOffset
        });

    if (!result.ok) {
      setConversationsError(result.error);
      setConversations([]);
      setConversationsLoading(false);
      return;
    }

    setConversations(result.data.items);
    if (!selectedConversationId && result.data.items.length > 0) {
      setSelectedConversation(result.data.items[0]);
    }
    setConversationsLoading(false);
  }, [archivedOnly, limit, offset, searchText, selectedConversationId]);

  const loadConversationDetail = useCallback(async (conversationId: string) => {
    const id = conversationId.trim();
    if (!id) {
      return;
    }

    setDetailLoading(true);
    setDetailError(null);
    setNotice(null);

    const [detailResult, messageResult] = await Promise.all([
      getConversationDetail(id),
      getConversationMessages(id, { limit: 50, offset: 0, order: "asc" })
    ]);

    if (!detailResult.ok) {
      setDetailError(detailResult.error);
      setSelectedConversation(null);
    } else {
      setSelectedConversation(detailResult.data.conversation || detailResult.data);
    }

    if (!messageResult.ok) {
      setDetailError(messageResult.error);
      setMessages([]);
      setMessageDrafts({});
      setDetailLoading(false);
      return;
    }

    const nextMessages = messageResult.data;
    const nextDrafts: Record<string, MessageMemoryDraft> = {};
    for (const message of nextMessages) {
      const messageId = messageIdOf(message);
      if (!messageId) {
        continue;
      }
      nextDrafts[messageId] = {
        pinned: Boolean(message.memory_pinned),
        excluded: Boolean(message.memory_excluded),
        tagsText: messageTagsText(message)
      };
    }

    setMessages(nextMessages);
    setMessageDrafts(nextDrafts);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void Promise.all([loadCredentialsView(), loadConversationsData(), loadMemoryControlsData()]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadConversationsData, loadCredentialsView, loadMemoryControlsData]);

  useEffect(() => {
    if (selectedConversationId) {
      /* eslint-disable react-hooks/set-state-in-effect */
      void loadConversationDetail(selectedConversationId);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [loadConversationDetail, selectedConversationId]);

  const handleRefreshAll = async () => {
    await Promise.all([loadCredentialsView(), loadConversationsData(), loadMemoryControlsData()]);
    if (selectedConversationId) {
      await loadConversationDetail(selectedConversationId);
    }
  };

  const updateDraft = (messageId: string, updater: (current: MessageMemoryDraft) => MessageMemoryDraft) => {
    setMessageDrafts((prev) => {
      const current = prev[messageId] || { pinned: false, excluded: false, tagsText: "" };
      return {
        ...prev,
        [messageId]: updater(current)
      };
    });
  };

  const handleSaveMessageMemory = async (message: GatewayConversationMessage) => {
    if (!selectedConversationId) {
      return;
    }
    const messageId = messageIdOf(message);
    if (!messageId) {
      return;
    }
    const draft = messageDrafts[messageId] || {
      pinned: false,
      excluded: false,
      tagsText: ""
    };

    setMessageSaveBusyId(messageId);
    setDetailError(null);
    const result = await updateMessageMemory(selectedConversationId, messageId, {
      memory_pinned: draft.pinned,
      memory_excluded: draft.excluded,
      memory_tags: parseTagsText(draft.tagsText)
    });
    setMessageSaveBusyId(null);

    if (!result.ok) {
      setDetailError(result.error);
      return;
    }

    setNotice("Message memory updated.");
    await loadConversationDetail(selectedConversationId);
    await loadMemoryControlsData();
  };

  const runConversationAction = async (kind: "summarize" | "reset-summary" | "clear" | "export") => {
    if (!selectedConversationId) {
      return;
    }

    setActionBusy(kind);
    setDetailError(null);
    setNotice(null);
    setExportJson(null);

    if (kind === "summarize") {
      const result = await summarizeConversation(selectedConversationId);
      setActionBusy(null);
      if (!result.ok) {
        setDetailError(result.error);
        return;
      }
      setNotice("Summary refreshed.");
      await loadConversationDetail(selectedConversationId);
      return;
    }

    if (kind === "reset-summary") {
      const result = await resetConversationSummary(selectedConversationId);
      setActionBusy(null);
      if (!result.ok) {
        setDetailError(result.error);
        return;
      }
      setNotice("Summary reset.");
      await loadConversationDetail(selectedConversationId);
      return;
    }

    if (kind === "clear") {
      const result = await clearConversation(selectedConversationId);
      setActionBusy(null);
      if (!result.ok) {
        setDetailError(result.error);
        return;
      }
      setNotice("Conversation clear request sent.");
      await Promise.all([loadConversationsData(), loadConversationDetail(selectedConversationId), loadMemoryControlsData()]);
      return;
    }

    const result = await exportConversation(selectedConversationId, {
      include_metadata: true,
      messages_order: "asc"
    });
    setActionBusy(null);
    if (!result.ok) {
      setDetailError(result.error);
      return;
    }
    setNotice("Conversation export loaded below.");
    setExportJson(JSON.stringify(redactSensitiveMemoryValue(result.data), null, 2));
  };

  const handleRunRecallTest = async () => {
    setRecallBusy(true);
    setRecallError(null);
    setRecallResult([]);
    const parsedTopK = Number.parseInt(recallTopK, 10);
    const result = await runSemanticRecallTest({
      text: recallText,
      top_k: Number.isNaN(parsedTopK) ? undefined : parsedTopK,
      scope: recallScope,
      include_archived: recallIncludeArchived
    });
    setRecallBusy(false);
    if (!result.ok) {
      setRecallError(result.error);
      return;
    }
    const rows = (result.data.matches || result.data.data || result.data.items || []).slice(0, 50);
    setRecallResult(Array.isArray(rows) ? rows : []);
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <Panel accent="violet" className="p-6 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-neural-text-primary sm:text-4xl">Memory</h1>
              <Badge variant="ai" withDot>
                semantic
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neural-text-secondary">
              Inspect and manage Gateway conversations, summaries, and message memory controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefreshAll()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:bg-white/[0.08] hover:text-neural-cyan disabled:cursor-not-allowed disabled:opacity-60"
            disabled={conversationsLoading || detailLoading || recallBusy}
          >
            <RefreshCw className={`h-4 w-4 ${conversationsLoading || detailLoading || recallBusy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </Panel>

      {notice ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>
      ) : null}

      {conversationsError ? (
        <ErrorBanner code={conversationsError.code} message={conversationsError.message}>
          <p className="mt-2">
            Check Gateway credentials in{" "}
            <Link href="/settings/gateway" className="underline underline-offset-2">
              Settings {"->"} Gateway Credentials
            </Link>
            .
          </p>
        </ErrorBanner>
      ) : null}

      {detailError ? (
        <ErrorBanner code={detailError.code} message={detailError.message} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="space-y-4 p-6">
          <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
            Conversation Search / List
          </h2>
          <div className="space-y-2">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-neural-text-muted/30 bg-neural-input px-3 py-2 text-sm text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                placeholder="limit"
                className="w-full rounded-lg border border-neural-text-muted/30 bg-neural-input px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
              <input
                value={offset}
                onChange={(event) => setOffset(event.target.value)}
                placeholder="offset"
                className="w-full rounded-lg border border-neural-text-muted/30 bg-neural-input px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-neural-text-secondary">
              <input
                type="checkbox"
                checked={archivedOnly}
                onChange={(event) => setArchivedOnly(event.target.checked)}
                className="h-4 w-4 rounded border-neural-text-muted/30 bg-neural-input"
              />
              archived only
            </label>
            <button
              type="button"
              onClick={() => void loadConversationsData()}
              disabled={conversationsLoading}
              className="w-full rounded-lg border border-neural-cyan/35 bg-neural-cyan/12 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-cyan hover:bg-neural-cyan/20 disabled:opacity-60"
            >
              {conversationsLoading ? "Loading..." : "Search / Refresh List"}
            </button>
          </div>

          <div className="neural-scroll max-h-[58vh] space-y-2 overflow-y-auto pr-1">
            {conversations.length === 0 && !conversationsLoading ? (
              <EmptyState title="No conversations found." className="p-3 text-xs" />
            ) : null}
            {conversations.map((conversation, index) => {
              const id = toConversationId(conversation);
              const active = id && id === selectedConversationId;
              const summaryExists = Boolean(conversation.summary_exists);
              const archived = Boolean(conversation.archived || conversation.archived_at);
              return (
                <button
                  key={id || `${conversation.title || "conversation"}-${index}`}
                  type="button"
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-neural-cyan/45 bg-neural-cyan/12 text-neural-cyan"
                      : "border-neural-text-muted/25 bg-neural-overlay/35 text-neural-text-primary hover:bg-neural-overlay/55"
                  }`}
                >
                  <p className="text-sm font-medium">{toConversationTitle(conversation)}</p>
                  <p className="mt-1"><TokenTag>{id || "id unavailable"}</TokenTag></p>
                  <p className="mt-1 font-mono text-[11px] text-neural-text-secondary">
                    messages: {typeof conversation.message_count === "number" ? conversation.message_count : "-"} | summary:{" "}
                    {summaryExists ? "yes" : "no"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-neural-text-muted">
                    last: {formatDateTime(conversation.last_message_at || conversation.updated_at || conversation.created_at)}
                    {archived ? " | archived" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="space-y-4 p-6">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
              Conversation Detail
            </h2>
            {!selectedConversationId ? (
              <p className="mt-2 text-sm text-neural-text-secondary">Select a conversation to view details and memory controls.</p>
            ) : (
              <div className="mt-2 grid gap-1 text-xs text-neural-text-secondary">
                <p>
                  id: <TokenTag>{selectedConversationId}</TokenTag>
                </p>
                <p>title: {toConversationTitle(selectedConversation)}</p>
                <p>created_at: {formatDateTime(selectedConversation?.created_at)}</p>
                <p>updated_at: {formatDateTime(selectedConversation?.updated_at)}</p>
                <p>last_message_at: {formatDateTime(selectedConversation?.last_message_at)}</p>
                <p>message_count: {typeof selectedConversation?.message_count === "number" ? selectedConversation.message_count : "-"}</p>
                <p>summary_exists: {selectedConversation?.summary_exists ? "yes" : "no"}</p>
                {selectedConversation?.summary ? (
                  <p>summary preview: {truncateText(String(selectedConversation.summary), 220)}</p>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runConversationAction("summarize")}
                disabled={!selectedConversationId || Boolean(actionBusy)}
                className="rounded-2xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan hover:bg-neural-cyan/25 disabled:opacity-60"
              >
                {actionBusy === "summarize" ? "Running..." : "Summarize / Refresh Summary"}
              </button>
              <ConfirmAction
                confirmMessage="Reset summary for this conversation? Existing summary state may be lost."
                onConfirm={async () => {
                  await runConversationAction("reset-summary");
                }}
                disabled={!selectedConversationId || Boolean(actionBusy)}
                className="rounded-2xl border border-neural-amber/40 bg-neural-amber/15 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-amber hover:bg-neural-amber/25 disabled:opacity-60"
              >
                {actionBusy === "reset-summary" ? "Running..." : "Reset Summary"}
              </ConfirmAction>
              <button
                type="button"
                onClick={() => void runConversationAction("export")}
                disabled={!selectedConversationId || Boolean(actionBusy)}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-60"
              >
                {actionBusy === "export" ? "Exporting..." : "Export"}
              </button>
              <ConfirmAction
                confirmMessage="Clear this conversation now? This can be irreversible depending on Gateway behavior."
                onConfirm={async () => {
                  await runConversationAction("clear");
                }}
                disabled={!selectedConversationId || Boolean(actionBusy)}
                className="rounded-2xl border border-neural-red/40 bg-neural-red/15 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-rose-100 hover:bg-neural-red/25 disabled:opacity-60"
              >
                {actionBusy === "clear" ? "Running..." : "Clear Conversation"}
              </ConfirmAction>
            </div>

            {exportJson ? (
              <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
                  Export JSON
                </summary>
                <button
                  type="button"
                  onClick={async () => {
                    const copied = await copyText(exportJson);
                    setNotice(copied ? "Export JSON copied." : "Copy failed.");
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary hover:border-neural-cyan/40"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy JSON
                </button>
                <TerminalBlock className="mt-2 max-h-72">{exportJson}</TerminalBlock>
              </details>
            ) : null}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
              Messages Viewer
            </h2>
            {detailLoading ? <LoadingBlock label="Loading messages..." className="mt-3 p-3 text-xs" /> : null}
            {!detailLoading && messages.length === 0 ? (
              <EmptyState title="No messages loaded." className="mt-3 p-3 text-xs" />
            ) : null}

            <div className="neural-scroll mt-3 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
              {messages.map((message, index) => {
                const id = messageIdOf(message);
                const draft = messageDrafts[id] || { pinned: false, excluded: false, tagsText: "" };
                const busy = messageSaveBusyId === id;
                return (
                  <article key={id || `${message.role || "role"}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neural-text-secondary">
                      <span>
                        message_id: <TokenTag>{id || "-"}</TokenTag>
                      </span>
                      <span>role: {String(message.role || "-")}</span>
                      <span>{formatDateTime(message.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-neural-text-primary">{truncateText(message.content, 500) || "-"}</p>

                    <div className="mt-2 grid gap-2 md:grid-cols-[repeat(2,minmax(0,140px))_minmax(0,1fr)_auto]">
                      <label className="flex items-center gap-2 text-xs text-neural-text-secondary">
                        <input
                          type="checkbox"
                          checked={draft.pinned}
                          onChange={(event) =>
                            updateDraft(id, (current) => ({ ...current, pinned: event.target.checked }))
                          }
                        />
                        pinned
                      </label>
                      <label className="flex items-center gap-2 text-xs text-neural-text-secondary">
                        <input
                          type="checkbox"
                          checked={draft.excluded}
                          onChange={(event) =>
                            updateDraft(id, (current) => ({ ...current, excluded: event.target.checked }))
                          }
                        />
                        excluded
                      </label>
                      <input
                        value={draft.tagsText}
                        onChange={(event) =>
                          updateDraft(id, (current) => ({ ...current, tagsText: event.target.value }))
                        }
                        placeholder="tags: comma,separated"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-cyan/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveMessageMemory(message)}
                        disabled={!selectedConversationId || !id || busy}
                        className="rounded-2xl border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-2 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan hover:bg-neural-cyan/25 disabled:opacity-60"
                      >
                        {busy ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">
              Memory Controls Overview
            </h2>
            {memoryControlsError ? (
              <p className="mt-2 text-xs text-rose-200">
                {memoryControlsError.code}: {memoryControlsError.message}
              </p>
            ) : null}
            {!memoryControlsError && !memoryControls ? (
              <p className="mt-2 text-xs text-slate-300">No memory control data returned.</p>
            ) : null}
            {memoryControls ? (
              <TerminalBlock className="mt-2 max-h-48">{safeStringify(redactSensitiveMemoryValue(memoryControls))}</TerminalBlock>
            ) : null}
          </article>

          <article className="rounded-2xl border border-neural-violet/28 bg-neural-violet/8 p-4">
            <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-violet-200">
              Semantic Recall Test
            </h2>
            {!adminConfigured ? (
              <p className="mt-2 text-xs text-amber-200">
                Internal admin token is required. Configure in{" "}
                <Link href="/settings/gateway" className="underline underline-offset-2">
                  Settings {"->"} Gateway Credentials
                </Link>
                .
              </p>
            ) : null}
            {credentialsError ? (
              <p className="mt-2 text-xs text-rose-200">
                {credentialsError.code}: {credentialsError.message}
              </p>
            ) : null}

            <div className="mt-2 space-y-2">
              <textarea
                value={recallText}
                onChange={(event) => setRecallText(event.target.value)}
                rows={4}
                placeholder="Enter text for recall test..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary focus:border-neural-violet/60 focus:outline-none"
              />
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  value={recallTopK}
                  onChange={(event) => setRecallTopK(event.target.value)}
                  placeholder="top_k (optional)"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-neural-text-primary focus:border-neural-violet/60 focus:outline-none"
                />
                <input
                  value={recallScope}
                  onChange={(event) => setRecallScope(event.target.value)}
                  placeholder="scope (optional)"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary focus:border-neural-violet/60 focus:outline-none"
                />
                <label className="flex items-center gap-2 text-xs text-violet-200">
                  <input
                    type="checkbox"
                    checked={recallIncludeArchived}
                    onChange={(event) => setRecallIncludeArchived(event.target.checked)}
                  />
                  include_archived
                </label>
              </div>
              <button
                type="button"
                onClick={() => void handleRunRecallTest()}
                disabled={recallBusy || !adminConfigured}
                className="rounded-2xl border border-neural-violet/40 bg-neural-violet/16 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-violet-200 hover:bg-neural-violet/28 disabled:opacity-60"
              >
                {recallBusy ? "Running..." : "Run recall test"}
              </button>
            </div>

            {recallError ? (
              <p className="mt-2 text-xs text-rose-200">
                {recallError.code}: {recallError.message}
              </p>
            ) : null}

            {recallResult.length > 0 ? (
              <div className="mt-2 space-y-2">
                {recallResult.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-xs text-slate-200">
                    <TerminalBlock className="max-h-40">{safeStringify(redactSensitiveMemoryValue(item))}</TerminalBlock>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </Panel>
      </div>
    </section>
  );
}
