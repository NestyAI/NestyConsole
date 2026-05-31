import "server-only";

import { resolveEffectiveGatewayCredentials } from "@/lib/console/credentials";
import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import type {
  GatewayErrorEnvelope,
  GatewayErrorCode,
  GatewayHealthResponse,
  GatewayModelsResponse,
  GatewayReadyResponse,
  GatewayResult
} from "@/lib/gateway/types";

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
  internalAdmin: boolean
): GatewayErrorCode {
  const lowered = code.trim().toLowerCase();
  if (lowered === "invalid_api_key") {
    return "invalid_api_key";
  }
  if (lowered === "missing_api_key") {
    return credentials.gatewayApiKeySource === "missing" ? "credentials_not_configured" : "invalid_api_key";
  }
  if (lowered === "internal_admin_unauthorized" || (internalAdmin && lowered === "unauthorized")) {
    return "internal_admin_invalid";
  }
  return "gateway_request_failed";
}

export async function gatewayFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { internalAdmin?: boolean; credentials?: EffectiveGatewayCredentials }
): Promise<GatewayResult<T>> {
  const effective = options?.credentials || resolveEffectiveGatewayCredentials();
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
        const normalizedCode = normalizeGatewayErrorCode(errorPayload.error.code || "", effective, internalAdmin);
        return {
          ok: false,
          status: response.status,
          error: {
            code: normalizedCode,
            message: errorPayload.error.message || "Gateway request failed.",
            type: "gateway_error",
            details: {
              status: response.status,
              upstream_code: errorPayload.error.code || "unknown",
              path
            }
          }
        };
      }

      if (response.status === 401 || response.status === 403) {
        return toGatewayError(
          internalAdmin ? "internal_admin_invalid" : "invalid_api_key",
          internalAdmin
            ? "Internal admin credentials are invalid."
            : "Gateway API key is invalid or expired. Update Gateway Credentials.",
          { status: response.status, path },
          response.status
        );
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
