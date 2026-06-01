"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Loader2, Menu, RefreshCcw, Send, Square, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
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

function extractMetadata(payload: unknown): Partial<ChatCompletionMetadata> {
  const data = payload as {
    model?: unknown;
    model_alias?: unknown;
    provider?: unknown;
    usage?: {
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
    };
    conversation_id?: unknown;
    conversation?: {
      id?: unknown;
    };
    orchestration?: unknown;
  };

  const model = String(data.model || "").trim() || undefined;
  const modelAlias = String(data.model_alias || "").trim() || undefined;
  const provider = String(data.provider || "").trim() || undefined;
  const conversationId = extractConversationId(data) || undefined;

  const usage = data.usage
    ? {
        prompt_tokens: typeof data.usage.prompt_tokens === "number" ? data.usage.prompt_tokens : undefined,
        completion_tokens: typeof data.usage.completion_tokens === "number" ? data.usage.completion_tokens : undefined,
        total_tokens: typeof data.usage.total_tokens === "number" ? data.usage.total_tokens : undefined
      }
    : undefined;

  const orchestration =
    data.orchestration && typeof data.orchestration === "object"
      ? (data.orchestration as Record<string, unknown>)
      : undefined;

  return {
    model,
    model_alias: modelAlias,
    provider,
    conversation_id: conversationId,
    usage,
    orchestration
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

function mergeMetadata(
  current: ChatCompletionMetadata | null,
  next: Partial<ChatCompletionMetadata>
): ChatCompletionMetadata | null {
  if (!next.model && !next.model_alias && !next.provider && !next.conversation_id && !next.usage && !next.orchestration) {
    return current;
  }
  return {
    ...(current || {}),
    ...next,
    usage: {
      ...(current?.usage || {}),
      ...(next.usage || {})
    }
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

  const hasCredentialError = useMemo(
    () => error?.code === "credentials_not_configured" || error?.code === "invalid_gateway_api_key",
    [error?.code]
  );
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
    setResponseMetadata((current) =>
      mergeMetadata(current, {
        conversation_id: item.id
      })
    );

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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">NestyChat Web</h1>
          <p className="text-sm text-slate-300">Protected chat UI that uses server-side Console routes only.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <button
            type="button"
            onClick={() => setSidebarOpen((current) => !current)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10 lg:hidden"
          >
            <Menu className="h-3.5 w-3.5" />
            Conversations
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 hover:bg-cyan-400/20"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            New Chat
          </button>
          <button
            type="button"
            onClick={clearMessagesOnly}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Messages
          </button>
          <button
            type="button"
            onClick={handleRetry}
            disabled={!lastUserMessage.trim() || sending}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry Last
          </button>
          <button
            type="button"
            onClick={() => void handleCopy(transcript, "transcript")}
            disabled={!messages.length}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-50"
          >
            <Clipboard className="h-3.5 w-3.5" />
            {copiedKey === "transcript" ? "Copied" : "Copy Transcript"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        {conversationId ? (
          <span className="rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-cyan-100">
            Conversation active: {shortConversationLabel(conversationId)}
          </span>
        ) : (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">No active conversation</span>
        )}
        {activeConversationInList ? (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">{formatConversationTitle(activeConversationInList.raw)}</span>
        ) : null}
        {store ? (
          <span className="rounded-md border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-emerald-100">store=on</span>
        ) : (
          <span className="rounded-md border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-amber-100">store=off</span>
        )}
      </div>

      {!store && conversationId ? (
        <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          store=false means new turns may not be saved to this active Gateway conversation.
        </div>
      ) : null}

      {notice ? (
        <div
          className={`rounded-xl border p-3 text-sm ${
            notice.kind === "success"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
              : "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {streamingStopped ? (
        <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          Streaming was stopped. Partial content (if any) is kept in the message.
        </div>
      ) : null}

      {error ? (
        <ErrorBanner code={error.code} message={error.message}>
          {hasCredentialError ? (
            <p className="mt-2">
              Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from
              Gateway startup logs and update it in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
        </ErrorBanner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className={`${sidebarOpen ? "block" : "hidden"} space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 lg:block`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Conversations</h2>
            <button
              type="button"
              onClick={() => void loadConversations()}
              disabled={conversationsLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-50"
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
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
            >
              Search
            </button>
          </form>

          {conversationsError ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
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

          <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
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
                    className={`rounded-lg border p-2 ${
                      active ? "border-cyan-300/40 bg-cyan-400/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openConversation(item)}
                      disabled={busy}
                      className="w-full text-left"
                    >
                      <p className="text-xs font-medium text-slate-100">{formatConversationTitle(item.raw)}</p>
                      <p className="mt-1 text-[11px] text-slate-300">
                        {item.messageCount !== undefined ? `${item.messageCount} messages` : "message count unknown"}
                      </p>
                      <p className="text-[11px] text-slate-400">
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
                        className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10 disabled:opacity-50"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleArchiveConversation(item)}
                        className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10 disabled:opacity-50"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeleteConversation(item)}
                        className="rounded border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
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

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex min-h-[50vh] max-h-[68vh] flex-col overflow-hidden rounded-lg border border-white/10 bg-surface-950/60">
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">Start chatting with NestyAI.</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void handleQuickPrompt(prompt)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
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
                    return (
                      <article key={message.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs uppercase tracking-wide text-cyan-200">{message.role}</p>
                          <button
                            type="button"
                            onClick={() => void handleCopy(message.content, copyKey)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                          >
                            <Clipboard className="h-3.5 w-3.5" />
                            {copiedKey === copyKey ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{message.content || "..."}</p>
                      </article>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="sticky bottom-0 space-y-3 border-t border-white/10 bg-surface-950/80 p-3 backdrop-blur">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => void handleInputKeyDown(event)}
                rows={4}
                placeholder="Type your message. Enter to send, Shift+Enter for newline."
                className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
                {stream ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    disabled={!sending}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          {responseMetadata ? (
            <details
              open={detailsOpen}
              onToggle={(event) => setDetailsOpen((event.target as HTMLDetailsElement).open)}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <summary className="cursor-pointer text-sm font-medium text-slate-100">Response Details</summary>
              <div className="mt-3 grid gap-2 text-xs text-slate-300">
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
                {responseMetadata.orchestration ? <p>orchestration: available</p> : null}
              </div>
            </details>
          ) : null}
        </div>

        <aside className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Chat Options</h2>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as (typeof MODELS)[number])}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              {MODELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Search</span>
            <select
              value={search}
              onChange={(event) => setSearch(event.target.value as "auto" | "on" | "off")}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Tools</span>
            <select
              value={tools}
              onChange={(event) => setTools(event.target.value as "auto" | "off")}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="auto">auto</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Semantic recall</span>
            <select
              value={semanticRecall}
              onChange={(event) => setSemanticRecall(event.target.value as "auto" | "on" | "off")}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Temperature</span>
            <input
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Max tokens</span>
            <input
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={store}
              onChange={(event) => setStore(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-surface-950/70"
            />
            store conversation
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={stream}
              onChange={(event) => setStream(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-surface-950/70"
            />
            stream response
          </label>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <button
              type="button"
              onClick={() => setShowSystemPrompt((current) => !current)}
              className="text-sm text-slate-100 underline decoration-dotted underline-offset-2"
            >
              {showSystemPrompt ? "Hide" : "Show"} system prompt (optional)
            </button>
            {showSystemPrompt ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-300">This field is local UI context only. Do not paste secrets.</p>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={4}
                  placeholder="Optional system instruction for this browser session"
                  className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-xs text-white"
                />
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
