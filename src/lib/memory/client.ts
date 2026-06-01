import type {
  GatewayConversation,
  GatewayConversationDetailResponse,
  GatewayConversationExportResponse,
  GatewayConversationListResponse,
  GatewayConversationMemoryControlsResponse,
  GatewayConversationMessage,
  GatewayConversationMessagesResponse,
  GatewayConversationSearchResponse,
  GatewayMessageMemoryPatchRequest,
  GatewaySemanticRecallTestResponse
} from "@/lib/gateway/types";
import { redactSecrets } from "@/lib/security/redact";

export type MemoryConsoleError = {
  code: string;
  message: string;
};

type RequestResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: MemoryConsoleError;
    };

export type MemoryConversationListView = {
  items: GatewayConversation[];
  total?: number;
};

function normalizeError(payload: unknown, fallback: string): MemoryConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<RequestResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store"
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "gateway_unreachable",
        message: "Gateway is unavailable or unreachable from Nesty Console."
      }
    };
  }

  const payload = await safeJson(response);
  if (!response.ok) {
    return {
      ok: false,
      error: normalizeError(payload, "Memory request failed.")
    };
  }

  return {
    ok: true,
    data: (payload || {}) as T
  };
}

function parseOptionalInt(value: number | undefined, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function extractConversations(
  payload: GatewayConversationListResponse | GatewayConversationSearchResponse
): GatewayConversation[] {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.conversations)) {
    return payload.conversations;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

function extractMessages(payload: GatewayConversationMessagesResponse): GatewayConversationMessage[] {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.messages)) {
    return payload.messages;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

function appendQuery(base: string, params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${base}?${queryString}` : base;
}

export function redactSensitiveMemoryValue(value: unknown): unknown {
  return redactSecrets(value);
}

export async function listConversations(params: {
  limit?: number;
  offset?: number;
  archived?: boolean;
  q?: string;
} = {}): Promise<RequestResult<MemoryConversationListView>> {
  const url = appendQuery("/api/gateway/conversations", {
    q: params.q?.trim() || undefined,
    limit: parseOptionalInt(params.limit, 1, 200),
    offset: parseOptionalInt(params.offset, 0, 10000),
    archived: params.archived
  });

  const result = await requestJson<GatewayConversationListResponse>(url);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: {
      items: extractConversations(result.data),
      total: typeof result.data.total === "number" ? result.data.total : undefined
    }
  };
}

export async function searchConversations(params: {
  q: string;
  limit?: number;
  offset?: number;
  scope?: string;
  archived?: boolean;
}): Promise<RequestResult<MemoryConversationListView>> {
  const url = appendQuery("/api/gateway/conversations/search", {
    q: params.q.trim(),
    limit: parseOptionalInt(params.limit, 1, 200),
    offset: parseOptionalInt(params.offset, 0, 10000),
    scope: params.scope?.trim() || undefined,
    archived: params.archived
  });

  const result = await requestJson<GatewayConversationSearchResponse>(url);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: {
      items: extractConversations(result.data),
      total: typeof result.data.total === "number" ? result.data.total : undefined
    }
  };
}

export async function getConversationDetail(conversationId: string): Promise<RequestResult<GatewayConversationDetailResponse>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "conversation_not_found",
        message: "Conversation ID is required."
      }
    };
  }
  return requestJson<GatewayConversationDetailResponse>(`/api/gateway/conversations/${encodeURIComponent(id)}`);
}

export async function getConversationMessages(
  conversationId: string,
  options: { limit?: number; offset?: number; order?: "asc" | "desc" } = {}
): Promise<RequestResult<GatewayConversationMessage[]>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "conversation_not_found",
        message: "Conversation ID is required."
      }
    };
  }

  const url = appendQuery(`/api/gateway/conversations/${encodeURIComponent(id)}/messages`, {
    limit: parseOptionalInt(options.limit, 1, 200),
    offset: parseOptionalInt(options.offset, 0, 10000),
    order: options.order
  });
  const result = await requestJson<GatewayConversationMessagesResponse>(url);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    data: extractMessages(result.data)
  };
}

export async function exportConversation(
  conversationId: string,
  options: {
    include_metadata?: boolean;
    messages_order?: "asc" | "desc";
  } = {}
): Promise<RequestResult<GatewayConversationExportResponse>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "conversation_not_found",
        message: "Conversation ID is required."
      }
    };
  }
  const url = appendQuery(`/api/gateway/conversations/${encodeURIComponent(id)}/export`, options);
  return requestJson<GatewayConversationExportResponse>(url);
}

export async function summarizeConversation(
  conversationId: string
): Promise<RequestResult<Record<string, unknown>>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "conversation_not_found",
        message: "Conversation ID is required."
      }
    };
  }
  return requestJson<Record<string, unknown>>(`/api/gateway/conversations/${encodeURIComponent(id)}/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function clearConversation(conversationId: string): Promise<RequestResult<Record<string, unknown>>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "conversation_not_found",
        message: "Conversation ID is required."
      }
    };
  }
  return requestJson<Record<string, unknown>>(`/api/gateway/conversations/${encodeURIComponent(id)}/clear`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function resetConversationSummary(
  conversationId: string
): Promise<RequestResult<Record<string, unknown>>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "conversation_not_found",
        message: "Conversation ID is required."
      }
    };
  }
  return requestJson<Record<string, unknown>>(
    `/api/gateway/conversations/${encodeURIComponent(id)}/reset-summary`,
    {
      method: "POST"
    }
  );
}

export async function updateMessageMemory(
  conversationId: string,
  messageId: string,
  payload: GatewayMessageMemoryPatchRequest
): Promise<RequestResult<Record<string, unknown>>> {
  const conversation = conversationId.trim();
  const message = messageId.trim();
  if (!conversation || !message) {
    return {
      ok: false,
      error: {
        code: "invalid_memory_control_request",
        message: "Conversation ID and message ID are required."
      }
    };
  }

  return requestJson<Record<string, unknown>>(
    `/api/gateway/conversations/${encodeURIComponent(conversation)}/messages/${encodeURIComponent(message)}/memory`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
}

export async function getMemoryControls(params: {
  limit?: number;
  offset?: number;
  archived?: boolean;
} = {}): Promise<RequestResult<GatewayConversationMemoryControlsResponse>> {
  const url = appendQuery("/api/gateway/conversations/memory-controls", {
    limit: parseOptionalInt(params.limit, 1, 200),
    offset: parseOptionalInt(params.offset, 0, 10000),
    archived: params.archived
  });
  return requestJson<GatewayConversationMemoryControlsResponse>(url);
}

export async function runSemanticRecallTest(input: {
  text: string;
  top_k?: number;
  scope?: string;
  include_archived?: boolean;
}): Promise<RequestResult<GatewaySemanticRecallTestResponse>> {
  const text = input.text.trim();
  if (!text) {
    return {
      ok: false,
      error: {
        code: "invalid_request_body",
        message: "Recall test text is required."
      }
    };
  }
  return requestJson<GatewaySemanticRecallTestResponse>("/api/internal/embeddings/recall-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      top_k: parseOptionalInt(input.top_k, 1, 50),
      scope: input.scope?.trim() || undefined,
      include_archived: input.include_archived
    })
  });
}
