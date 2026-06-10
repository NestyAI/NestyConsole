import type {
  GatewayConversation,
  GatewayConversationListResponse,
  GatewayConversationMessage,
  GatewayConversationMessagesResponse
} from "@/lib/gateway/types";

export type ConversationListItem = {
  id: string;
  title: string;
  archived: boolean;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
  raw: GatewayConversation;
};

export type ConversationApiError = {
  code: string;
  message: string;
};

export function conversationDeepLinkErrorMessage(error: ConversationApiError): string {
  switch (error.code) {
    case "credentials_not_configured":
      return "Gateway credentials are not configured.";
    case "invalid_gateway_api_key":
      return "Gateway API key is invalid or expired.";
    case "not_found":
    case "conversation_not_found":
      return "Conversation not found.";
    default:
      if (error.message.toLowerCase().includes("not found")) {
        return "Conversation not found.";
      }
      return "Could not load linked conversation.";
  }
}

type ListConversationsParams = {
  limit?: number;
  offset?: number;
  archived?: boolean;
  q?: string;
};

type ListConversationsResult = {
  items: ConversationListItem[];
  total?: number;
};

type ConversationMessagesResult = {
  items: GatewayConversationMessage[];
};

type RequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ConversationApiError };

function normalizeError(payload: unknown, fallback: string): ConversationApiError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

function conversationIdFromRaw(raw: GatewayConversation): string {
  const id = String(raw.id || raw.conversation_id || "").trim();
  return id;
}

export function formatConversationTitle(raw: GatewayConversation): string {
  const title = String(raw.title || raw.name || "").trim();
  return title || "Untitled conversation";
}

function toConversationListItem(raw: GatewayConversation): ConversationListItem | null {
  const id = conversationIdFromRaw(raw);
  if (!id) {
    return null;
  }
  const archivedAt = raw.archived_at;
  const archived = Boolean(raw.archived || archivedAt);
  return {
    id,
    title: formatConversationTitle(raw),
    archived,
    messageCount: typeof raw.message_count === "number" ? raw.message_count : undefined,
    lastMessageAt: typeof raw.last_message_at === "string" ? raw.last_message_at : undefined,
    createdAt: typeof raw.created_at === "string" ? raw.created_at : undefined,
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    raw
  };
}

function extractConversationList(payload: GatewayConversationListResponse): GatewayConversation[] {
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
      error: normalizeError(payload, "Conversation request failed.")
    };
  }

  return {
    ok: true,
    data: (payload || {}) as T
  };
}

function buildListUrl(params: ListConversationsParams = {}): string {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params.offset === "number") {
    query.set("offset", String(params.offset));
  }
  if (typeof params.archived === "boolean") {
    query.set("archived", String(params.archived));
  }
  if (params.q?.trim()) {
    query.set("q", params.q.trim());
  }
  const queryString = query.toString();
  return queryString ? `/api/gateway/conversations?${queryString}` : "/api/gateway/conversations";
}

export async function listConversations(params: ListConversationsParams = {}): Promise<RequestResult<ListConversationsResult>> {
  const result = await requestJson<GatewayConversationListResponse>(buildListUrl(params));
  if (!result.ok) {
    return result;
  }

  const items = extractConversationList(result.data).map(toConversationListItem).filter((row): row is ConversationListItem => Boolean(row));
  const total = typeof result.data.total === "number" ? result.data.total : undefined;
  return {
    ok: true,
    data: {
      items,
      total
    }
  };
}

export async function getConversationMessages(
  conversationId: string,
  options: { limit?: number; offset?: number; order?: "asc" | "desc" } = {}
): Promise<RequestResult<ConversationMessagesResult>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "invalid_request_body",
        message: "Conversation ID is required."
      }
    };
  }
  const query = new URLSearchParams();
  if (typeof options.limit === "number") {
    query.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number") {
    query.set("offset", String(options.offset));
  }
  if (options.order) {
    query.set("order", options.order);
  }
  const queryString = query.toString();
  const url = queryString
    ? `/api/gateway/conversations/${encodeURIComponent(id)}/messages?${queryString}`
    : `/api/gateway/conversations/${encodeURIComponent(id)}/messages`;

  const result = await requestJson<GatewayConversationMessagesResponse>(url);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    data: {
      items: extractMessages(result.data)
    }
  };
}

export async function renameConversation(conversationId: string, title: string): Promise<RequestResult<GatewayConversation>> {
  const id = conversationId.trim();
  const value = title.trim();
  if (!id || !value) {
    return {
      ok: false,
      error: {
        code: "invalid_request_body",
        message: "Conversation ID and title are required."
      }
    };
  }

  const result = await requestJson<GatewayConversation>(
    `/api/gateway/conversations/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title: value })
    }
  );
  return result;
}

export async function archiveOrDeleteConversation(
  conversationId: string,
  archived: boolean
): Promise<RequestResult<GatewayConversation | Record<string, unknown>>> {
  const id = conversationId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "invalid_request_body",
        message: "Conversation ID is required."
      }
    };
  }

  if (archived) {
    return requestJson<GatewayConversation>(`/api/gateway/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ archived: true })
    });
  }

  return requestJson<Record<string, unknown>>(`/api/gateway/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
