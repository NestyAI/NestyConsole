"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, KeyboardEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Loader2, Menu, RefreshCcw, Send, Square, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { RequestIdTag } from "@/components/ui/request-id-tag";
import { Select } from "@/components/ui/select";
import { TokenTag } from "@/components/ui/token-tag";
import { ProOrchestrationDetails } from "@/components/chat/pro-orchestration-details";
import { RetrievalDetails } from "@/components/chat/retrieval-details";
import { PlannerDetails } from "@/components/chat/planner-details";
import { AnswerQualityDetails } from "@/components/chat/answer-quality-details";
import { OutputSafetyDetails } from "@/components/chat/output-safety-details";
import { ProviderFallbackDetails } from "@/components/chat/provider-fallback-details";
import { ChatCanvasRenderer } from "@/components/chat/chat-canvas-renderer";
import { WorkspaceChatPanel } from "@/components/chat/workspace-chat-panel";
import { buildChatHref, copyChatHref } from "@/lib/chat/chat-url";
import {
  archiveOrDeleteConversation,
  conversationDeepLinkErrorMessage,
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
import {
  type ChatPreset,
  getBuiltInChatPresets,
  getCustomChatPresets,
  saveCustomChatPresets
} from "@/lib/chat/presets";
import { buildWorkspaceContext } from "@/lib/workspaces/context";
import {
  addWorkspaceLinkedConversation,
  type Workspace,
  getWorkspaceById,
  updateWorkspace
} from "@/lib/workspaces/workspaces";

type UiMessage = ChatMessage & {
  id: string;
};

type ConsoleError = {
  code: string;
  message: string;
  details?: {
    request_id?: string;
    retry_after_seconds?: number;
    quota_type?: string;
    limit?: number;
    [key: string]: unknown;
  };
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
      details?: ConsoleError["details"];
    };
  };
  const details = envelope?.error?.details;
  return {
    code: String(envelope?.error?.code || "unknown_error"),
    message: String(envelope?.error?.message || "Chat request failed."),
    ...(details && typeof details === "object" ? { details } : {})
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
      "role_latency_ms" in r ||
      "evidence_sources_used" in r ||
      "planner_metadata_used" in r ||
      "retrieval_metadata_used" in r ||
      "quality_guard_applied" in r ||
      "pro_context_budget_chars" in r ||
      "pro_context_truncated" in r
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
        role_latency_ms: rawOrch.role_latency_ms && typeof rawOrch.role_latency_ms === "object" ? (rawOrch.role_latency_ms as Record<string, number>) : undefined,
        evidence_sources_used: Array.isArray(rawOrch.evidence_sources_used) ? (rawOrch.evidence_sources_used as string[]) : rawOrch.evidence_sources_used === null ? null : undefined,
        planner_metadata_used: typeof rawOrch.planner_metadata_used === "boolean" ? rawOrch.planner_metadata_used : rawOrch.planner_metadata_used === null ? null : undefined,
        retrieval_metadata_used: typeof rawOrch.retrieval_metadata_used === "boolean" ? rawOrch.retrieval_metadata_used : rawOrch.retrieval_metadata_used === null ? null : undefined,
        quality_guard_applied: typeof rawOrch.quality_guard_applied === "boolean" ? rawOrch.quality_guard_applied : rawOrch.quality_guard_applied === null ? null : undefined,
        pro_context_budget_chars: typeof rawOrch.pro_context_budget_chars === "number" ? rawOrch.pro_context_budget_chars : rawOrch.pro_context_budget_chars === null ? null : undefined,
        pro_context_truncated: typeof rawOrch.pro_context_truncated === "boolean" ? rawOrch.pro_context_truncated : rawOrch.pro_context_truncated === null ? null : undefined
      }
    : undefined;

  // Filter out undefined properties to avoid overwriting during merge
  const cleanOrch = orchestration
    ? Object.fromEntries(Object.entries(orchestration).filter(([, v]) => v !== undefined))
    : undefined;

  const rawRetrieval = (data.retrieval || metadataObj?.retrieval) as Record<string, unknown> | null | undefined;
  const retrieval = rawRetrieval && typeof rawRetrieval === "object"
    ? {
        context_used: typeof rawRetrieval.context_used === "boolean" ? rawRetrieval.context_used : undefined,
        context_sources: Array.isArray(rawRetrieval.context_sources) ? (rawRetrieval.context_sources as string[]) : undefined,
        context_items_count: typeof rawRetrieval.context_items_count === "number" ? rawRetrieval.context_items_count : undefined,
        context_truncated: typeof rawRetrieval.context_truncated === "boolean" ? rawRetrieval.context_truncated : undefined,
        context_budget_chars: typeof rawRetrieval.context_budget_chars === "number" ? rawRetrieval.context_budget_chars : undefined,
        context_used_chars: typeof rawRetrieval.context_used_chars === "number" ? rawRetrieval.context_used_chars : undefined,
        summary_used: typeof rawRetrieval.summary_used === "boolean" ? rawRetrieval.summary_used : undefined,
        pinned_memory_used: typeof rawRetrieval.pinned_memory_used === "boolean" ? rawRetrieval.pinned_memory_used : undefined,
        fts_used: typeof rawRetrieval.fts_used === "boolean" ? rawRetrieval.fts_used : undefined,
        semantic_recall_used: typeof rawRetrieval.semantic_recall_used === "boolean" ? rawRetrieval.semantic_recall_used : undefined,
        search_used: typeof rawRetrieval.search_used === "boolean" ? rawRetrieval.search_used : undefined,
        tools_used: Array.isArray(rawRetrieval.tools_used) ? (rawRetrieval.tools_used as string[]) : undefined,
        retrieval_decision: typeof rawRetrieval.retrieval_decision === "string" ? rawRetrieval.retrieval_decision : undefined,
        retrieval_reason: typeof rawRetrieval.retrieval_reason === "string" ? rawRetrieval.retrieval_reason : undefined,
      }
    : undefined;
  const cleanRetrieval = retrieval
    ? Object.fromEntries(Object.entries(retrieval).filter(([, v]) => v !== undefined))
    : undefined;

  const rawPlanner = (data.planner || metadataObj?.planner) as Record<string, unknown> | null | undefined;
  const planner = rawPlanner && typeof rawPlanner === "object"
    ? {
        search_decision: typeof rawPlanner.search_decision === "string" ? rawPlanner.search_decision : undefined,
        search_planned: typeof rawPlanner.search_planned === "boolean" ? rawPlanner.search_planned : undefined,
        search_used: typeof rawPlanner.search_used === "boolean" ? rawPlanner.search_used : undefined,
        search_reason: typeof rawPlanner.search_reason === "string" ? rawPlanner.search_reason : undefined,
        tool_decision: typeof rawPlanner.tool_decision === "string" ? rawPlanner.tool_decision : undefined,
        tools_planned: Array.isArray(rawPlanner.tools_planned) ? (rawPlanner.tools_planned as string[]) : undefined,
        tools_used: Array.isArray(rawPlanner.tools_used) ? (rawPlanner.tools_used as string[]) : undefined,
        tool_reason: typeof rawPlanner.tool_reason === "string" ? rawPlanner.tool_reason : undefined,
        clarification_needed: typeof rawPlanner.clarification_needed === "boolean" ? rawPlanner.clarification_needed : undefined,
        clarification_reason: typeof rawPlanner.clarification_reason === "string" ? rawPlanner.clarification_reason : undefined,
      }
    : undefined;
  const cleanPlanner = planner
    ? Object.fromEntries(Object.entries(planner).filter(([, v]) => v !== undefined))
    : undefined;

  const rawAnswerQuality = (data.answer_quality || metadataObj?.answer_quality) as Record<string, unknown> | null | undefined;
  const answerQuality = rawAnswerQuality && typeof rawAnswerQuality === "object"
    ? {
        checked: typeof rawAnswerQuality.checked === "boolean" ? rawAnswerQuality.checked : undefined,
        flags: Array.isArray(rawAnswerQuality.flags) ? (rawAnswerQuality.flags as string[]) : undefined,
        action: typeof rawAnswerQuality.action === "string" ? rawAnswerQuality.action : undefined,
      }
    : undefined;
  const cleanAnswerQuality = answerQuality
    ? Object.fromEntries(Object.entries(answerQuality).filter(([, v]) => v !== undefined))
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
    fallback_reason: fallbackReason,
    retrieval: cleanRetrieval,
    planner: cleanPlanner,
    answer_quality: cleanAnswerQuality
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
  const retrieval = cleanMerge(
    base.retrieval as Record<string, unknown> | null,
    next.retrieval as Record<string, unknown> | null
  );
  const planner = cleanMerge(
    base.planner as Record<string, unknown> | null,
    next.planner as Record<string, unknown> | null
  );
  const answer_quality = cleanMerge(
    base.answer_quality as Record<string, unknown> | null,
    next.answer_quality as Record<string, unknown> | null
  );

  const attempted_providers = next.attempted_providers !== undefined ? next.attempted_providers : base.attempted_providers;
  const provider_errors = next.provider_errors !== undefined ? next.provider_errors : base.provider_errors;
  const selected_provider = next.selected_provider !== undefined ? next.selected_provider : base.selected_provider;
  const selected_model = next.selected_model !== undefined ? next.selected_model : base.selected_model;
  const fallback_used = next.fallback_used !== undefined ? next.fallback_used : base.fallback_used;
  const fallback_reason = next.fallback_reason !== undefined ? next.fallback_reason : base.fallback_reason;

  return {
    ...base,
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
    fallback_reason,
    retrieval: retrieval as ChatCompletionMetadata["retrieval"],
    planner: planner as ChatCompletionMetadata["planner"],
    answer_quality: answer_quality as ChatCompletionMetadata["answer_quality"]
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

const CHAT_SCROLL_BOTTOM_THRESHOLD_PX = 80;

function scrollChatToBottom(container: HTMLDivElement | null, behavior: ScrollBehavior = "auto") {
  if (!container) {
    return;
  }
  container.scrollTo({ top: container.scrollHeight, behavior });
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

function makePresetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function getPresetTimestamp(): string {
  return new Date().toISOString();
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [customPresets, setCustomPresets] = useState<ChatPreset[]>([]);
  const builtinPresets = getBuiltInChatPresets();
  const isApplyingPresetRef = useRef(false);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [useWorkspaceContext, setUseWorkspaceContext] = useState<boolean>(false);
  const [workspaceWarning, setWorkspaceWarning] = useState<string | null>(null);
  const [conversationWarning, setConversationWarning] = useState<string | null>(null);
  const [conversationDeepLinkLoading, setConversationDeepLinkLoading] = useState(false);

  const handleManualOptionChange = () => {
    if (!isApplyingPresetRef.current) {
      setSelectedPresetId("");
    }
  };

  const handleSelectPreset = (id: string) => {
    if (!id) {
      setSelectedPresetId("");
      return;
    }

    const allPresets = [...builtinPresets, ...customPresets];
    const found = allPresets.find((p) => p.id === id);
    if (!found) {
      return;
    }

    isApplyingPresetRef.current = true;
    try {
      setSelectedPresetId(found.id);
      
      setModel(found.model as (typeof MODELS)[number]);
      setSearch(found.search);
      setTools(found.tools);
      setStore(found.store);
      setSemanticRecall(found.semantic_recall);
      setStream(found.stream);

      if (found.temperature !== undefined && found.temperature !== null) {
        setTemperature(String(found.temperature));
      }
      if (found.max_tokens !== undefined && found.max_tokens !== null) {
        setMaxTokens(String(found.max_tokens));
      }
      if (found.system_prompt !== undefined && found.system_prompt !== null) {
        setSystemPrompt(found.system_prompt);
        setShowSystemPrompt(Boolean(found.system_prompt));
      } else {
        setSystemPrompt("");
        setShowSystemPrompt(false);
      }

      if (messages.length > 0) {
        pushNotice("info", "Preset applied. Existing messages were kept.");
      }
    } finally {
      isApplyingPresetRef.current = false;
    }
  };

  const handleSaveCurrentAsPreset = () => {
    const name = window.prompt("Enter a name for this custom preset:");
    if (!name || !name.trim()) {
      return;
    }

    const desc = window.prompt("Enter an optional description:") || "";
    const nameTrimmed = name.trim();
    
    const existingIndex = customPresets.findIndex(p => p.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (existingIndex >= 0) {
      const confirmOverwrite = window.confirm(`A custom preset named "${nameTrimmed}" already exists. Overwrite it?`);
      if (!confirmOverwrite) {
        return;
      }
    }

    let tempNum: number | null = null;
    if (temperature.trim()) {
      const val = Number(temperature);
      if (!Number.isNaN(val)) tempNum = val;
    }
    
    let tokensNum: number | null = null;
    if (maxTokens.trim()) {
      const val = Number(maxTokens);
      if (!Number.isNaN(val)) tokensNum = val;
    }

    const newPreset: ChatPreset = {
      id: existingIndex >= 0 ? customPresets[existingIndex].id : makePresetId(),
      name: nameTrimmed,
      description: desc.trim() || undefined,
      model,
      search,
      tools,
      store,
      semantic_recall: semanticRecall,
      stream,
      temperature: tempNum,
      max_tokens: tokensNum,
      system_prompt: systemPrompt || undefined,
      is_builtin: false,
      updated_at: getPresetTimestamp()
    };

    let updatedCustoms: ChatPreset[];
    if (existingIndex >= 0) {
      updatedCustoms = [...customPresets];
      updatedCustoms[existingIndex] = newPreset;
    } else {
      updatedCustoms = [...customPresets, newPreset];
    }

    setCustomPresets(updatedCustoms);
    saveCustomChatPresets(updatedCustoms);
    setSelectedPresetId(newPreset.id);
    pushNotice("success", `Preset "${nameTrimmed}" saved.`);
  };

  const handleDeletePreset = (id: string) => {
    const found = customPresets.find(p => p.id === id);
    if (!found) {
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete the preset "${found.name}"?`);
    if (!confirmDelete) {
      return;
    }

    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    saveCustomChatPresets(updated);
    setSelectedPresetId("");
    pushNotice("info", `Preset "${found.name}" deleted.`);
  };

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationQuery, setConversationQuery] = useState("");
  const [conversationSearchInput, setConversationSearchInput] = useState("");
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<ConsoleError | null>(null);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [conversationActionBusyId, setConversationActionBusyId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const preferencesHydratedRef = useRef(false);
  const workspaceAppliedKeyRef = useRef<string | null>(null);
  const conversationAppliedKeyRef = useRef<string | null>(null);
  const titleRefreshAttemptedRef = useRef<Set<string>>(new Set());
  const messagesLengthRef = useRef(0);

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distance <= CHAT_SCROLL_BOTTOM_THRESHOLD_PX;
  };

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollChatToBottom(messagesContainerRef.current, "auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const customs = getCustomChatPresets();
      setCustomPresets(customs);
    } catch {
      // Ignore safely
    }

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
      conversationsError?.code === "invalid_gateway_api_key" ||
      conversationsError?.code === "api_key_revoked",
    [conversationsError?.code]
  );

  const pushNotice = (kind: UiNotice["kind"], message: string) => {
    setNotice({ kind, message });
  };

  const applyWorkspaceOptions = (workspace: Workspace, notifyIfMessages: boolean) => {
    isApplyingPresetRef.current = true;
    try {
      if (workspace.preferred_preset_id) {
        const allPresets = [...builtinPresets, ...getCustomChatPresets()];
        const found = allPresets.find((p) => p.id === workspace.preferred_preset_id);
        if (found) {
          setSelectedPresetId(found.id);
          setModel(found.model as (typeof MODELS)[number]);
          setSearch(found.search);
          setTools(found.tools);
          setStore(found.store);
          setSemanticRecall(found.semantic_recall);
          setStream(found.stream);
          if (found.temperature !== undefined && found.temperature !== null) {
            setTemperature(String(found.temperature));
          }
          if (found.max_tokens !== undefined && found.max_tokens !== null) {
            setMaxTokens(String(found.max_tokens));
          }
          if (found.system_prompt !== undefined && found.system_prompt !== null) {
            setSystemPrompt(found.system_prompt);
            setShowSystemPrompt(Boolean(found.system_prompt));
          } else {
            setSystemPrompt("");
            setShowSystemPrompt(false);
          }
        } else {
          setSelectedPresetId("");
          if (workspace.preferred_model && (MODELS as readonly string[]).includes(workspace.preferred_model)) {
            setModel(workspace.preferred_model as (typeof MODELS)[number]);
          }
          if (workspace.preferred_search) {
            setSearch(workspace.preferred_search);
          }
          if (workspace.preferred_tools) {
            setTools(workspace.preferred_tools);
          }
          if (workspace.preferred_store !== undefined) {
            setStore(workspace.preferred_store);
          }
          if (workspace.preferred_semantic_recall) {
            setSemanticRecall(workspace.preferred_semantic_recall);
          }
        }
      } else {
        setSelectedPresetId("");
        if (workspace.preferred_model && (MODELS as readonly string[]).includes(workspace.preferred_model)) {
          setModel(workspace.preferred_model as (typeof MODELS)[number]);
        }
        if (workspace.preferred_search) {
          setSearch(workspace.preferred_search);
        }
        if (workspace.preferred_tools) {
          setTools(workspace.preferred_tools);
        }
        if (workspace.preferred_store !== undefined) {
          setStore(workspace.preferred_store);
        }
        if (workspace.preferred_semantic_recall) {
          setSemanticRecall(workspace.preferred_semantic_recall);
        }
      }

      if (notifyIfMessages) {
        pushNotice("info", "Workspace options applied. Existing messages were kept.");
      }
    } finally {
      isApplyingPresetRef.current = false;
    }
  };

  useEffect(() => {
    if (!preferencesHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const workspaceId = searchParams.get("workspace")?.trim() || "";
    const useContextParam = searchParams.get("useWorkspaceContext") === "1";
    const applyKey = `${workspaceId}:${useContextParam}`;

    if (workspaceAppliedKeyRef.current === applyKey) {
      return;
    }
    workspaceAppliedKeyRef.current = applyKey;

    /* eslint-disable react-hooks/set-state-in-effect */
    if (!workspaceId) {
      setActiveWorkspace(null);
      setUseWorkspaceContext(false);
      setWorkspaceWarning(null);
      return;
    }

    const workspace = getWorkspaceById(workspaceId);
    if (!workspace) {
      setActiveWorkspace(null);
      setUseWorkspaceContext(false);
      setWorkspaceWarning(`Workspace "${workspaceId}" was not found. Continuing with normal chat.`);
      return;
    }

    setWorkspaceWarning(null);
    setActiveWorkspace(workspace);
    setUseWorkspaceContext(useContextParam);

    const hadMessages = messagesLengthRef.current > 0;
    applyWorkspaceOptions(workspace, hadMessages);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once per workspace URL key after preferences hydrate
  }, [searchParams]);

  const syncChatUrl = useCallback(
    (
      overrides: Partial<{
        workspaceId: string | null;
        conversationId: string | null;
        useWorkspaceContext: boolean;
      }> = {}
    ) => {
      const href = buildChatHref({
        workspaceId:
          overrides.workspaceId !== undefined ? overrides.workspaceId : activeWorkspace?.id ?? null,
        conversationId: overrides.conversationId !== undefined ? overrides.conversationId : conversationId,
        useWorkspaceContext:
          overrides.useWorkspaceContext !== undefined ? overrides.useWorkspaceContext : useWorkspaceContext
      });
      router.replace(href, { scroll: false });
    },
    [router, activeWorkspace?.id, conversationId, useWorkspaceContext]
  );

  const handleWorkspaceSelect = (workspaceId: string) => {
    if (!workspaceId) {
      workspaceAppliedKeyRef.current = ":false";
      setActiveWorkspace(null);
      setUseWorkspaceContext(false);
      setWorkspaceWarning(null);
      syncChatUrl({ workspaceId: null, useWorkspaceContext: false });
      return;
    }

    const workspace = getWorkspaceById(workspaceId);
    if (!workspace) {
      setWorkspaceWarning(`Workspace "${workspaceId}" was not found. Continuing with normal chat.`);
      return;
    }

    const contextOn = useWorkspaceContext;
    workspaceAppliedKeyRef.current = `${workspaceId}:${contextOn}`;
    setWorkspaceWarning(null);
    setActiveWorkspace(workspace);
    applyWorkspaceOptions(workspace, messagesLengthRef.current > 0);
    syncChatUrl({ workspaceId, useWorkspaceContext: contextOn });
  };

  const handleUseWorkspaceContextChange = (enabled: boolean) => {
    setUseWorkspaceContext(enabled);
    if (activeWorkspace) {
      workspaceAppliedKeyRef.current = `${activeWorkspace.id}:${enabled}`;
      syncChatUrl({ workspaceId: activeWorkspace.id, useWorkspaceContext: enabled });
    }
  };

  const handleLinkCurrentConversation = () => {
    if (!activeWorkspace || !conversationId) {
      return;
    }
    const conversationMatch = conversations.find((item) => item.id === conversationId);
    const label = conversationMatch ? formatConversationTitle(conversationMatch.raw) : "Current chat";
    const linkedPatch = addWorkspaceLinkedConversation(activeWorkspace, conversationId, label);
    if (!linkedPatch) {
      return;
    }
    const updated = updateWorkspace(activeWorkspace.id, linkedPatch);
    if (updated) {
      setActiveWorkspace(updated);
      pushNotice("success", "Conversation linked to workspace.");
    }
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

  const handleCopyConversationLink = async () => {
    if (!conversationId) {
      return;
    }

    const copied = await copyChatHref({
      workspaceId: activeWorkspace?.id ?? null,
      conversationId,
      useWorkspaceContext: Boolean(activeWorkspace && useWorkspaceContext)
    });

    pushNotice(copied ? "success" : "info", copied ? "Conversation link copied." : "Could not copy link.");
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setResponseMetadata(null);
    setError(null);
    setStreamingStopped(false);
    setConversationWarning(null);
    conversationAppliedKeyRef.current = "__none__";
    syncChatUrl({ conversationId: null });
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

  const applyOpenedConversation = (
    item: ConversationListItem,
    gatewayMessages: GatewayConversationMessage[],
    options?: { quiet?: boolean }
  ) => {
    const loadedMessages = conversationMessagesToUi(gatewayMessages);
    setMessages(loadedMessages);
    setConversationId(item.id);
    const lastAssistantMessage = [...gatewayMessages].reverse().find((row) => row.role === "assistant");
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
    if (!options?.quiet) {
      pushNotice("info", `Opened ${formatConversationTitle(item.raw)}.`);
    }
  };

  const resolveConversationListItem = (id: string): ConversationListItem => {
    const existing = conversations.find((item) => item.id === id);
    if (existing) {
      return existing;
    }
    return {
      id,
      title: "Untitled conversation",
      archived: false,
      raw: { id }
    };
  };

  const upsertConversationListItem = (found: ConversationListItem) => {
    setConversations((prev) => {
      const index = prev.findIndex((item) => item.id === found.id);
      if (index >= 0) {
        return prev.map((item) => (item.id === found.id ? found : item));
      }
      return [found, ...prev];
    });
  };

  const tryResolveTitleFromList = async (id: string) => {
    if (titleRefreshAttemptedRef.current.has(id)) {
      return;
    }
    titleRefreshAttemptedRef.current.add(id);

    let alreadyResolved = false;
    setConversations((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing && formatConversationTitle(existing.raw) !== "Untitled conversation") {
        alreadyResolved = true;
      }
      return prev;
    });
    if (alreadyResolved) {
      return;
    }

    const PAGE_SIZE = 50;
    const offsets = [0, 50];

    for (const offset of offsets) {
      const result = await listConversations({ limit: PAGE_SIZE, offset });
      if (!result.ok) {
        return;
      }

      const found = result.data.items.find((item) => item.id === id);
      if (found) {
        upsertConversationListItem(found);
        return;
      }

      if (result.data.items.length < PAGE_SIZE) {
        return;
      }
    }
  };

  const openConversationById = async (id: string, options?: { fromDeepLink?: boolean }) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setConversationWarning("Conversation ID is missing.");
      return;
    }

    if (options?.fromDeepLink) {
      setConversationDeepLinkLoading(true);
      setConversationWarning(null);
    } else {
      setOpeningConversationId(trimmed);
    }
    setConversationsError(null);

    const result = await getConversationMessages(trimmed, {
      limit: 50,
      offset: 0,
      order: "asc"
    });

    if (options?.fromDeepLink) {
      setConversationDeepLinkLoading(false);
    } else {
      setOpeningConversationId(null);
    }

    if (!result.ok) {
      if (options?.fromDeepLink) {
        setConversationWarning(conversationDeepLinkErrorMessage(result.error));
        if (
          result.error.code === "credentials_not_configured" ||
          result.error.code === "invalid_gateway_api_key" ||
          result.error.code === "api_key_revoked"
        ) {
          setConversationsError(result.error);
        }
      } else {
        setConversationsError(result.error);
        pushNotice("info", `Unable to open conversation: ${result.error.message}`);
      }
      return;
    }

    const hadListItem = Boolean(conversations.find((row) => row.id === trimmed));
    const item = resolveConversationListItem(trimmed);
    applyOpenedConversation(item, result.data.items, { quiet: options?.fromDeepLink });

    if (options?.fromDeepLink && !hadListItem) {
      void tryResolveTitleFromList(trimmed);
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

    applyOpenedConversation(item, result.data.items);
    conversationAppliedKeyRef.current = item.id;
    syncChatUrl({ conversationId: item.id });
  };

  useEffect(() => {
    if (!preferencesHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const hasConversationParam = searchParams.has("conversation");
    const conversationIdFromUrl = searchParams.get("conversation")?.trim() ?? "";
    const applyKey = hasConversationParam ? conversationIdFromUrl || "__empty__" : "__none__";

    if (conversationAppliedKeyRef.current === applyKey) {
      return;
    }
    conversationAppliedKeyRef.current = applyKey;

    if (!hasConversationParam) {
      return;
    }

    if (!conversationIdFromUrl) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setConversationWarning("Conversation ID is missing.");
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    void openConversationById(conversationIdFromUrl, { fromDeepLink: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once per conversation URL key after preferences hydrate
  }, [searchParams]);

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

    if (useWorkspaceContext && activeWorkspace) {
      const { text } = buildWorkspaceContext(activeWorkspace);
      if (text.trim()) {
        payloadMessages.unshift({
          role: "system",
          content: text
        });
      }
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

    shouldAutoScrollRef.current = true;
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
    <section className="space-y-5">
      <Panel accent="cyan" className="p-6 sm:p-7 lg:p-8">
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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-neural-elevated/50 px-4 py-3 text-xs text-neural-text-secondary">
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
        {conversationId ? (
          <button
            type="button"
            onClick={() => void handleCopyConversationLink()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.08em] text-neural-text-secondary transition-colors duration-200 hover:border-neural-cyan/35 hover:text-neural-cyan active:scale-[0.98]"
            title="Copy conversation link"
            aria-label="Copy conversation link"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
            Copy Link
          </button>
        ) : null}
      </div>

      {conversationDeepLinkLoading ? (
        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-3 text-sm text-cyan-100 shadow-neural-soft">
          Loading linked conversation...
        </div>
      ) : null}

      {conversationWarning ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-sm text-amber-100 shadow-neural-soft">
          {conversationWarning}
          {conversationsError?.code === "credentials_not_configured" ||
          conversationsError?.code === "invalid_gateway_api_key" ? (
            <p className="mt-2 text-xs text-amber-100/90">
              Configure credentials in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <WorkspaceChatPanel
        activeWorkspace={activeWorkspace}
        useWorkspaceContext={useWorkspaceContext}
        workspaceWarning={workspaceWarning}
        conversationId={conversationId}
        onWorkspaceSelect={handleWorkspaceSelect}
        onUseWorkspaceContextChange={handleUseWorkspaceContextChange}
        onLinkCurrentConversation={handleLinkCurrentConversation}
      />

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
          ) : error.code === "api_key_revoked" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              This Gateway API key was revoked. Create a new key in{" "}
              <Link href="/api-keys" className="underline underline-offset-2 hover:text-neural-cyan">
                API Keys
              </Link>{" "}
              and update{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Gateway Credentials
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
          ) : error.code === "gateway_quota_exceeded" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              This API key exceeded its Gateway quota
              {error.details?.quota_type ? ` (${error.details.quota_type})` : ""}. Review limits in{" "}
              <Link href="/api-keys" className="underline underline-offset-2 hover:text-neural-cyan">
                API Keys
              </Link>
              .
            </p>
          ) : error.code === "gateway_rate_limited" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              {typeof error.details?.retry_after_seconds === "number"
                ? `Rate limit exceeded. Try again in ${error.details.retry_after_seconds} seconds.`
                : "Rate limit exceeded. Try again later."}
            </p>
          ) : error.code === "gateway_model_not_allowed" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              This API key cannot use the selected model. Check the allowlist in{" "}
              <Link href="/api-keys" className="underline underline-offset-2 hover:text-neural-cyan">
                API Keys
              </Link>{" "}
              or update{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2 hover:text-neural-cyan">
                Gateway Credentials
              </Link>
              .
            </p>
          ) : error.code === "gateway_invalid_model" ? (
            <p className="mt-2 text-xs text-neural-text-secondary">
              The selected model alias is invalid or unavailable. Check{" "}
              <Link href="/models" className="underline underline-offset-2 hover:text-neural-cyan">
                Models
              </Link>{" "}
              or{" "}
              <Link href="/model-configs" className="underline underline-offset-2 hover:text-neural-cyan">
                Model Configs
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
              The requested provider is temporarily unavailable. Verify provider health in{" "}
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
          <RequestIdTag requestId={error.details?.request_id} />
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
          <div className="flex min-h-[50vh] max-h-[72vh] 2xl:max-h-[78vh] flex-col overflow-hidden rounded-xl border border-white/10 bg-neural-elevated/70 w-full min-w-0">
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="neural-scroll flex-1 space-y-3 overflow-y-auto p-4 w-full min-w-0"
            >
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
                          className="animate-message-enter rounded-xl border border-neural-cyan/20 bg-neural-cyan/[0.06] p-4"
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
                        className="animate-message-enter rounded-xl border border-white/10 bg-neural-elevated/50 p-4"
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
                    <RetrievalDetails metadata={responseMetadata.retrieval} />
                  </div>
                  <div className="col-span-full font-sans">
                    <PlannerDetails metadata={responseMetadata.planner} />
                  </div>
                  <div className="col-span-full font-sans">
                    <AnswerQualityDetails metadata={responseMetadata.answer_quality} />
                  </div>
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

          {/* Preset Selector */}
          <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <label className="block space-y-1 text-sm text-neural-text-secondary">
              <span className="font-display text-[10px] uppercase tracking-[0.08em]">Chat Preset</span>
              <Select
                value={selectedPresetId}
                onChange={(event) => handleSelectPreset(event.target.value)}
              >
                <option value="">-- Custom (No Preset) --</option>
                <optgroup label="Built-in Presets">
                  {builtinPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                {customPresets.length > 0 && (
                  <optgroup label="Custom Presets">
                    {customPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
            </label>

            {(() => {
              const currentPreset = [...builtinPresets, ...customPresets].find(p => p.id === selectedPresetId);
              return (
                <>
                  {currentPreset && currentPreset.description && (
                    <p className="text-[11px] text-neural-text-muted leading-relaxed">
                      {currentPreset.description}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsPreset}
                      className="flex-1 rounded-full border border-neural-cyan/40 bg-neural-cyan/5 px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-cyan transition hover:bg-neural-cyan/12"
                    >
                      Save Current
                    </button>
                    {currentPreset && !currentPreset.is_builtin && (
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(currentPreset.id)}
                        className="rounded-full border border-neural-red/40 bg-neural-red/5 px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.06em] text-neural-red transition hover:bg-neural-red/12"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Model</span>
            <Select
              value={model}
              onChange={(event) => {
                setModel(event.target.value as (typeof MODELS)[number]);
                handleManualOptionChange();
              }}
              className="font-mono"
            >
              {MODELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Search</span>
            <Select
              value={search}
              onChange={(event) => {
                setSearch(event.target.value as "auto" | "on" | "off");
                handleManualOptionChange();
              }}
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </Select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Tools</span>
            <Select
              value={tools}
              onChange={(event) => {
                setTools(event.target.value as "auto" | "off");
                handleManualOptionChange();
              }}
            >
              <option value="auto">auto</option>
              <option value="off">off</option>
            </Select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Semantic recall</span>
            <Select
              value={semanticRecall}
              onChange={(event) => {
                setSemanticRecall(event.target.value as "auto" | "on" | "off");
                handleManualOptionChange();
              }}
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </Select>
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Temperature</span>
            <input
              value={temperature}
              onChange={(event) => {
                setTemperature(event.target.value);
                handleManualOptionChange();
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            />
          </label>

          <label className="block space-y-1 text-sm text-neural-text-secondary">
            <span>Max tokens</span>
            <input
              value={maxTokens}
              onChange={(event) => {
                setMaxTokens(event.target.value);
                handleManualOptionChange();
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40 focus:bg-white/[0.05]"
            />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-secondary">
            <input
              type="checkbox"
              checked={store}
              onChange={(event) => {
                setStore(event.target.checked);
                handleManualOptionChange();
              }}
              className="h-4 w-4 rounded border-white/10 bg-white/[0.03]"
            />
            store conversation
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neural-text-secondary">
            <input
              type="checkbox"
              checked={stream}
              onChange={(event) => {
                setStream(event.target.checked);
                handleManualOptionChange();
              }}
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
                  onChange={(event) => {
                    setSystemPrompt(event.target.value);
                    handleManualOptionChange();
                  }}
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

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <section className="space-y-5 animate-fade-in-up">
          <LoadingBlock label="Loading chat workspace..." />
        </section>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
