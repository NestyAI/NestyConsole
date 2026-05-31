import { NextResponse } from "next/server";

import { resolveEffectiveGatewayCredentials, updateGatewayCredentialsStatus } from "@/lib/console/credentials";
import type { GatewayTestStatus } from "@/lib/console/types";
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
  credentialsState: ReturnType<typeof resolveEffectiveGatewayCredentials>
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

export async function POST() {
  const effective = resolveEffectiveGatewayCredentials();
  if (!effective.gatewayUrl) {
    updateGatewayCredentialsStatus("credentials_not_configured", "Gateway URL is not configured.");
    return NextResponse.json(
      {
        status: "credentials_not_configured",
        ok: false,
        message: "Gateway URL is not configured.",
        probes: {
          health: { ok: false, status: 400, error_code: "credentials_not_configured", error_message: "Missing URL." },
          ready: { ok: false, status: 400, error_code: "credentials_not_configured", error_message: "Missing URL." },
          models: { ok: false, status: 400, error_code: "credentials_not_configured", error_message: "Missing URL." }
        }
      } as TestResponse,
      { status: 400 }
    );
  }

  const [healthResult, readyResult, modelsResult] = await Promise.all([
    gatewayFetch("/health", {}, { credentials: effective }),
    gatewayFetch("/ready", {}, { credentials: effective }),
    gatewayFetch("/v1/models", {}, { credentials: effective })
  ]);

  const probes: TestResponse["probes"] = {
    health: summarizeProbe(healthResult),
    ready: summarizeProbe(readyResult),
    models: summarizeProbe(modelsResult)
  };

  if (effective.internalAdminEnabled && effective.internalAdminToken) {
    const internalResult = await gatewayFetch(
      "/internal/diagnostics/provider-health/summary?since_seconds=3600",
      {},
      { credentials: effective, internalAdmin: true }
    );
    probes.internal_admin = summarizeProbe(internalResult);
  }

  const status = deriveFinalStatus(probes, effective);
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

  updateGatewayCredentialsStatus(status, ok ? null : message);
  return NextResponse.json(
    {
      status,
      ok,
      message,
      probes
    } as TestResponse,
    { status: ok ? 200 : 400 }
  );
}
