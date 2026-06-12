import { NextResponse } from "next/server";

import {
  fallbackMessageForProviderCode,
  mapUpstreamToConsoleCode,
  type ConsoleProviderErrorCode
} from "@/lib/gateway/provider-errors";
import { policyMessageForCode } from "@/lib/gateway/policy-errors";
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
  | "unknown_error"
  | "gateway_policy_violation"
  | "gateway_secret_exfiltration_blocked"
  | "gateway_malicious_cyber_request"
  | "gateway_unsafe_output_blocked"
  | "gateway_prompt_injection_detected"
  | "runtime_provider_not_found"
  | "runtime_provider_invalid"
  | "runtime_provider_conflict"
  | "runtime_provider_secret_missing"
  | "runtime_provider_test_failed"
  | "runtime_provider_builtin_readonly"
  | "runtime_providers_disabled"
  | "console_client_unauthorized"
  | "console_client_auth_failed"
  | "builtin_provider_not_found"
  | "provider_credentials_disabled"
  | "provider_credential_invalid"
  | "provider_credential_error"
  | "admin_token_rotation_unsupported";

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
      "credentials_not_configured",
      "gateway_policy_violation",
      "gateway_secret_exfiltration_blocked",
      "gateway_malicious_cyber_request",
      "gateway_unsafe_output_blocked",
      "gateway_prompt_injection_detected",
      "runtime_provider_not_found",
      "runtime_provider_invalid",
      "runtime_provider_conflict",
      "runtime_provider_secret_missing",
      "runtime_provider_test_failed",
      "runtime_provider_builtin_readonly",
      "runtime_providers_disabled",
      "console_client_unauthorized",
      "console_client_auth_failed",
      "builtin_provider_not_found",
      "provider_credentials_disabled",
      "provider_credential_invalid",
      "provider_credential_error",
      "admin_token_rotation_unsupported"
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
  if (lowered === "invalid_api_key_request" || lowered === "api_key_create_failed" || lowered === "api_key_revoke_failed") {
    return "invalid_api_key_request";
  }
  if (
    lowered === "safety_violation" ||
    lowered === "gateway_policy_violation"
  ) {
    return "gateway_policy_violation";
  }
  if (lowered === "secret_exfiltration_blocked" || lowered === "gateway_secret_exfiltration_blocked") {
    return "gateway_secret_exfiltration_blocked";
  }
  if (lowered === "malicious_cyber_request" || lowered === "gateway_malicious_cyber_request") {
    return "gateway_malicious_cyber_request";
  }
  if (lowered === "unsafe_output_blocked" || lowered === "gateway_unsafe_output_blocked") {
    return "gateway_unsafe_output_blocked";
  }
  if (lowered === "prompt_injection_detected" || lowered === "gateway_prompt_injection_detected") {
    return "gateway_prompt_injection_detected";
  }
  if (lowered === "runtime_provider_not_found") {
    return "runtime_provider_not_found";
  }
  if (lowered === "runtime_provider_invalid") {
    return "runtime_provider_invalid";
  }
  if (lowered === "runtime_provider_conflict") {
    return "runtime_provider_conflict";
  }
  if (lowered === "runtime_provider_secret_missing") {
    return "runtime_provider_secret_missing";
  }
  if (lowered === "runtime_provider_test_failed") {
    return "runtime_provider_test_failed";
  }
  if (lowered === "runtime_provider_builtin_readonly") {
    return "runtime_provider_builtin_readonly";
  }
  if (lowered === "runtime_providers_disabled") {
    return "runtime_providers_disabled";
  }
  if (lowered === "console_client_unauthorized") {
    return "console_client_unauthorized";
  }
  if (lowered === "console_client_auth_failed") {
    return "console_client_auth_failed";
  }
  if (lowered === "builtin_provider_not_found") {
    return "builtin_provider_not_found";
  }
  if (lowered === "provider_credentials_disabled") {
    return "provider_credentials_disabled";
  }
  if (lowered === "provider_credential_invalid") {
    return "provider_credential_invalid";
  }
  if (lowered === "provider_credential_error") {
    return "provider_credential_error";
  }
  if (
    lowered === "admin_token_rotation_unsupported" ||
    lowered === "admin_token_rotation_unsupported_env" ||
    lowered === "admin_token_rotation_unsupported_ephemeral"
  ) {
    return "admin_token_rotation_unsupported";
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
    case "gateway_policy_violation":
    case "gateway_secret_exfiltration_blocked":
    case "gateway_malicious_cyber_request":
    case "gateway_unsafe_output_blocked":
    case "gateway_prompt_injection_detected":
      return policyMessageForCode(code, typeof details?.reason_code === "string" ? details.reason_code : null);
    case "runtime_provider_not_found":
      return "Runtime provider was not found on Gateway.";
    case "runtime_provider_invalid":
      return "Runtime provider payload is invalid. Check required fields and try again.";
    case "runtime_provider_conflict":
      return "A provider with this ID already exists.";
    case "runtime_provider_secret_missing":
      return "Runtime provider is missing a configured secret. Add an API key or env reference.";
    case "runtime_provider_test_failed":
      return "Runtime provider test failed. Check base URL, model, and credentials.";
    case "runtime_provider_builtin_readonly":
      return "Built-in providers are read-only. Disable routing instead of deleting.";
    case "runtime_providers_disabled":
      return "Runtime OpenAI-compatible providers are disabled on Gateway. Enable NESTY_RUNTIME_OPENAI_PROVIDERS_ENABLED or use built-in providers.";
    case "console_client_unauthorized":
    case "console_client_auth_failed":
      return "Console client authentication failed. Check NESTY_CONSOLE_CLIENT_ID and NESTY_CONSOLE_CLIENT_SECRET.";
    case "builtin_provider_not_found":
      return "Built-in provider was not found on Gateway.";
    case "provider_credentials_disabled":
      return "Built-in provider credential management is disabled on Gateway. Set NESTY_PROVIDER_CREDENTIALS_ENABLED=true.";
    case "provider_credential_invalid":
      return "Built-in provider credential payload is invalid.";
    case "provider_credential_error":
      return "Built-in provider credential operation failed on Gateway.";
    case "admin_token_rotation_unsupported":
      return "Gateway admin token rotation is not supported for the current token mode.";
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
