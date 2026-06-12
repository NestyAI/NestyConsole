import "server-only";

import { resolveEffectiveGatewayCredentials } from "@/lib/console/credentials";
import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import type {
  GatewayConversationDetailResponse,
  GatewayConversationExportResponse,
  GatewayConversationListResponse,
  GatewayConversationMemoryControlsResponse,
  GatewayConversationMessagesResponse,
  GatewayConversationSearchResponse,
  GatewayErrorEnvelope,
  GatewayErrorCode,
  GatewayHealthResponse,
  GatewayMessageMemoryPatchRequest,
  GatewayModelsResponse,
  GatewayReadyResponse,
  GatewayResult,
  GatewaySemanticRecallTestRequest,
  GatewaySemanticRecallTestResponse
} from "@/lib/gateway/types";
import {
  buildSafeErrorDetails,
  mapUpstreamToGatewayClientCode,
  type UpstreamGatewayError
} from "@/lib/gateway/provider-errors";
import { getConsoleClientAuthHeaders, isConsoleRuntimePath } from "@/lib/gateway/console-client-auth";

function toGatewayError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  status = 503
): GatewayResult<never> {
  return {
    ok: false,
    status,
    error: {
      code,
      message,
      type: "gateway_error",
      details
    }
  };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeGatewayErrorCode(
  code: string,
  credentials: EffectiveGatewayCredentials,
  internalAdmin: boolean,
  status: number,
  path: string
): GatewayErrorCode {
  const providerCode = mapUpstreamToGatewayClientCode(code);
  if (providerCode === "api_key_revoked") {
    return "api_key_revoked";
  }
  if (providerCode === "rate_limit_exceeded") {
    return "rate_limit_exceeded";
  }
  if (providerCode === "quota_exceeded") {
    return "quota_exceeded";
  }
  if (providerCode === "model_not_allowed") {
    return "model_not_allowed";
  }
  if (providerCode === "invalid_model") {
    return "invalid_model";
  }

  const lowered = code.trim().toLowerCase();
  if (lowered === "diagnostics_disabled") {
    return "diagnostics_disabled";
  }
  if (lowered === "model_config_not_found") {
    return "model_config_not_found";
  }
  if (lowered === "model_config_invalid") {
    return "invalid_model_config";
  }
  if (lowered === "conversation_not_found") {
    return "conversation_not_found";
  }
  if (lowered === "message_not_found") {
    return "message_not_found";
  }
  if (lowered === "invalid_memory_control_request" || lowered === "memory_control_invalid") {
    return "invalid_memory_control_request";
  }
  if (
    lowered === "semantic_recall_unavailable" ||
    lowered === "embeddings_unavailable" ||
    lowered === "semantic_recall_disabled"
  ) {
    return "semantic_recall_unavailable";
  }
  if (lowered === "internal_admin_disabled") {
    return "internal_admin_invalid";
  }
  if (lowered === "invalid_api_key") {
    return "invalid_api_key";
  }
  if (lowered === "missing_api_key") {
    return credentials.gatewayApiKeySource === "missing" ? "credentials_not_configured" : "invalid_api_key";
  }
  if (lowered === "internal_admin_unauthorized" || (internalAdmin && lowered === "unauthorized")) {
    return "internal_admin_invalid";
  }
  if (status === 404 && path.includes("/internal/embeddings/recall-test")) {
    return "semantic_recall_unavailable";
  }
  if (status === 404 && path.includes("/messages/") && path.includes("/memory")) {
    return "message_not_found";
  }
  if (status === 404 && path.includes("/v1/conversations/")) {
    return "conversation_not_found";
  }
  if (status === 404) {
    return "not_found";
  }
  if (
    lowered === "safety_violation" ||
    lowered === "secret_exfiltration_blocked" ||
    lowered === "malicious_cyber_request" ||
    lowered === "unsafe_output_blocked" ||
    lowered === "prompt_injection_detected" ||
    lowered.startsWith("runtime_provider_") ||
    lowered === "runtime_providers_disabled" ||
    lowered === "console_client_unauthorized" ||
    lowered === "console_client_auth_failed"
  ) {
    return lowered as GatewayErrorCode;
  }
  return "gateway_request_failed";
}

export async function gatewayFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { internalAdmin?: boolean; credentials?: EffectiveGatewayCredentials; consoleRuntime?: boolean }
): Promise<GatewayResult<T>> {
  const effective = options?.credentials || (await resolveEffectiveGatewayCredentials());
  const baseUrl = effective.gatewayUrl;

  if (!baseUrl) {
    return toGatewayError(
      "credentials_not_configured",
      "Gateway credentials are not configured. Update Settings -> Gateway Credentials.",
      undefined,
      400
    );
  }

  const url = new URL(path, `${baseUrl}/`);
  const internalAdmin = Boolean(options?.internalAdmin);
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  });

  if (internalAdmin) {
    if (effective.internalAdminEnabled && effective.internalAdminToken) {
      headers.set("Authorization", `Bearer ${effective.internalAdminToken}`);
    }
  } else if (effective.gatewayApiKey) {
    headers.set("Authorization", `Bearer ${effective.gatewayApiKey}`);
  }

  if (options?.consoleRuntime || isConsoleRuntimePath(path)) {
    const consoleHeaders = getConsoleClientAuthHeaders();
    for (const [key, value] of Object.entries(consoleHeaders)) {
      headers.set(key, value);
    }
  }

  if (init.headers) {
    const extraHeaders = new Headers(init.headers);
    extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store"
    });
    const payload = await safeJson(response);

    if (!response.ok) {
      const errorPayload = payload as GatewayErrorEnvelope | null;
      if (errorPayload?.error) {
        const upstreamError = errorPayload.error as UpstreamGatewayError;
        const normalizedCode = normalizeGatewayErrorCode(
          upstreamError.code || "",
          effective,
          internalAdmin,
          response.status,
          path
        );
        const safeDetails = buildSafeErrorDetails({
          response,
          upstream: upstreamError,
          status: response.status,
          path
        });
        return {
          ok: false,
          status: response.status,
          error: {
            code: normalizedCode,
            message: upstreamError.message || "Gateway request failed.",
            type: "gateway_error",
            details: safeDetails
          }
        };
      }

      if (response.status === 401 || response.status === 403) {
        return toGatewayError(
          internalAdmin ? "internal_admin_invalid" : "invalid_api_key",
          internalAdmin
            ? "Internal admin credentials are invalid."
            : "Gateway API key is invalid or expired. Update Gateway Credentials.",
          buildSafeErrorDetails({ response, status: response.status, path }),
          response.status
        );
      }

      if (response.status === 404) {
        return toGatewayError("not_found", "Requested resource was not found.", { status: 404, path }, 404);
      }

      return toGatewayError(
        "unknown_error",
        `Gateway request failed with status ${response.status}.`,
        { status: response.status, path },
        response.status
      );
    }

    return {
      ok: true,
      status: response.status,
      data: (payload ?? {}) as T
    };
  } catch (error) {
    return toGatewayError(
      "gateway_unreachable",
      "Gateway is unavailable or unreachable from Nesty Console.",
      { reason: error instanceof Error ? error.message : "unknown", path },
      503
    );
  }
}

export async function getGatewayHealth(): Promise<GatewayResult<GatewayHealthResponse>> {
  return gatewayFetch<GatewayHealthResponse>("/health");
}

export async function getGatewayReady(): Promise<GatewayResult<GatewayReadyResponse>> {
  return gatewayFetch<GatewayReadyResponse>("/ready");
}

export async function getGatewayModels(): Promise<GatewayResult<GatewayModelsResponse>> {
  return gatewayFetch<GatewayModelsResponse>("/v1/models");
}

type ConversationListQuery = {
  limit?: number;
  offset?: number;
  archived?: boolean;
  q?: string;
};

type ConversationSearchQuery = {
  q?: string;
  limit?: number;
  offset?: number;
  scope?: string;
  archived?: boolean;
};

type ConversationMessagesQuery = {
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
};

type ConversationExportQuery = {
  include_metadata?: boolean;
  messages_order?: "asc" | "desc";
};

type ConversationMemoryControlsQuery = {
  limit?: number;
  offset?: number;
  archived?: boolean;
};

function withQuery(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function listGatewayConversations(
  query: ConversationListQuery = {}
): Promise<GatewayResult<GatewayConversationListResponse>> {
  return gatewayFetch<GatewayConversationListResponse>(
    withQuery("/v1/conversations", {
      limit: query.limit,
      offset: query.offset,
      archived: query.archived,
      q: query.q
    })
  );
}

export async function searchGatewayConversations(
  query: ConversationSearchQuery = {}
): Promise<GatewayResult<GatewayConversationSearchResponse>> {
  return gatewayFetch<GatewayConversationSearchResponse>(
    withQuery("/v1/conversations/search", {
      q: query.q,
      limit: query.limit,
      offset: query.offset,
      scope: query.scope,
      archived: query.archived
    })
  );
}

export async function getGatewayConversation(conversationId: string): Promise<GatewayResult<GatewayConversationDetailResponse>> {
  return gatewayFetch<GatewayConversationDetailResponse>(`/v1/conversations/${encodeURIComponent(conversationId)}`);
}

export async function getGatewayConversationMessages(
  conversationId: string,
  query: ConversationMessagesQuery = {}
): Promise<GatewayResult<GatewayConversationMessagesResponse>> {
  return gatewayFetch<GatewayConversationMessagesResponse>(
    withQuery(`/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
      limit: query.limit,
      offset: query.offset,
      order: query.order
    })
  );
}

export async function patchGatewayConversation(
  conversationId: string,
  payload: Record<string, unknown>
): Promise<GatewayResult<GatewayConversationDetailResponse>> {
  return gatewayFetch<GatewayConversationDetailResponse>(`/v1/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteGatewayConversation(conversationId: string): Promise<GatewayResult<Record<string, unknown>>> {
  return gatewayFetch<Record<string, unknown>>(`/v1/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE"
  });
}

export async function getGatewayConversationExport(
  conversationId: string,
  query: ConversationExportQuery = {}
): Promise<GatewayResult<GatewayConversationExportResponse>> {
  return gatewayFetch<GatewayConversationExportResponse>(
    withQuery(`/v1/conversations/${encodeURIComponent(conversationId)}/export`, {
      include_metadata: query.include_metadata,
      messages_order: query.messages_order
    })
  );
}

export async function summarizeGatewayConversation(
  conversationId: string,
  payload: Record<string, unknown> = {}
): Promise<GatewayResult<Record<string, unknown>>> {
  return gatewayFetch<Record<string, unknown>>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/summarize`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function clearGatewayConversation(
  conversationId: string,
  payload: Record<string, unknown> = {}
): Promise<GatewayResult<Record<string, unknown>>> {
  return gatewayFetch<Record<string, unknown>>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/clear`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function resetGatewayConversationSummary(
  conversationId: string
): Promise<GatewayResult<Record<string, unknown>>> {
  return gatewayFetch<Record<string, unknown>>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/reset-summary`,
    {
      method: "POST"
    }
  );
}

export async function patchGatewayMessageMemory(
  conversationId: string,
  messageId: string,
  payload: GatewayMessageMemoryPatchRequest
): Promise<GatewayResult<Record<string, unknown>>> {
  return gatewayFetch<Record<string, unknown>>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/memory`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

export async function getGatewayConversationMemoryControls(
  query: ConversationMemoryControlsQuery = {}
): Promise<GatewayResult<GatewayConversationMemoryControlsResponse>> {
  return gatewayFetch<GatewayConversationMemoryControlsResponse>(
    withQuery("/v1/conversations/memory-controls", {
      limit: query.limit,
      offset: query.offset,
      archived: query.archived
    })
  );
}

export async function runGatewaySemanticRecallTest(
  payload: GatewaySemanticRecallTestRequest,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<GatewaySemanticRecallTestResponse>> {
  return gatewayFetch<GatewaySemanticRecallTestResponse>(
    "/internal/embeddings/recall-test",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    { credentials, internalAdmin: true }
  );
}
