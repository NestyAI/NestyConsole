"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Loader2, Menu, RefreshCcw, Send, Square, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { TokenTag } from "@/components/ui/token-tag";
import { ProOrchestrationDetails } from "@/components/chat/pro-orchestration-details";
import { OutputSafetyDetails } from "@/components/chat/output-safety-details";
import { ProviderFallbackDetails } from "@/components/chat/provider-fallback-details";
import { ChatCanvasRenderer } from "@/components/chat/chat-canvas-renderer";
import {
  archiveOrDeleteConversation,
  formatConversationTitle,
  getConversationMessages,
  listConversations,
  renameConversation,
  type ConversationListItem
} from "@/lib/chat/conversations";
import { readChatCompletionStream } from "@/lib/chat/stream";
import type {
  ChatCompletionMetadata,
  ChatCompletionResponse,
  ChatMessage,
  ChatRequest,
  ChatStreamEvent,
  GatewayOutputSafetyMetadata,
  GatewayProviderAttempt,
  GatewayProviderError,
  GatewayRuntimeFallbackMetadata,
  GatewayConversationMessage
} from "@/lib/gateway/types";

type UiMessage = ChatMessage & {
  id: string;
};

type ConsoleError = {
  code: string;
  message: string;
};

type UiNotice = {
  kind: "info" | "success";
  message: string;
};

const MODELS = ["nesty-flash-1.0", "nesty-combined-1.0", "nesty-pro-1.0"] as const;
const QUICK_PROMPTS = [
  "Say hello from NestyAI Gateway.",
  "Summarize what NestyAI Gateway can do.",
  "Test provider routing with a short answer."
] as const;
const PREFERENCES_KEY = "nesty-console.chat.preferences.v1";

type ChatPreferences = {
  model: (typeof MODELS)[number];
  search: "auto" | "on" | "off";
  tools: "auto" | "off";
  store: boolean;
  semanticRecall: "auto" | "on" | "off";
  stream: boolean;
  temperature: string;
  maxTokens: string;
  showSystemPrompt: boolean;
  systemPrompt: string;
};

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractAssistantText(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  return String(data?.choices?.[0]?.message?.content || "");
}

function parseErrorPayload(payload: unknown): ConsoleError {
  const envelope = payload as {
    error?: {
      code?: string;
      message?: string;
    };
  };
  return {
    code: String(envelope?.error?.code || "unknown_error"),
    message: String(envelope?.error?.message || "Chat request failed.")
  };
}

function extractConversationId(payload: unknown): string | null {
  const data = payload as {
    conversation_id?: unknown;
    conversation?: {
      id?: unknown;
    };
  };
  const id = String(data?.conversation?.id || data?.conversation_id || "").trim();
  return id || null;
}

type TolerantPayload = {
  model?: unknown;
  model_alias?: unknown;
  provider?: unknown;
  conversation_id?: unknown;
  conversation?: { id?: unknown };
  usage?: unknown;
  orchestration?: unknown;
  output_safety?: unknown;
  attempted_providers?: unknown;
  provider_errors?: unknown;
  selected_provider?: unknown;
  selected_model?: unknown;
  fallback_used?: unknown;
  fallback_reason?: unknown;
  metadata?: unknown;
  mode?: unknown;
  used?: unknown;
  [key: string]: unknown;
};

function extractMetadata(payload: unknown): Partial<ChatCompletionMetadata> {
  const data = payload as TolerantPayload || {};
  const metadataObj = data.metadata && typeof data.metadata === "object" ? (data.metadata as TolerantPayload) : null;

  const model = String(data.model || metadataObj?.model || "").trim() || undefined;
  const modelAlias = String(data.model_alias || metadataObj?.model_alias || "").trim() || undefined;
  const provider = String(data.provider || metadataObj?.provider || "").trim() || undefined;
  const conversationId = (extractConversationId(data) || (metadataObj ? extractConversationId(metadataObj) : null)) || undefined;

  const rawUsage = (data.usage || metadataObj?.usage) as Record<string, unknown> | null | undefined;
  const usage = rawUsage && typeof rawUsage === "object"
    ? {
        prompt_tokens: typeof rawUsage.prompt_tokens === "number" ? rawUsage.prompt_tokens : undefined,
        completion_tokens: typeof rawUsage.completion_tokens === "number" ? rawUsage.completion_tokens : undefined,
        total_tokens: typeof rawUsage.total_tokens === "number" ? rawUsage.total_tokens : undefined
      }
    : undefined;

  const rawOutputSafety = (data.output_safety || metadataObj?.output_safety) as Record<string, unknown> | null | undefined;
  const outputSafety: GatewayOutputSafetyMetadata | undefined =
    rawOutputSafety && typeof rawOutputSafety === "object"
      ? {
          internal_tool_markup_detected:
            typeof rawOutputSafety.internal_tool_markup_detected === "boolean"
              ? rawOutputSafety.internal_tool_markup_detected
              : undefined,
          internal_tool_markup_removed:
            typeof rawOutputSafety.internal_tool_markup_removed === "boolean"
              ? rawOutputSafety.internal_tool_markup_removed
              : undefined
        }
      : undefined;

  const toProviderAttempt = (item: unknown): GatewayProviderAttempt | null => {
    if (typeof item === "string") {
      const provider = item.trim();
      return provider ? { provider } : null;
    }
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      provider: typeof row.provider === "string" ? row.provider : undefined,
      model: typeof row.model === "string" ? row.model : undefined,
      status: typeof row.status === "string" ? row.status : undefined,
      error_code: typeof row.error_code === "string" ? row.error_code : undefined,
      upstream_status:
        typeof row.upstream_status === "number" || typeof row.upstream_status === "string"
          ? row.upstream_status
          : null,
      latency_ms: typeof row.latency_ms === "number" ? row.latency_ms : null
    };
  };

  const toProviderError = (item: unknown): GatewayProviderError | null => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      provider: typeof row.provider === "string" ? row.provider : undefined,
      model: typeof row.model === "string" ? row.model : undefined,
      error_code: typeof row.error_code === "string" ? row.error_code : undefined,
      upstream_status:
        typeof row.upstream_status === "number" || typeof row.upstream_status === "string"
          ? row.upstream_status
          : null
    };
  };

  const rawAttempts = data.attempted_providers ?? metadataObj?.attempted_providers;
  const attemptedProviders = Array.isArray(rawAttempts)
    ? rawAttempts.map(toProviderAttempt).filter((item): item is GatewayProviderAttempt => Boolean(item))
    : undefined;

  const rawProviderErrors = data.provider_errors ?? metadataObj?.provider_errors;
  const providerErrors = Array.isArray(rawProviderErrors)
    ? rawProviderErrors.map(toProviderError).filter((item): item is GatewayProviderError => Boolean(item))
    : undefined;

  const selectedProvider = String(data.selected_provider || metadataObj?.selected_provider || "").trim() || undefined;
  const selectedModel = String(data.selected_model || metadataObj?.selected_model || "").trim() || undefined;
  const fallbackUsedRaw = data.fallback_used ?? metadataObj?.fallback_used;
  const fallbackUsed = typeof fallbackUsedRaw === "boolean" ? fallbackUsedRaw : undefined;
  const fallbackReasonRaw = data.fallback_reason ?? metadataObj?.fallback_reason;
  const fallbackReason =
    typeof fallbackReasonRaw === "string" ? fallbackReasonRaw.trim() || null : fallbackReasonRaw === null ? null : undefined;

  // Tolerant orchestration lookup
  const hasOrchFields = (obj: unknown): boolean => {
    if (!obj || typeof obj !== "object") return false;
    const r = obj as Record<string, unknown>;
    return (
      "mode" in r ||
      "used" in r ||
      "requested" in r ||
      "decision_reason" in r ||
      "complexity_score" in r ||
      "roles" in r ||
      "completed_roles" in r ||
      "failed_roles" in r ||
      "skipped_roles" in r ||
      "internal_calls" in r ||
      "fallback_used" in r ||
      "fallback_reason" in r ||
      "streaming_fallback" in r ||
      "total_latency_ms" in r ||
      "role_latency_ms" in r
    );
  };

  let rawOrch: Record<string, unknown> | null | undefined = undefined;
  if (metadataObj && metadataObj.orchestration && typeof metadataObj.orchestration === "object") {
    rawOrch = metadataObj.orchestration as Record<string, unknown>;
  } else if (data.orchestration && typeof data.orchestration === "object") {
    rawOrch = data.orchestration as Record<string, unknown>;
  } else if (hasOrchFields(metadataObj)) {
    rawOrch = metadataObj as Record<string, unknown>;
  } else if (hasOrchFields(data)) {
    rawOrch = data as Record<string, unknown>;
  }

  const orchestration = rawOrch && typeof rawOrch === "object"
    ? {
        requested: rawOrch.requested,
        used: rawOrch.used as boolean | undefined,
        mode: rawOrch.mode as string | undefined,
        decision_reason: rawOrch.decision_reason as string | null | undefined,
        complexity_score: rawOrch.complexity_score as number | null | undefined,
        roles: Array.isArray(rawOrch.roles) ? (rawOrch.roles as string[]) : undefined,
        completed_roles: Array.isArray(rawOrch.completed_roles) ? (rawOrch.completed_roles as string[]) : undefined,
        failed_roles: Array.isArray(rawOrch.failed_roles) ? (rawOrch.failed_roles as string[]) : undefined,
        skipped_roles: Array.isArray(rawOrch.skipped_roles) ? (rawOrch.skipped_roles as string[]) : undefined,
        internal_calls: typeof rawOrch.internal_calls === "number" ? rawOrch.internal_calls : undefined,
        fallback_used: rawOrch.fallback_used as boolean | undefined,
        fallback_reason: rawOrch.fallback_reason as string | null | undefined,
        streaming_fallback: rawOrch.streaming_fallback as boolean | undefined,
        total_latency_ms: typeof rawOrch.total_latency_ms === "number" ? rawOrch.total_latency_ms : undefined,
        role_latency_ms: rawOrch.role_latency_ms && typeof rawOrch.role_latency_ms === "object" ? (rawOrch.role_latency_ms as Record<string, number>) : undefined
      }
    : undefined;

  // Filter out undefined properties to avoid overwriting during merge
  const cleanOrch = orchestration
    ? Object.fromEntries(Object.entries(orchestration).filter(([, v]) => v !== undefined))
    : undefined;

  return {
    model,
    model_alias: modelAlias,
    provider,
    conversation_id: conversationId,
    usage,
    orchestration: cleanOrch,
    output_safety: outputSafety,
    attempted_providers: attemptedProviders,
    provider_errors: providerErrors,
    selected_provider: selectedProvider,
    selected_model: selectedModel,
    fallback_used: fallbackUsed,
    fallback_reason: fallbackReason
  };
}

function getTextValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function getBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getModelValue(value: unknown, fallback: (typeof MODELS)[number]): (typeof MODELS)[number] {
  if (typeof value === "string" && (MODELS as readonly string[]).includes(value)) {
    return value as (typeof MODELS)[number];
  }
  return fallback;
}

function getEnumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

function cleanMerge<T extends Record<string, unknown>>(
  current: T | undefined | null,
  next: Partial<T> | undefined | null
): T | undefined {
  if (!current && !next) return undefined;
  if (!current) {
    const res: Record<string, unknown> = {};
    if (next) {
      for (const key of Object.keys(next)) {
        if (next[key] !== undefined) {
          res[key] = next[key];
        }
      }
    }
    return res as T;
  }
  if (!next) return current;

  const res: Record<string, unknown> = { ...current };
  for (const key of Object.keys(next)) {
    if (next[key] !== undefined) {
      res[key] = next[key];
    }
  }
  return res as T;
}

function mergeMetadata(
  current: ChatCompletionMetadata | null,
  next: Partial<ChatCompletionMetadata>
): ChatCompletionMetadata | null {
  const base = current || {};

  const model = next.model !== undefined ? next.model : base.model;
  const model_alias = next.model_alias !== undefined ? next.model_alias : base.model_alias;
  const provider = next.provider !== undefined ? next.provider : base.provider;
  const conversation_id = next.conversation_id !== undefined ? next.conversation_id : base.conversation_id;

  const usage = cleanMerge(base.usage as Record<string, unknown> | null, next.usage as Record<string, unknown> | null);
  const orchestration = cleanMerge(
    base.orchestration as Record<string, unknown> | null,
    next.orchestration as Record<string, unknown> | null
  );
  const outputSafety = cleanMerge(
    base.output_safety as Record<string, unknown> | null,
    next.output_safety as Record<string, unknown> | null
  );

  const attempted_providers = next.attempted_providers !== undefined ? next.attempted_providers : base.attempted_providers;
  const provider_errors = next.provider_errors !== undefined ? next.provider_errors : base.provider_errors;
  const selected_provider = next.selected_provider !== undefined ? next.selected_provider : base.selected_provider;
  const selected_model = next.selected_model !== undefined ? next.selected_model : base.selected_model;
  const fallback_used = next.fallback_used !== undefined ? next.fallback_used : base.fallback_used;
  const fallback_reason = next.fallback_reason !== undefined ? next.fallback_reason : base.fallback_reason;

  return {
    model,
    model_alias,
    provider,
    conversation_id,
    usage: usage as ChatCompletionMetadata["usage"],
    orchestration: orchestration as ChatCompletionMetadata["orchestration"],
    output_safety: outputSafety as ChatCompletionMetadata["output_safety"],
    attempted_providers,
    provider_errors,
    selected_provider,
    selected_model,
    fallback_used,
    fallback_reason
  };
}

function buildTranscript(messages: UiMessage[]): string {
  return messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
}

function shortConversationLabel(id: string): string {
  if (id.length <= 20) {
    return id;
  }
  return `${id.slice(0, 8)}...${id.slice(-8)}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) {
    return false;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    if (typeof document === "undefined") {
      return false;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function formatDateTime(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  return value.toLocaleString();
}

function normalizeMessageRole(rawRole: unknown): "system" | "user" | "assistant" {
  const role = String(rawRole || "").trim().toLowerCase();
  if (role === "system" || role === "user" || role === "assistant") {
    return role;
  }
  if (role === "tool") {
    return "assistant";
  }
  return "system";
}

function normalizeMessageContent(rawContent: unknown): string {
  if (typeof rawContent === "string") {
    return rawContent;
  }
  if (Array.isArray(rawContent)) {
    return rawContent
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item) {
          const text = (item as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (rawContent && typeof rawContent === "object") {
    try {
      return JSON.stringify(rawContent);
    } catch {
      return "";
    }
  }
  return "";
}

function conversationMessagesToUi(messages: GatewayConversationMessage[]): UiMessage[] {
  return messages
    .map((item) => {
      const content = normalizeMessageContent(item.content);
      if (!content.trim()) {
        return null;
      }
      const role = normalizeMessageRole(item.role);
      return {
        id: String(item.id || makeId()),
        role,
        content
      } satisfies UiMessage;
    })
    .filter((item): item is UiMessage => Boolean(item));
}

export default function ChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<(typeof MODELS)[number]>("nesty-combined-1.0");
  const [search, setSearch] = useState<"auto" | "on" | "off">("auto");
  const [tools, setTools] = useState<"auto" | "off">("auto");
  const [store, setStore] = useState(true);
  const [semanticRecall, setSemanticRecall] = useState<"auto" | "on" | "off">("auto");
  const [stream, setStream] = useState(true);
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ConsoleError | null>(null);
  const [notice, setNotice] = useState<UiNotice | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [streamingStopped, setStreamingStopped] = useState(false);
  const [responseMetadata, setResponseMetadata] = useState<ChatCompletionMetadata | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [messageModes, setMessageModes] = useState<Record<string, "rendered" | "raw">>({});

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationQuery, setConversationQuery] = useState("");
  const [conversationSearchInput, setConversationSearchInput] = useState("");
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<ConsoleError | null>(null);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [conversationActionBusyId, setConversationActionBusyId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const preferencesHydratedRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = window.localStorage.getItem(PREFERENCES_KEY);
      if (!raw) {
        preferencesHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<ChatPreferences>;
      setModel((current) => getModelValue(parsed.model, current));
      setSearch((current) => getEnumValue(parsed.search, ["auto", "on", "off"], current));
      setTools((current) => getEnumValue(parsed.tools, ["auto", "off"], current));
      setStore((current) => getBooleanValue(parsed.store, current));
      setSemanticRecall((current) => getEnumValue(parsed.semanticRecall, ["auto", "on", "off"], current));
      setStream((current) => getBooleanValue(parsed.stream, current));
      setTemperature((current) => getTextValue(parsed.temperature, current));
      setMaxTokens((current) => getTextValue(parsed.maxTokens, current));
      setShowSystemPrompt((current) => getBooleanValue(parsed.showSystemPrompt, current));
      setSystemPrompt((current) => getTextValue(parsed.systemPrompt, current));
    } catch {
      // Ignore malformed preferences.
    } finally {
      preferencesHydratedRef.current = true;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!preferencesHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const preferences: ChatPreferences = {
      model,
      search,
      tools,
      store,
      semanticRecall,
      stream,
      temperature,
      maxTokens,
      showSystemPrompt,
      systemPrompt
    };

    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [model, search, tools, store, semanticRecall, stream, temperature, maxTokens, showSystemPrompt, systemPrompt]);

  const sidebarCredentialError = useMemo(
    () =>
      conversationsError?.code === "credentials_not_configured" ||
      conversationsError?.code === "invalid_gateway_api_key",
    [conversationsError?.code]
  );

  const pushNotice = (kind: UiNotice["kind"], message: string) => {
    setNotice({ kind, message });
  };

  const loadConversations = async (options: { silent?: boolean; query?: string } = {}) => {
    const silent = Boolean(options.silent);
    const query = options.query ?? conversationQuery;
    if (!silent) {
      setConversationsLoading(true);
    }
    setConversationsError(null);

    const result = await listConversations({
      limit: 50,
      offset: 0,
      q: query || undefined
    });

    if (!result.ok) {
      setConversationsError(result.error);
      if (!silent) {
        setConversations([]);
      }
    } else {
      setConversations(result.data.items);
    }

    if (!silent) {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadConversations();
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStreaming = () => {
    if (!sending || !abortRef.current) {
      return;
    }
    stopRequestedRef.current = true;
    abortRef.current.abort();
  };

  const updateAssistantContent = (assistantId: string, appendText: string) => {
    if (!appendText) {
      return;
    }
    setMessages((prev) =>
      prev.map((item) => (item.id === assistantId ? { ...item, content: `${item.content}${appendText}` } : item))
    );
  };

  const replaceAssistantContent = (assistantId: string, nextContent: string) => {
    setMessages((prev) => prev.map((item) => (item.id === assistantId ? { ...item, content: nextContent } : item)));
  };

  const removeMessageById = (messageId: string) => {
    setMessages((prev) => prev.filter((item) => item.id !== messageId));
  };

  const handleCopy = async (text: string, key: string) => {
    const copied = await copyTextToClipboard(text);
    if (!copied) {
      pushNotice("info", "Copy failed on this browser.");
      return;
    }
    setCopiedKey(key);
    pushNotice("success", "Copied.");
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1400);
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setResponseMetadata(null);
    setError(null);
    setStreamingStopped(false);
    pushNotice("info", "Started a new chat context.");
  };

  const clearMessagesOnly = () => {
    const confirmed = window.confirm(
      "Clear local chat messages now? This only clears this browser view, but cannot be undone locally."
    );
    if (!confirmed) {
      return;
    }

    setMessages([]);
    setError(null);
    setStreamingStopped(false);
    setResponseMetadata((current) =>
      current
        ? {
            ...current,
            usage: undefined
          }
        : current
    );

    if (conversationId) {
      pushNotice("info", "Cleared local messages. Active conversation context remains set.");
    } else {
      pushNotice("info", "Cleared local messages.");
    }
  };

  const openConversation = async (item: ConversationListItem) => {
    setOpeningConversationId(item.id);
    setConversationsError(null);

    const result = await getConversationMessages(item.id, {
      limit: 50,
      offset: 0,
      order: "asc"
    });

    setOpeningConversationId(null);

    if (!result.ok) {
      setConversationsError(result.error);
      pushNotice("info", `Unable to open conversation: ${result.error.message}`);
      return;
    }

    const loadedMessages = conversationMessagesToUi(result.data.items);
    setMessages(loadedMessages);
    setConversationId(item.id);
    // Find the last assistant message to populate responseMetadata
    const lastAssistantMessage = [...result.data.items].reverse().find((row) => row.role === "assistant");
    if (lastAssistantMessage) {
      const extracted = extractMetadata(lastAssistantMessage);
      extracted.conversation_id = item.id;
      setResponseMetadata(extracted);
    } else {
      setResponseMetadata({
        conversation_id: item.id
      });
    }

    const latestUser = [...loadedMessages].reverse().find((row) => row.role === "user");
    setLastUserMessage(latestUser?.content || "");
    setSidebarOpen(false);
    setStreamingStopped(false);
    setError(null);
    pushNotice("info", `Opened ${formatConversationTitle(item.raw)}.`);
  };

  const handleRenameConversation = async (item: ConversationListItem) => {
    const currentTitle = formatConversationTitle(item.raw);
    const nextTitle = window.prompt("Rename conversation", currentTitle);
    if (!nextTitle || !nextTitle.trim() || nextTitle.trim() === currentTitle.trim()) {
      return;
    }

    setConversationActionBusyId(item.id);
    const result = await renameConversation(item.id, nextTitle.trim());
    setConversationActionBusyId(null);

    if (!result.ok) {
      setConversationsError(result.error);
      pushNotice("info", `Rename failed: ${result.error.message}`);
      return;
    }

    pushNotice("success", "Conversation renamed.");
    await loadConversations({ silent: true });
  };

  const handleArchiveConversation = async (item: ConversationListItem) => {
    const confirmed = window.confirm(
      "Archive this conversation? It will be hidden from active view and may require filters to reopen."
    );
    if (!confirmed) {
      return;
    }

    setConversationActionBusyId(item.id);
    const result = await archiveOrDeleteConversation(item.id, true);
    setConversationActionBusyId(null);

    if (!result.ok) {
      setConversationsError(result.error);
      pushNotice("info", `Archive failed: ${result.error.message}`);
      return;
    }

    if (conversationId === item.id) {
      setConversationId(null);
      setMessages([]);
    }
    pushNotice("success", "Conversation archived.");
    await loadConversations({ silent: true });
  };

  const handleDeleteConversation = async (item: ConversationListItem) => {
    const confirmed = window.confirm(
      "Delete this conversation? If Gateway handles DELETE as hard-delete, this action is irreversible."
    );
    if (!confirmed) {
      return;
    }

    setConversationActionBusyId(item.id);
    const result = await archiveOrDeleteConversation(item.id, false);
    setConversationActionBusyId(null);

    if (!result.ok) {
      setConversationsError(result.error);
      pushNotice("info", `Delete failed: ${result.error.message}`);
      return;
    }

    if (conversationId === item.id) {
      setConversationId(null);
      setMessages([]);
    }
    pushNotice("success", "Conversation deleted.");
    await loadConversations({ silent: true });
  };

  const sendMessage = async (rawText: string) => {
    if (sending) {
      return;
    }

    const text = rawText.trim();
    if (!text) {
      return;
    }

    setError(null);
    setNotice(null);
    setStreamingStopped(false);
    setSending(true);
    stopRequestedRef.current = false;

    const userMessage: UiMessage = {
      id: makeId(),
      role: "user",
      content: text
    };

    const assistantId = makeId();
    const assistantPlaceholder: UiMessage = {
      id: assistantId,
      role: "assistant",
      content: ""
    };

    const outgoingMessages: ChatMessage[] = [...messages.map(({ role, content }) => ({ role, content })), userMessage];
    const payloadMessages: ChatMessage[] = [...outgoingMessages];

    const systemValue = systemPrompt.trim();
    if (systemValue) {
      payloadMessages.unshift({
        role: "system",
        content: systemValue
      });
    }

    const payload: ChatRequest = {
      model,
      messages: payloadMessages,
      stream,
      search,
      tools,
      store,
      semantic_recall: semanticRecall
    };

    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    if (temperature.trim()) {
      const value = Number(temperature);
      if (!Number.isNaN(value)) {
        payload.temperature = value;
      }
    }

    if (maxTokens.trim()) {
      const value = Number(maxTokens);
      if (!Number.isNaN(value) && value > 0) {
        payload.max_tokens = Math.floor(value);
      }
    }

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setLastUserMessage(text);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const parsedError = parseErrorPayload(errorPayload);
        setError(parsedError);
        removeMessageById(assistantId);
        return;
      }

      if (stream && contentType.includes("text/event-stream")) {
        let assistantHasContent = false;
        let streamHadError = false;

        const streamResult = await readChatCompletionStream(
          response,
          async (event) => {
            if (event.data === "[DONE]") {
              return;
            }

            const json = event.json as ChatStreamEvent | null;
            if (!json) {
              return;
            }

            if (json.error) {
              streamHadError = true;
              setError({
                code: String(json.error.code || "gateway_error"),
                message: String(json.error.message || "Streaming response failed.")
              });
              return;
            }

            const delta = String(json.choices?.[0]?.delta?.content || "");
            if (delta) {
              assistantHasContent = true;
              updateAssistantContent(assistantId, delta);
            }

            const nextConversationId = extractConversationId(json);
            if (nextConversationId) {
              setConversationId(nextConversationId);
            }

            const meta = extractMetadata(json);
            setResponseMetadata((current) => mergeMetadata(current, meta));
          },
          controller.signal
        );

        if (!assistantHasContent && !streamHadError) {
          replaceAssistantContent(assistantId, "(No assistant content returned.)");
          pushNotice("info", "Gateway returned no assistant content for this stream.");
        }

        if (streamResult === "aborted") {
          if (stopRequestedRef.current) {
            setStreamingStopped(true);
            pushNotice("info", "Streaming stopped.");
          }
        } else if (streamResult === "eof" && !streamHadError) {
          pushNotice("info", "Stream ended before [DONE].");
        }
      } else {
        const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
        if (!data) {
          setError({
            code: "unknown_error",
            message: "Gateway returned an invalid chat response."
          });
          removeMessageById(assistantId);
          return;
        }

        const assistantText = extractAssistantText(data).trim();
        if (assistantText) {
          replaceAssistantContent(assistantId, assistantText);
        } else {
          replaceAssistantContent(assistantId, "(No assistant content returned.)");
          pushNotice("info", "Gateway returned no assistant content.");
        }

        const nextConversationId = extractConversationId(data);
        if (nextConversationId) {
          setConversationId(nextConversationId);
        }

        const meta = extractMetadata(data);
        setResponseMetadata((current) => mergeMetadata(current, meta));
      }
      if (store) {
        void loadConversations({ silent: true });
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        if (stopRequestedRef.current) {
          setStreamingStopped(true);
          pushNotice("info", "Streaming stopped.");
        }
      } else {
        setError({
          code: "gateway_unreachable",
          message: "Gateway is unavailable or unreachable from Nesty Console."
        });
        removeMessageById(assistantId);
      }
    } finally {
      abortRef.current = null;
      stopRequestedRef.current = false;
      setSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  const handleInputKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage(input);
    }
  };

  const handleRetry = async () => {
    if (!lastUserMessage.trim() || sending) {
      return;
    }
    await sendMessage(lastUserMessage);
  };

  const handleQuickPrompt = async (prompt: string) => {
    setInput(prompt);
    await sendMessage(prompt);
  };

  const handleConversationSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = conversationSearchInput.trim();
    setConversationQuery(nextQuery);
    await loadConversations({ query: nextQuery });
  };

  const transcript = useMemo(() => buildTranscript(messages), [messages]);
  const activeConversationInList = useMemo(
    () => conversations.find((item) => item.id === conversationId) || null,
    [conversations, conversationId]
  );

  return (
    <section className="space-y-5 animate-fade-in-up">
      <Panel accent="cyan" className="relative overflow-hidden p-6 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-neural-cyan/12 to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="live" withDot>
                streaming
              </Badge>
              <Badge variant="inactive">server-side routes</Badge>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-display text-[10px] uppercase tracking-[0.12em] text-neural-text-secondary">
                protected workspace
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-neural-text-primary sm:text-4xl lg:text-5xl">
              NestyChat Web
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-neural-text-secondary sm:text-base">
              Protected chat UI that uses server-side Console routes only. The message stream, conversation rail, and
              composer now share the same tighter shell language as the rest of the console.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary hover:border-neural-cyan/40 hover:bg-white/[0.08] lg:hidden"
            >
              <Menu className="h-4 w-4" />
              Conversations
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex items-center gap-2 rounded-full border border-neural-cyan/35 bg-neural-cyan/12 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan hover:bg-neural-cyan/22"
            >
              <RefreshCcw className="h-4 w-4" />
              New Chat
            </button>
            <button
              type="button"
              onClick={clearMessagesOnly}
              className="inline-flex items-center gap-2 rounded-full border border-neural-amber/30 bg-neural-amber/10 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-amber hover:bg-neural-amber/18"
            >
              <Trash2 className="h-4 w-4" />
              Clear Messages
            </button>
            <button
              type="button"
              onClick={handleRetry}
              disabled={!lastUserMessage.trim() || sending}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry Last
            </button>
            <button
              type="button"
              onClick={() => void handleCopy(transcript, "transcript")}
              disabled={!messages.length}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
            >
              <Clipboard className="h-4 w-4" />
              {copiedKey === "transcript" ? "Copied" : "Copy Transcript"}
            </button>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-neural-text-secondary">
        {conversationId ? (
          <TokenTag>Conversation: {shortConversationLabel(conversationId)}</TokenTag>
        ) : (
          <TokenTag>No active conversation</TokenTag>
        )}
        {activeConversationInList ? <TokenTag>{formatConversationTitle(activeConversationInList.raw)}</TokenTag> : null}
        {store ? (
          <Badge variant="success">store=on</Badge>
        ) : (
          <Badge variant="warning">store=off</Badge>
        )}
      </div>

      {!store && conversationId ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-sm text-amber-100 shadow-neural-soft">
          store=false means new turns may not be saved to this active Gateway conversation.
        </div>
      ) : null}

      {notice ? (
        <div
          className={`rounded-2xl border p-3 text-sm shadow-neural-soft ${
            notice.kind === "success"
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {streamingStopped ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-sm text-amber-100 shadow-neural-soft">
          Streaming was stopped. Partial content (if any) is kept in the message.
        </div>
      ) : null}

      {error ? (
        <ErrorBanner code={error.code} message={error.message}>
          {error.code === "invalid_gateway_api_key" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from
              Gateway startup logs and update it in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : error.code === "credentials_not_configured" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              Please configure your Gateway URL and API key in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : error.code === "gateway_upstream_failed" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              The Gateway is reachable, but the upstream provider/model chain failed to execute. You can view diagnostics at{" "}
              <Link href="/diagnostics" className="underline underline-offset-2 hover:text-neural-cyan">
                Diagnostics
              </Link>{" "}
              or verify model strategic strategies in{" "}
              <Link href="/model-configs" className="underline underline-offset-2 hover:text-neural-cyan">
                Model Configs
              </Link>
              .
            </p>
          ) : error.code === "gateway_provider_unavailable" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              The requested provider is temporarily unavailable or rate-limited. Verify provider health in{" "}
              <Link href="/diagnostics" className="underline underline-offset-2 hover:text-neural-cyan">
                Diagnostics Dashboard
              </Link>
              .
            </p>
          ) : error.code === "gateway_unreachable" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              Console could not connect to Gateway. Please check your Gateway URL, Cloudflare tunnel status, and local network settings in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Settings
              </Link>{" "}
              or check general{" "}
              <Link href="/status" className="underline underline-offset-2 hover:text-neural-cyan">
                Gateway Status
              </Link>
              .
            </p>
          ) : null}
        </ErrorBanner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(520px,1fr)_minmax(280px,340px)] 2xl:grid-cols-[minmax(280px,340px)_minmax(720px,1fr)_minmax(300px,360px)]">
        <aside className={`${sidebarOpen ? "block" : "hidden"} neural-panel w-full min-w-0 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-neural-soft lg:block`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">Conversations</h2>
            <button
              type="button"
              onClick={() => void loadConversations()}
              disabled={conversationsLoading}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <form onSubmit={handleConversationSearchSubmit} className="space-y-2">
            <input
              value={conversationSearchInput}
              onChange={(event) => setConversationSearchInput(event.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-neural-text-primary outline-none transition placeholder:text-neural-text-muted focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-neural-cyan/35 bg-neural-cyan/10 px-3 py-2.5 font-display text-[11px] uppercase tracking-[0.06em] text-neural-cyan hover:bg-neural-cyan/18"
            >
              Search
            </button>
          </form>

          {conversationsError ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-100">
              <p className="font-medium">{conversationsError.code}</p>
              <p className="mt-1">{conversationsError.message}</p>
              {sidebarCredentialError ? (
                <p className="mt-2">
                  Update credentials in{" "}
                  <Link href="/settings/gateway" className="underline underline-offset-2">
                    Settings {"->"} Gateway Credentials
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="neural-scroll max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {conversationsLoading ? (
              <LoadingBlock label="Loading conversations..." className="p-3 text-xs" />
            ) : conversations.length === 0 ? (
              <EmptyState title="No conversations found." className="p-3 text-xs" />
            ) : (
              conversations.map((item) => {
                const active = item.id === conversationId;
                const busy = conversationActionBusyId === item.id || openingConversationId === item.id;
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-3 transition ${
                      active ? "border-neural-cyan/45 bg-neural-cyan/12 shadow-neural-soft" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openConversation(item)}
                      disabled={busy}
                      className="w-full text-left"
                    >
                      <p className="truncate text-xs font-medium text-neural-text-primary" title={formatConversationTitle(item.raw)}>
                        {formatConversationTitle(item.raw)}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-neural-text-secondary">
                        {item.messageCount !== undefined ? `${item.messageCount} messages` : "message count unknown"}
                      </p>
                      <p className="font-mono text-[11px] text-neural-text-muted">
                        {formatDateTime(item.lastMessageAt || item.updatedAt || item.createdAt) || "time unknown"}
                      </p>
                      {item.archived ? (
                        <p className="mt-1 text-[11px] text-amber-200">archived</p>
                      ) : null}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRenameConversation(item)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleArchiveConversation(item)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 disabled:opacity-50"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeleteConversation(item)}
                        className="rounded-full border border-neural-red/35 bg-neural-red/12 px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-rose-100 hover:bg-neural-red/22 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        <Panel className="flex w-full min-w-0 flex-col overflow-hidden p-0">
          <div className="flex min-h-[50vh] max-h-[72vh] 2xl:max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-neural-elevated/70 shadow-neural-soft w-full min-w-0">
            <div className="neural-scroll flex-1 space-y-3 overflow-y-auto p-4 w-full min-w-0">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-display text-xs uppercase tracking-[0.14em] text-neural-text-secondary">Quick start</p>
                    <p className="text-sm text-neural-text-secondary">Start chatting with NestyAI.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void handleQuickPrompt(prompt)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.06em] text-neural-text-primary hover:border-neural-cyan/40 hover:bg-white/[0.07]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const copyKey = `message:${message.id}`;
                    const isUser = message.role === "user";

                    if (isUser) {
                      return (
                        <article
                          key={message.id}
                          className="animate-message-enter rounded-2xl border border-neural-cyan/35 bg-neural-cyan/10 p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-display text-xs uppercase tracking-[0.08em] text-neural-cyan">{message.role}</p>
                            <button
                              type="button"
                              onClick={() => void handleCopy(message.content, copyKey)}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-secondary transition hover:border-neural-cyan/40 hover:text-neural-text-primary"
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              {copiedKey === copyKey ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-neural-text-primary">{message.content || "..."}</p>
                        </article>
                      );
                    }

                    // Assistant message rendering with canvas renderer and raw/rendered toggles
                    const messageMode = messageModes[message.id] || "rendered";
                    return (
                      <article
                        key={message.id}
                        className="animate-message-enter rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-2 border-b border-white/10 pb-3 select-none">
                          <p className="font-display text-xs uppercase tracking-[0.08em] text-neural-cyan">{message.role}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="inline-flex select-none rounded-full border border-white/10 bg-white/[0.04] p-1">
                              <button
                                type="button"
                                onClick={() => setMessageModes((prev) => ({ ...prev, [message.id]: "rendered" }))}
                                className={`rounded-full px-2.5 py-1 text-[9px] font-display uppercase tracking-wider transition ${
                                  messageMode === "rendered"
                                    ? "bg-neural-cyan/15 text-neural-cyan font-bold"
                                    : "text-neural-text-secondary hover:text-neural-text-primary"
                                }`}
                              >
                                Rendered
                              </button>
                              <button
                                type="button"
                                onClick={() => setMessageModes((prev) => ({ ...prev, [message.id]: "raw" }))}
                                className={`rounded-full px-2.5 py-1 text-[9px] font-display uppercase tracking-wider transition ${
                                  messageMode === "raw"
                                    ? "bg-neural-cyan/15 text-neural-cyan font-bold"
                                    : "text-neural-text-secondary hover:text-neural-text-primary"
                                }`}
                              >
                                Raw
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleCopy(message.content, copyKey)}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-text-secondary transition hover:border-neural-cyan/40 hover:text-neural-text-primary"
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              {copiedKey === copyKey ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <div className="mt-1">
                          <ChatCanvasRenderer content={message.content} mode={messageMode} messageId={message.id} />
                        </div>
                      </article>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="sticky bottom-0 space-y-3 border-t border-white/10 bg-neural-elevated/90 p-4 backdrop-blur">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => void handleInputKeyDown(event)}
                rows={4}
                placeholder="Type your message. Enter to send, Shift+Enter for newline."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-primary outline-none ring-neural-cyan/40 transition placeholder:text-neural-text-muted focus:border-neural-cyan/40 focus:bg-white/[0.05] focus:ring"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-full border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2.5 font-display text-xs uppercase tracking-[0.07em] text-neural-cyan transition hover:bg-neural-cyan/24 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
                {stream ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    disabled={!sending}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 font-display text-xs uppercase tracking-[0.07em] text-neural-text-primary transition hover:border-neural-cyan/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          {responseMetadata ? (() => {
            const msgModel = responseMetadata.model_alias || responseMetadata.model || model;
            return (
              <details
                open={detailsOpen}
                onToggle={(event) => setDetailsOpen((event.target as HTMLDetailsElement).open)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-neural-soft"
              >
                <summary className="cursor-pointer font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">
                  Response Details
                </summary>
                <div className="mt-3 grid gap-2 font-mono text-xs text-neural-text-secondary">
                  {responseMetadata.model ? <p>model: {responseMetadata.model}</p> : null}
                  {responseMetadata.model_alias ? <p>model_alias: {responseMetadata.model_alias}</p> : null}
                  {responseMetadata.provider ? <p>provider: {responseMetadata.provider}</p> : null}
                  {responseMetadata.conversation_id ? <p>conversation_id: {responseMetadata.conversation_id}</p> : null}
                  {responseMetadata.usage?.total_tokens !== undefined ? (
                    <p>
                      tokens: prompt {responseMetadata.usage.prompt_tokens ?? "?"} / completion{" "}
                      {responseMetadata.usage.completion_tokens ?? "?"} / total {responseMetadata.usage.total_tokens}
                    </p>
                  ) : null}
                  {responseMetadata.orchestration ? (
                    <div className="col-span-full font-sans">
                      <ProOrchestrationDetails metadata={responseMetadata.orchestration} />
                    </div>
                  ) : msgModel === "nesty-pro-1.0" ? (
                    <p className="mt-2 text-xs text-neural-text-muted italic col-span-full">
                      No Pro orchestration metadata returned. Gateway may be older than v1.0.4 or this response used a basic fallback path.
                    </p>
                  ) : null}
                  <div className="col-span-full font-sans">
                    <OutputSafetyDetails metadata={responseMetadata.output_safety} />
                  </div>
                  <div className="col-span-full font-sans">
                    <ProviderFallbackDetails
                      metadata={
                        {
                          attempted_providers: responseMetadata.attempted_providers,
                          provider_errors: responseMetadata.provider_errors,
                          selected_provider: responseMetadata.selected_provider,
                          selected_model: responseMetadata.selected_model,
                          fallback_used: responseMetadata.fallback_used,
                          fallback_reason: responseMetadata.fallback_reason
                        } satisfies GatewayRuntimeFallbackMetadata
                      }
                    />
                  </div>
                </div>
              </details>
            );
          })() : null}
        </Panel>

        <aside className="neural-panel w-full min-w-0 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-neural-soft">
          <h2 className="font-display text-sm uppercase tracking-[0.07em] text-neural-text-primary">Chat Options</h2>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as (typeof MODELS)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            >
              {MODELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Search</span>
            <select
              value={search}
              onChange={(event) => setSearch(event.target.value as "auto" | "on" | "off")}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Tools</span>
            <select
              value={tools}
              onChange={(event) => setTools(event.target.value as "auto" | "off")}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            >
              <option value="auto">auto</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Semantic recall</span>
            <select
              value={semanticRecall}
              onChange={(event) => setSemanticRecall(event.target.value as "auto" | "on" | "off")}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Temperature</span>
            <input
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            />
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Max tokens</span>
            <input
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-secondary">
            <input
              type="checkbox"
              checked={store}
              onChange={(event) => setStore(event.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/[0.03]"
            />
            store conversation
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-secondary">
            <input
              type="checkbox"
              checked={stream}
              onChange={(event) => setStream(event.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/[0.03]"
            />
            stream response
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <button
              type="button"
              onClick={() => setShowSystemPrompt((current) => !current)}
              className="font-display text-xs uppercase tracking-[0.06em] text-neural-text-primary underline decoration-dotted underline-offset-4"
            >
              {showSystemPrompt ? "Hide" : "Show"} system prompt (optional)
            </button>
            {showSystemPrompt ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-neural-text-secondary">This field is local UI context only. Do not paste secrets.</p>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={4}
                  placeholder="Optional system instruction for this browser session"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-neural-text-primary outline-none transition placeholder:text-neural-text-muted focus:border-neural-cyan/40 focus:bg-white/[0.05]"
                />
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
