import "server-only";

import {
  formatRateLimitHint,
  parseRateLimitReset,
  parseRetryAfter,
  rateLimitFallbackMessage,
  sanitizeRequestId,
  type RateLimitHintDetails
} from "@/lib/gateway/provider-error-parsers";
import { policyMessageForCode, type ConsolePolicyErrorCode } from "@/lib/gateway/policy-errors";

export {
  formatRateLimitHint,
  parseRateLimitReset,
  parseRetryAfter,
  parseRetryAfterSeconds,
  parseRetryAfterHttpDate,
  rateLimitFallbackMessage,
  sanitizeRequestId
} from "@/lib/gateway/provider-error-parsers";

export type UpstreamGatewayError = {
  message?: string;
  type?: string;
  param?: string | null;
  code?: string;
  details?: Record<string, unknown>;
};

export type SafeErrorDetails = RateLimitHintDetails & {
  upstream_status?: number;
  upstream_code?: string | null;
  upstream_type?: string | null;
  request_id?: string;
  reason_code?: string | null;
  provider_id?: string;
  credential_name?: string;
  quota_type?: string;
  limit?: number;
  openai_code_alias?: string;
  path?: string;
  gateway_code?: string | null;
};

export type ConsoleProviderErrorCode =
  | "api_key_revoked"
  | "invalid_gateway_api_key"
  | "gateway_rate_limited"
  | "gateway_quota_exceeded"
  | "gateway_model_not_allowed"
  | "gateway_invalid_model"
  | "gateway_upstream_failed"
  | "gateway_provider_unavailable"
  | "gateway_unreachable"
  | "gateway_route_not_found"
  | "credentials_not_configured"
  | "gateway_error"
  | "unknown_error"
  | ConsolePolicyErrorCode
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
  | "admin_token_rotation_unsupported"
  | "admin_token_rotation_unsupported_env"
  | "admin_token_rotation_unsupported_ephemeral";

export type NormalizedConsoleProviderErrorCode = Exclude<
  ConsoleProviderErrorCode,
  "admin_token_rotation_unsupported_env" | "admin_token_rotation_unsupported_ephemeral"
>;

const UPSTREAM_CODE_MAP: Record<string, ConsoleProviderErrorCode> = {
  api_key_revoked: "api_key_revoked",
  invalid_api_key: "invalid_gateway_api_key",
  missing_api_key: "invalid_gateway_api_key",
  rate_limit_exceeded: "gateway_rate_limited",
  daily_quota_exceeded: "gateway_quota_exceeded",
  monthly_quota_exceeded: "gateway_quota_exceeded",
  model_not_allowed: "gateway_model_not_allowed",
  invalid_model: "gateway_invalid_model",
  gateway_upstream_failed: "gateway_upstream_failed",
  rate_limited: "gateway_rate_limited",
  provider_unavailable: "gateway_provider_unavailable",
  provider_timeout: "gateway_provider_unavailable",
  provider_auth_failed: "gateway_upstream_failed",
  provider_model_unavailable: "gateway_upstream_failed",
  provider_failed: "gateway_upstream_failed",
  model_unavailable: "gateway_upstream_failed",
  openrouter_model_unavailable: "gateway_upstream_failed",
  credentials_not_configured: "credentials_not_configured",
  safety_violation: "gateway_policy_violation",
  secret_exfiltration_blocked: "gateway_secret_exfiltration_blocked",
  malicious_cyber_request: "gateway_malicious_cyber_request",
  unsafe_output_blocked: "gateway_unsafe_output_blocked",
  prompt_injection_detected: "gateway_prompt_injection_detected",
  runtime_provider_not_found: "runtime_provider_not_found",
  runtime_provider_invalid: "runtime_provider_invalid",
  runtime_provider_conflict: "runtime_provider_conflict",
  runtime_provider_secret_missing: "runtime_provider_secret_missing",
  runtime_provider_test_failed: "runtime_provider_test_failed",
  runtime_provider_builtin_readonly: "runtime_provider_builtin_readonly",
  runtime_providers_disabled: "runtime_providers_disabled",
  console_client_unauthorized: "console_client_unauthorized",
  console_client_auth_failed: "console_client_auth_failed",
  builtin_provider_not_found: "builtin_provider_not_found",
  provider_credentials_disabled: "provider_credentials_disabled",
  provider_credential_invalid: "provider_credential_invalid",
  provider_credential_error: "provider_credential_error",
  admin_token_rotation_unsupported: "admin_token_rotation_unsupported",
  admin_token_rotation_unsupported_env: "admin_token_rotation_unsupported",
  admin_token_rotation_unsupported_ephemeral: "admin_token_rotation_unsupported"
};

export function extractRequestId(
  response: Response,
  envelope?: UpstreamGatewayError | null
): string | undefined {
  const fromHeader = sanitizeRequestId(response.headers.get("x-request-id"));
  if (fromHeader) {
    return fromHeader;
  }
  const details = envelope?.details;
  if (details && typeof details === "object") {
    const fromDetails = sanitizeRequestId(String(details.request_id || ""));
    if (fromDetails) {
      return fromDetails;
    }
  }
  return undefined;
}

function readSafeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readSafeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

export function buildSafeErrorDetails(input: {
  response: Response;
  upstream?: UpstreamGatewayError | null;
  status: number;
  path?: string;
}): SafeErrorDetails {
  const upstream = input.upstream;
  const upstreamDetails =
    upstream?.details && typeof upstream.details === "object" ? upstream.details : undefined;

  const details: SafeErrorDetails = {
    upstream_status: input.status,
    upstream_code: upstream?.code || null,
    upstream_type: readSafeString(upstream?.type) || null
  };

  if (input.path) {
    details.path = input.path;
  }

  const requestId = extractRequestId(input.response, upstream);
  if (requestId) {
    details.request_id = requestId;
  }

  const quotaType = readSafeString(upstreamDetails?.quota_type);
  if (quotaType) {
    details.quota_type = quotaType;
  }

  const limit = readSafeNumber(upstreamDetails?.limit);
  if (limit !== undefined) {
    details.limit = limit;
  }

  const openaiAlias = readSafeString(upstreamDetails?.openai_code_alias);
  if (openaiAlias) {
    details.openai_code_alias = openaiAlias;
  }

  const reasonCode = readSafeString(upstreamDetails?.reason_code);
  if (reasonCode) {
    details.reason_code = reasonCode;
  }

  const providerId = readSafeString(upstreamDetails?.provider_id);
  if (providerId) {
    details.provider_id = providerId;
  }

  const credentialName = readSafeString(upstreamDetails?.credential_name);
  if (credentialName) {
    details.credential_name = credentialName;
  }

  const retryAfter = parseRetryAfter(input.response.headers.get("retry-after"));
  if (retryAfter !== undefined) {
    details.retry_after_seconds = retryAfter;
  }

  const resetMeta = parseRateLimitReset(input.response.headers.get("x-ratelimit-reset"));
  if (resetMeta.rate_limit_reset_seconds !== undefined) {
    details.rate_limit_reset_seconds = resetMeta.rate_limit_reset_seconds;
  }
  if (resetMeta.rate_limit_reset_at) {
    details.rate_limit_reset_at = resetMeta.rate_limit_reset_at;
  }

  return details;
}

export function mapUpstreamToConsoleCode(
  upstreamCode: string,
  status: number
): NormalizedConsoleProviderErrorCode {
  const lowered = upstreamCode.trim().toLowerCase();
  if (lowered && UPSTREAM_CODE_MAP[lowered]) {
    return UPSTREAM_CODE_MAP[lowered] as NormalizedConsoleProviderErrorCode;
  }

  if (status === 404) {
    return "gateway_route_not_found";
  }
  if (status === 502) {
    return "gateway_upstream_failed";
  }
  if (status === 503) {
    return "gateway_provider_unavailable";
  }
  if (status === 429) {
    return "gateway_rate_limited";
  }
  if (status === 401 || status === 403) {
    return "invalid_gateway_api_key";
  }
  if (status >= 400) {
    return "gateway_error";
  }
  return "unknown_error";
}

export function fallbackMessageForProviderCode(
  code: ConsoleProviderErrorCode,
  details?: SafeErrorDetails
): string {
  switch (code) {
    case "api_key_revoked":
      return "Gateway API key was revoked. Paste or create a new key in Settings -> Gateway Credentials.";
    case "invalid_gateway_api_key":
      return "Gateway API key is invalid or expired. Update it in Settings -> Gateway Credentials.";
    case "gateway_rate_limited": {
      const hint = formatRateLimitHint(details);
      return hint ? `Rate limit exceeded. ${hint}` : rateLimitFallbackMessage();
    }
    case "gateway_quota_exceeded": {
      const quotaType = details?.quota_type;
      const limit = details?.limit;
      if (quotaType && limit !== undefined) {
        return `Gateway quota exceeded (${quotaType}, limit ${limit}). Check API Keys or raise limits.`;
      }
      if (quotaType) {
        return `Gateway quota exceeded (${quotaType}). Check API Keys or raise limits.`;
      }
      return "Gateway quota exceeded for this API key. Check API Keys or raise limits.";
    }
    case "gateway_model_not_allowed":
      return "This API key cannot use the selected model. Check the key allowlist in API Keys.";
    case "gateway_invalid_model":
      return "The selected model alias is invalid or unavailable on Gateway. Check Models or Model Configs.";
    case "gateway_upstream_failed":
      return "Gateway is reachable, but the selected provider/model chain failed. Check Diagnostics or Model Configs.";
    case "gateway_provider_unavailable":
      return "Gateway is reachable, but the selected provider is unavailable.";
    case "gateway_unreachable":
      return "Console could not reach the Gateway. Check Gateway URL, tunnel, and network.";
    case "gateway_route_not_found":
      return "Gateway chat endpoint was not found. Check Gateway URL and API version.";
    case "credentials_not_configured":
      return "Gateway credentials are not configured. Add them in Settings -> Gateway Credentials.";
    case "gateway_policy_violation":
    case "gateway_secret_exfiltration_blocked":
    case "gateway_malicious_cyber_request":
    case "gateway_unsafe_output_blocked":
    case "gateway_prompt_injection_detected":
      return policyMessageForCode(code, details?.reason_code);
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
    case "gateway_error":
      return "Gateway request failed.";
    default:
      return "Gateway request failed.";
  }
}

export function mapUpstreamToGatewayClientCode(upstreamCode: string): string | null {
  const lowered = upstreamCode.trim().toLowerCase();
  if (!lowered) {
    return null;
  }
  if (lowered === "api_key_revoked") return "api_key_revoked";
  if (lowered === "invalid_api_key") return "invalid_api_key";
  if (lowered === "missing_api_key") return "missing_api_key";
  if (lowered === "rate_limit_exceeded" || lowered === "rate_limited") return "rate_limit_exceeded";
  if (lowered === "daily_quota_exceeded" || lowered === "monthly_quota_exceeded") return "quota_exceeded";
  if (lowered === "model_not_allowed") return "model_not_allowed";
  if (lowered === "invalid_model") return "invalid_model";
  return null;
}
