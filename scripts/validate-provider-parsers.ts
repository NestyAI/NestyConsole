import assert from "node:assert/strict";

import {
  formatRateLimitHint,
  parseRateLimitReset,
  parseRetryAfter,
  parseRetryAfterHttpDate,
  parseRetryAfterSeconds,
  sanitizeRequestId
} from "../src/lib/gateway/provider-error-parsers.ts";
import { mapPolicyUpstreamCode, policyMessageForCode } from "../src/lib/gateway/policy-errors.ts";

const NOW = Date.parse("2026-06-11T12:00:00.000Z");

assert.equal(parseRetryAfterSeconds("120"), 120);
assert.equal(parseRetryAfterSeconds("abc"), undefined);
assert.equal(parseRetryAfterSeconds("-1"), undefined);

const futureHttpDate = new Date(NOW + 90_000).toUTCString();
assert.equal(parseRetryAfterHttpDate(futureHttpDate, NOW), 90);

const pastHttpDate = new Date(NOW - 90_000).toUTCString();
assert.equal(parseRetryAfterHttpDate(pastHttpDate, NOW), undefined);

const farFutureHttpDate = new Date(NOW + 8 * 24 * 60 * 60 * 1000).toUTCString();
assert.equal(parseRetryAfterHttpDate(farFutureHttpDate, NOW), undefined);

assert.equal(parseRetryAfter("45", NOW), 45);
assert.equal(parseRetryAfter(futureHttpDate, NOW), 90);

const resetSeconds = Math.floor(NOW / 1000) + 300;
const resetMeta = parseRateLimitReset(String(resetSeconds), NOW);
assert.equal(resetMeta.rate_limit_reset_seconds, 300);
assert.ok(resetMeta.rate_limit_reset_at);

const resetMs = (Math.floor(NOW / 1000) + 120) * 1000;
const resetMetaMs = parseRateLimitReset(String(resetMs), NOW);
assert.equal(resetMetaMs.rate_limit_reset_seconds, 120);

assert.deepEqual(parseRateLimitReset("not-a-date", NOW), {});
assert.deepEqual(parseRateLimitReset(String(Math.floor(NOW / 1000) - 60), NOW), {});

assert.equal(sanitizeRequestId("req_abc-123.test"), "req_abc-123.test");
assert.equal(sanitizeRequestId("bad id with spaces"), undefined);

assert.equal(
  formatRateLimitHint({ retry_after_seconds: 30 }),
  "Try again in 30 seconds."
);
assert.equal(
  formatRateLimitHint({ rate_limit_reset_seconds: 45 }),
  "Rate limit resets in 45 seconds."
);

assert.equal(mapPolicyUpstreamCode("safety_violation"), "gateway_policy_violation");
assert.equal(mapPolicyUpstreamCode("prompt_injection_detected"), "gateway_prompt_injection_detected");
assert.equal(mapPolicyUpstreamCode("not_a_policy_code"), null);
assert.match(policyMessageForCode("gateway_secret_exfiltration_blocked"), /secrets/i);
assert.equal(mapPolicyUpstreamCode("runtime_provider_not_found"), null);

const RUNTIME_ERROR_MESSAGES: Record<string, string> = {
  runtime_providers_disabled:
    "Runtime OpenAI-compatible providers are disabled on Gateway. Enable NESTY_RUNTIME_OPENAI_PROVIDERS_ENABLED or use built-in providers.",
  console_client_unauthorized:
    "Console client authentication failed. Check NESTY_CONSOLE_CLIENT_ID and NESTY_CONSOLE_CLIENT_SECRET.",
  console_client_auth_failed:
    "Console client authentication failed. Check NESTY_CONSOLE_CLIENT_ID and NESTY_CONSOLE_CLIENT_SECRET."
};

assert.match(RUNTIME_ERROR_MESSAGES.runtime_providers_disabled, /disabled/i);
assert.match(RUNTIME_ERROR_MESSAGES.console_client_unauthorized, /NESTY_CONSOLE_CLIENT/i);
assert.match(RUNTIME_ERROR_MESSAGES.console_client_auth_failed, /NESTY_CONSOLE_CLIENT/i);

const V16_ERROR_MESSAGES: Record<string, string> = {
  builtin_provider_not_found: "Built-in provider was not found on Gateway.",
  provider_credentials_disabled:
    "Built-in provider credential management is disabled on Gateway. Set NESTY_PROVIDER_CREDENTIALS_ENABLED=true.",
  provider_credential_invalid: "Built-in provider credential payload is invalid.",
  provider_credential_error: "Built-in provider credential operation failed on Gateway.",
  admin_token_rotation_unsupported: "Gateway admin token rotation is not supported for the current token mode.",
  runtime_provider_not_found: "Runtime provider was not found on Gateway."
};

assert.match(V16_ERROR_MESSAGES.builtin_provider_not_found, /Built-in provider/i);
assert.match(V16_ERROR_MESSAGES.provider_credentials_disabled, /NESTY_PROVIDER_CREDENTIALS_ENABLED/i);
assert.match(V16_ERROR_MESSAGES.provider_credential_invalid, /credential payload/i);
assert.match(V16_ERROR_MESSAGES.provider_credential_error, /credential operation/i);
assert.match(V16_ERROR_MESSAGES.admin_token_rotation_unsupported, /rotation is not supported/i);
assert.match(V16_ERROR_MESSAGES.runtime_provider_not_found, /Runtime provider/i);

console.log("validate-provider-parsers: all fixtures passed");
