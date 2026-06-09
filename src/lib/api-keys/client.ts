import type {
  GatewayApiKeyCreateRequest,
  GatewayApiKeyCreateResponse,
  GatewayApiKeyListResponse,
  GatewayApiKeyPublicInfo,
  GatewayApiKeyRevokeResponse,
  GatewayApiKeyUpdateRequest
} from "@/lib/gateway/types";

export type ApiKeyConsoleError = {
  code: string;
  message: string;
};

export type ApiKeyRequestResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiKeyConsoleError;
    };

function normalizeError(payload: unknown, fallback: string): ApiKeyConsoleError {
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<ApiKeyRequestResult<T>> {
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
      error: normalizeError(payload, "API Key request failed.")
    };
  }

  return {
    ok: true,
    data: (payload || {}) as T
  };
}

function withQuery(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function listApiKeys(params?: {
  environment?: string;
  revoked?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiKeyRequestResult<GatewayApiKeyListResponse>> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params) {
    if (params.environment) queryParams.environment = params.environment;
    if (params.revoked !== undefined) queryParams.revoked = params.revoked;
    if (params.q) queryParams.q = params.q;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;
  }

  const url = withQuery("/api/internal/api-keys", queryParams);
  return requestJson<GatewayApiKeyListResponse>(url);
}

export async function createApiKey(
  payload: GatewayApiKeyCreateRequest
): Promise<ApiKeyRequestResult<GatewayApiKeyCreateResponse>> {
  return requestJson<GatewayApiKeyCreateResponse>("/api/internal/api-keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function getApiKey(apiKeyId: string): Promise<ApiKeyRequestResult<GatewayApiKeyPublicInfo>> {
  const id = apiKeyId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "invalid_api_key_request",
        message: "API key ID is required."
      }
    };
  }
  return requestJson<GatewayApiKeyPublicInfo>(`/api/internal/api-keys/${encodeURIComponent(id)}`);
}

export async function updateApiKey(
  apiKeyId: string,
  payload: GatewayApiKeyUpdateRequest
): Promise<ApiKeyRequestResult<GatewayApiKeyPublicInfo>> {
  const id = apiKeyId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "invalid_api_key_request",
        message: "API key ID is required."
      }
    };
  }
  return requestJson<GatewayApiKeyPublicInfo>(`/api/internal/api-keys/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function revokeApiKey(
  apiKeyId: string,
  reason?: string
): Promise<ApiKeyRequestResult<GatewayApiKeyRevokeResponse>> {
  const id = apiKeyId.trim();
  if (!id) {
    return {
      ok: false,
      error: {
        code: "invalid_api_key_request",
        message: "API key ID is required."
      }
    };
  }
  const payload: Record<string, string> = {};
  if (reason && reason.trim()) {
    payload.reason = reason.trim();
  }
  return requestJson<GatewayApiKeyRevokeResponse>(`/api/internal/api-keys/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
