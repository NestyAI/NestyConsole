import "server-only";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export type UpstreamGatewayError = {
  message?: string;
  type?: string;
  param?: string | null;
  code?: string;
  details?: Record<string, unknown>;
};

export type SafeErrorDetails = {
  upstream_status?: number;
  upstream_code?: string | null;
  upstream_type?: string | null;
  request_id?: string;
  quota_type?: string;
  limit?: number;
  openai_code_alias?: string;
  retry_after_seconds?: number;
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
  | "unknown_error";

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
  credentials_not_configured: "credentials_not_configured"
};

export function sanitizeRequestId(raw: string | undefined | null): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const candidate = raw.trim();
  if (!candidate || candidate.length > 64) {
    return undefined;
  }
  if (!SAFE_REQUEST_ID.test(candidate)) {
    return undefined;
  }
  return candidate;
}

export function parseRetryAfterSeconds(header: string | null | undefined): number | undefined {
  if (typeof header !== "string") {
    return undefined;
  }
  const trimmed = header.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const seconds = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }
  return seconds;
}

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

  const retryAfter = parseRetryAfterSeconds(input.response.headers.get("retry-after"));
  if (retryAfter !== undefined) {
    details.retry_after_seconds = retryAfter;
  }

  return details;
}

export function mapUpstreamToConsoleCode(
  upstreamCode: string,
  status: number
): ConsoleProviderErrorCode {
  const lowered = upstreamCode.trim().toLowerCase();
  if (lowered && UPSTREAM_CODE_MAP[lowered]) {
    return UPSTREAM_CODE_MAP[lowered];
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
      const seconds = details?.retry_after_seconds;
      if (typeof seconds === "number") {
        return `Rate limit exceeded. Try again in ${seconds} seconds.`;
      }
      return "Rate limit exceeded. Try again later.";
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
