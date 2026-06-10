import { NextResponse } from "next/server";

import {
  fallbackMessageForProviderCode,
  mapUpstreamToConsoleCode,
  type ConsoleProviderErrorCode
} from "@/lib/gateway/provider-errors";
import type { GatewayResult } from "@/lib/gateway/types";

type ConsoleProxyErrorCode =
  | "unauthorized"
  | "credentials_not_configured"
  | "credential_storage_unavailable"
  | "invalid_gateway_api_key"
  | "api_key_revoked"
  | "internal_admin_not_configured"
  | "internal_admin_invalid"
  | "diagnostics_disabled"
  | "provider_model_unavailable"
  | "provider_unavailable"
  | "provider_timeout"
  | "rate_limited"
  | "gateway_rate_limited"
  | "gateway_quota_exceeded"
  | "gateway_model_not_allowed"
  | "gateway_invalid_model"
  | "model_config_not_found"
  | "invalid_model_config"
  | "conversation_not_found"
  | "message_not_found"
  | "invalid_memory_control_request"
  | "semantic_recall_unavailable"
  | "gateway_unreachable"
  | "gateway_upstream_failed"
  | "gateway_provider_unavailable"
  | "gateway_route_not_found"
  | "gateway_error"
  | "api_key_not_found"
  | "invalid_api_key_request"
  | "not_found"
  | "unknown_error";

function normalizeGatewayErrorCode(code: string, upstreamCode?: string | null, status?: number): ConsoleProxyErrorCode {
  const upstreamMapped = upstreamCode
    ? mapUpstreamToConsoleCode(upstreamCode, status || 500)
    : null;
  if (
    upstreamMapped &&
    [
      "api_key_revoked",
      "invalid_gateway_api_key",
      "gateway_rate_limited",
      "gateway_quota_exceeded",
      "gateway_model_not_allowed",
      "gateway_invalid_model",
      "gateway_upstream_failed",
      "gateway_provider_unavailable",
      "credentials_not_configured"
    ].includes(upstreamMapped)
  ) {
    return upstreamMapped;
  }

  const lowered = code.trim().toLowerCase();
  if (lowered === "api_key_revoked") {
    return "api_key_revoked";
  }
  if (lowered === "rate_limit_exceeded") {
    return "gateway_rate_limited";
  }
  if (lowered === "quota_exceeded") {
    return "gateway_quota_exceeded";
  }
  if (lowered === "model_not_allowed") {
    return "gateway_model_not_allowed";
  }
  if (lowered === "invalid_model") {
    return "gateway_invalid_model";
  }
  if (lowered === "credentials_not_configured") {
    return "credentials_not_configured";
  }
  if (lowered === "credential_storage_unavailable" || lowered === "credential_storage_write_failed") {
    return "credential_storage_unavailable";
  }
  if (lowered === "unauthorized") {
    return "unauthorized";
  }
  if (lowered === "internal_admin_invalid") {
    return "internal_admin_invalid";
  }
  if (lowered === "internal_admin_disabled") {
    return "internal_admin_not_configured";
  }
  if (lowered === "diagnostics_disabled") {
    return "diagnostics_disabled";
  }
  if (lowered === "provider_model_unavailable" || lowered === "model_unavailable" || lowered === "openrouter_model_unavailable") {
    return "provider_model_unavailable";
  }
  if (lowered === "provider_unavailable" || lowered === "gateway_provider_unavailable") {
    return "provider_unavailable";
  }
  if (lowered === "provider_timeout") {
    return "provider_timeout";
  }
  if (lowered === "rate_limited") {
    return "rate_limited";
  }
  if (lowered === "model_config_not_found") {
    return "model_config_not_found";
  }
  if (lowered === "invalid_model_config") {
    return "invalid_model_config";
  }
  if (lowered === "conversation_not_found") {
    return "conversation_not_found";
  }
  if (lowered === "message_not_found") {
    return "message_not_found";
  }
  if (lowered === "invalid_memory_control_request") {
    return "invalid_memory_control_request";
  }
  if (lowered === "semantic_recall_unavailable") {
    return "semantic_recall_unavailable";
  }
  if (lowered === "invalid_api_key" || lowered === "missing_api_key") {
    return "invalid_gateway_api_key";
  }
  if (lowered === "gateway_unreachable") {
    return "gateway_unreachable";
  }
  if (lowered === "gateway_upstream_failed") {
    return "gateway_upstream_failed";
  }
  if (lowered === "gateway_provider_unavailable") {
    return "gateway_provider_unavailable";
  }
  if (lowered === "gateway_route_not_found") {
    return "gateway_route_not_found";
  }
  if (lowered === "not_found") {
    return "not_found";
  }
  if (lowered === "gateway_request_failed") {
    return "gateway_error";
  }
  if (lowered === "api_key_not_found") {
    return "api_key_not_found";
  }
  if (
    lowered === "invalid_api_key_request" ||
    lowered === "api_key_create_failed" ||
    lowered === "api_key_revoke_failed"
  ) {
    return "invalid_api_key_request";
  }
  return "unknown_error";
}

function fallbackMessage(code: ConsoleProxyErrorCode, details?: Record<string, unknown>): string {
  if (
    code === "api_key_revoked" ||
    code === "invalid_gateway_api_key" ||
    code === "gateway_rate_limited" ||
    code === "gateway_quota_exceeded" ||
    code === "gateway_model_not_allowed" ||
    code === "gateway_invalid_model" ||
    code === "gateway_upstream_failed" ||
    code === "gateway_provider_unavailable" ||
    code === "gateway_route_not_found" ||
    code === "credentials_not_configured" ||
    code === "gateway_error" ||
    code === "unknown_error"
  ) {
    return fallbackMessageForProviderCode(code as ConsoleProviderErrorCode, details);
  }

  switch (code) {
    case "credential_storage_unavailable":
      return "Credential storage is unavailable. Check Settings -> Gateway Credentials storage mode.";
    case "unauthorized":
      return "Authentication required.";
    case "internal_admin_not_configured":
      return "Internal admin access is not configured. Add the admin token in Settings -> Gateway Credentials.";
    case "internal_admin_invalid":
      return "Internal admin token is invalid.";
    case "diagnostics_disabled":
      return "Diagnostics are disabled on Gateway.";
    case "provider_model_unavailable":
      return "Selected model is unavailable on the provider. Check runtime model chain or provider status.";
    case "provider_unavailable":
      return "Selected provider is unavailable or temporarily down.";
    case "provider_timeout":
      return "Provider timed out before Gateway received a response.";
    case "rate_limited":
      return "Provider rate limit reached. Retry later or use another provider chain.";
    case "model_config_not_found":
      return "Model config was not found.";
    case "invalid_model_config":
      return "Model config override is invalid.";
    case "conversation_not_found":
      return "Conversation was not found.";
    case "message_not_found":
      return "Message was not found.";
    case "invalid_memory_control_request":
      return "Memory control update is invalid.";
    case "semantic_recall_unavailable":
      return "Semantic recall is unavailable on Gateway.";
    case "gateway_unreachable":
      return "Console could not reach the Gateway. Check Gateway URL, tunnel, and network.";
    case "not_found":
      return "Requested resource was not found.";
    case "api_key_not_found":
      return "The requested API key was not found.";
    case "invalid_api_key_request":
      return "The API key request was invalid.";
    default:
      return "Unknown gateway error.";
  }
}

export function gatewayResultToResponse<T>(result: GatewayResult<T>) {
  if (result.ok) {
    return NextResponse.json(result.data, { status: result.status });
  }

  const upstreamCode =
    typeof result.error.details?.upstream_code === "string" ? result.error.details.upstream_code : null;
  const code = normalizeGatewayErrorCode(result.error.code || "", upstreamCode, result.status);
  const message = String(result.error.message || fallbackMessage(code, result.error.details));
  const status = result.status >= 400 ? result.status : 500;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        type: "console_error",
        ...(result.error.details ? { details: result.error.details } : {})
      }
    },
    { status }
  );
}

export function internalAdminNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: {
        code: "internal_admin_not_configured",
        message: "Internal admin access is not configured. Add the admin token in Settings -> Gateway Credentials.",
        type: "console_error"
      }
    },
    { status: 400 }
  );
}
