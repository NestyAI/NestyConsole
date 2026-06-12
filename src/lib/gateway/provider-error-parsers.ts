/** Pure parser helpers — no server-only, React, or Next.js imports. */

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_FUTURE_SECONDS = 7 * 24 * 60 * 60;

export type RateLimitResetMetadata = {
  rate_limit_reset_seconds?: number;
  rate_limit_reset_at?: string;
};

export type RateLimitHintDetails = {
  retry_after_seconds?: number;
  rate_limit_reset_seconds?: number;
  rate_limit_reset_at?: string;
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

function secondsUntilFutureTimestamp(targetMs: number, nowMs: number): number | undefined {
  const deltaMs = targetMs - nowMs;
  if (deltaMs <= 0) {
    return undefined;
  }
  const seconds = Math.ceil(deltaMs / 1000);
  if (seconds > MAX_FUTURE_SECONDS) {
    return undefined;
  }
  return seconds;
}

export function parseRetryAfterHttpDate(header: string | null | undefined, nowMs = Date.now()): number | undefined {
  if (typeof header !== "string") {
    return undefined;
  }
  const trimmed = header.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) {
    return undefined;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return secondsUntilFutureTimestamp(parsed, nowMs);
}

export function parseRetryAfter(header: string | null | undefined, nowMs = Date.now()): number | undefined {
  const numeric = parseRetryAfterSeconds(header);
  if (numeric !== undefined) {
    return numeric <= MAX_FUTURE_SECONDS ? numeric : undefined;
  }
  return parseRetryAfterHttpDate(header, nowMs);
}

function toIsoUtc(ms: number): string {
  return new Date(ms).toISOString();
}

export function parseRateLimitReset(header: string | null | undefined, nowMs = Date.now()): RateLimitResetMetadata {
  if (typeof header !== "string") {
    return {};
  }
  const trimmed = header.trim();
  if (!trimmed) {
    return {};
  }

  if (/^\d+$/.test(trimmed)) {
    const raw = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(raw) || raw <= 0) {
      return {};
    }
    const resetMs = raw >= 1_000_000_000_000 ? raw : raw * 1000;
    const resetSeconds = secondsUntilFutureTimestamp(resetMs, nowMs);
    if (resetSeconds === undefined) {
      return {};
    }
    return {
      rate_limit_reset_seconds: resetSeconds,
      rate_limit_reset_at: toIsoUtc(resetMs)
    };
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return {};
  }
  const resetSeconds = secondsUntilFutureTimestamp(parsed, nowMs);
  if (resetSeconds === undefined) {
    return {};
  }
  return {
    rate_limit_reset_seconds: resetSeconds,
    rate_limit_reset_at: toIsoUtc(parsed)
  };
}

export function formatRateLimitHint(details?: RateLimitHintDetails | null): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  const retryAfter = details.retry_after_seconds;
  if (typeof retryAfter === "number" && retryAfter >= 0) {
    return `Try again in ${retryAfter} seconds.`;
  }

  const resetSeconds = details.rate_limit_reset_seconds;
  if (typeof resetSeconds === "number" && resetSeconds >= 0) {
    return `Rate limit resets in ${resetSeconds} seconds.`;
  }

  const resetAt = details.rate_limit_reset_at;
  if (typeof resetAt === "string" && resetAt.trim()) {
    const when = new Date(resetAt);
    if (!Number.isNaN(when.getTime()) && when.getTime() > Date.now()) {
      return `Rate limit resets at ${when.toLocaleString()}.`;
    }
  }

  return undefined;
}

export function rateLimitFallbackMessage(): string {
  return "Rate limit exceeded. Try again later.";
}
