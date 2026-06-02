import { NextResponse } from "next/server";

import {
  cleanOptionalText,
  normalizeUrl,
  resolveEffectiveGatewayCredentials,
  updateGatewayCredentialsStatus
} from "@/lib/console/credentials";
import type { EffectiveGatewayCredentials, GatewayTestStatus } from "@/lib/console/types";
import { gatewayFetch } from "@/lib/gateway/client";

export const dynamic = "force-dynamic";

type ProbeSummary = {
  ok: boolean;
  status: number;
  error_code?: string;
  error_message?: string;
};

type TestResponse = {
  status: GatewayTestStatus;
  ok: boolean;
  message: string;
  probes: {
    health: ProbeSummary;
    ready: ProbeSummary;
    models: ProbeSummary;
    internal_admin?: ProbeSummary;
  };
  warning?: string;
  storage_mode?: "sqlite" | "redis_kv" | "env_only";
  storage_available?: boolean;
};

function summarizeProbe(result: Awaited<ReturnType<typeof gatewayFetch<unknown>>>): ProbeSummary {
  if (result.ok) {
    return { ok: true, status: result.status };
  }
  return {
    ok: false,
    status: result.status,
    error_code: result.error.code,
    error_message: result.error.message
  };
}

function deriveFinalStatus(
  probes: TestResponse["probes"],
  credentialsState: EffectiveGatewayCredentials
): GatewayTestStatus {
  const allErrors = [
    probes.health.error_code,
    probes.ready.error_code,
    probes.models.error_code,
    probes.internal_admin?.error_code
  ].filter(Boolean) as string[];

  if (!credentialsState.gatewayUrl) {
    return "credentials_not_configured";
  }
  if (!credentialsState.gatewayApiKey && allErrors.includes("credentials_not_configured")) {
    return "credentials_not_configured";
  }
  if (allErrors.includes("invalid_api_key")) {
    return "invalid_api_key";
  }
  if (allErrors.includes("internal_admin_invalid")) {
    return "internal_admin_invalid";
  }
  if (allErrors.includes("gateway_unreachable")) {
    return "gateway_unreachable";
  }
  if (allErrors.length === 0) {
    return "ok";
  }
  return "unknown_error";
}

interface TestRequestBody {
  gatewayUrl?: string;
  gateway_url?: string;
  gatewayApiKey?: string;
  gateway_api_key?: string;
  internalAdminToken?: string;
  internal_admin_token?: string;
  internalAdminEnabled?: boolean;
  internal_admin_enabled?: boolean;
}

export async function POST(request: Request) {
  const effective = await resolveEffectiveGatewayCredentials();

  // Parse request body
  let body: TestRequestBody = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as TestRequestBody;
    }
  } catch {
    // Ignore JSON parsing errors
  }

  // Extract variables with support for both snake_case and camelCase
  const gatewayUrlInput = body.gatewayUrl !== undefined ? body.gatewayUrl : body.gateway_url;
  const gatewayApiKeyInput = body.gatewayApiKey !== undefined ? body.gatewayApiKey : body.gateway_api_key;
  const internalAdminTokenInput = body.internalAdminToken !== undefined ? body.internalAdminToken : body.internal_admin_token;
  const internalAdminEnabledInput = body.internalAdminEnabled !== undefined ? body.internalAdminEnabled : body.internal_admin_enabled;

  // Build test credentials
  const testCredentials = { ...effective };

  if (gatewayUrlInput !== undefined) {
    const cleanGatewayUrl = cleanOptionalText(gatewayUrlInput);
    if (cleanGatewayUrl !== null) {
      testCredentials.gatewayUrl = normalizeUrl(cleanGatewayUrl);
      testCredentials.gatewayUrlSource = "stored";
    }
  }

  if (gatewayApiKeyInput !== undefined) {
    const cleanApiKey = cleanOptionalText(gatewayApiKeyInput);
    if (cleanApiKey !== null) {
      testCredentials.gatewayApiKey = cleanApiKey;
      testCredentials.gatewayApiKeySource = "stored";
    }
  }

  if (internalAdminTokenInput !== undefined) {
    const cleanInternalToken = cleanOptionalText(internalAdminTokenInput);
    if (cleanInternalToken !== null) {
      testCredentials.internalAdminToken = cleanInternalToken;
      testCredentials.internalAdminTokenSource = "stored";
    }
  }

  if (internalAdminEnabledInput !== undefined) {
    testCredentials.internalAdminEnabled = typeof internalAdminEnabledInput === "boolean"
      ? internalAdminEnabledInput
      : ["1", "true", "yes", "on"].includes(String(internalAdminEnabledInput).trim().toLowerCase());
    testCredentials.internalAdminEnabledSource = "stored";
  }

  // Suffix warning check for target test URL
  let warning: string | undefined = undefined;
  if (testCredentials.gatewayUrl) {
    const lower = testCredentials.gatewayUrl.toLowerCase();
    if (lower.endsWith("/v1") || lower.endsWith("/v1/") || lower.endsWith("/api") || lower.endsWith("/api/")) {
      warning = "Gateway URL includes a '/v1' or '/api' suffix. Set it to the base URL of the service (e.g. http://localhost:8000).";
    }
  }

  if (!testCredentials.gatewayUrl) {
    const status: GatewayTestStatus = "credentials_not_configured";
    const msg = "Gateway URL is not configured.";

    // In env_only mode, do not call updateGatewayCredentialsStatus or write to DB
    if (effective.storageMode !== "env_only") {
      await updateGatewayCredentialsStatus(status, msg);
    }

    return NextResponse.json(
      {
        status,
        ok: false,
        message: msg,
        probes: {
          health: { ok: false, status: 400, error_code: "credentials_not_configured", error_message: "Missing URL." },
          ready: { ok: false, status: 400, error_code: "credentials_not_configured", error_message: "Missing URL." },
          models: { ok: false, status: 400, error_code: "credentials_not_configured", error_message: "Missing URL." }
        },
        warning,
        storage_mode: effective.storageMode,
        storage_available: effective.storageAvailable
      } as TestResponse,
      { status: 400 }
    );
  }

  const [healthResult, readyResult, modelsResult] = await Promise.all([
    gatewayFetch("/health", {}, { credentials: testCredentials }),
    gatewayFetch("/ready", {}, { credentials: testCredentials }),
    gatewayFetch("/v1/models", {}, { credentials: testCredentials })
  ]);

  const probes: TestResponse["probes"] = {
    health: summarizeProbe(healthResult),
    ready: summarizeProbe(readyResult),
    models: summarizeProbe(modelsResult)
  };

  // Only run internal admin probe if enabled AND token is configured/provided
  if (testCredentials.internalAdminEnabled && testCredentials.internalAdminToken) {
    const internalResult = await gatewayFetch(
      "/internal/diagnostics/provider-health/summary?since_seconds=3600",
      {},
      { credentials: testCredentials, internalAdmin: true }
    );
    probes.internal_admin = summarizeProbe(internalResult);
  }

  const status = deriveFinalStatus(probes, testCredentials);
  const ok = status === "ok";
  const message =
    status === "ok"
      ? "Gateway credentials are working."
      : status === "invalid_api_key"
        ? "Gateway API key is invalid or expired."
        : status === "credentials_not_configured"
          ? "Gateway credentials are not configured."
          : status === "internal_admin_invalid"
            ? "Internal admin token is invalid."
            : status === "gateway_unreachable"
              ? "Gateway is unreachable."
              : "Gateway test failed with an unknown error.";

  // In env_only mode, do not call updateGatewayCredentialsStatus or write to DB
  if (effective.storageMode !== "env_only") {
    await updateGatewayCredentialsStatus(status, ok ? null : message);
  }

  return NextResponse.json(
    {
      status,
      ok,
      message,
      probes,
      warning,
      storage_mode: effective.storageMode,
      storage_available: effective.storageAvailable
    } as TestResponse,
    { status: ok ? 200 : 400 }
  );
}
