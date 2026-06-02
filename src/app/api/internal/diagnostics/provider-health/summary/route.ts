import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { ProviderHealthSummary, ProviderReliabilityRecord } from "@/lib/gateway/types";
import { ensureInternalDiagnosticsAccess } from "@/lib/diagnostics/server";

export const dynamic = "force-dynamic";

type ProviderHealthSummaryResponse = {
  summary?: ProviderHealthSummary;
  reliability?: ProviderReliabilityRecord[];
  latest_by_target?: Record<string, unknown>[];
  reliability_enabled?: boolean;
  [key: string]: unknown;
};

function parseOptionalInt(value: string | null, min: number, max: number): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.max(min, Math.min(max, parsed));
}

export async function GET(request: Request) {
  const access = await ensureInternalDiagnosticsAccess();
  if (!access.ok) {
    return access.response;
  }

  const url = new URL(request.url);
  const sinceSeconds = parseOptionalInt(url.searchParams.get("since_seconds"), 1, 7 * 24 * 60 * 60);
  const provider = url.searchParams.get("provider")?.trim() || undefined;
  const modelAlias = url.searchParams.get("model_alias")?.trim() || undefined;

  const query = new URLSearchParams();
  if (sinceSeconds !== undefined) {
    query.set("since_seconds", String(sinceSeconds));
  }
  if (provider) {
    query.set("provider", provider);
  }
  if (modelAlias) {
    query.set("model_alias", modelAlias);
  }

  const path = query.toString()
    ? `/internal/diagnostics/provider-health/summary?${query.toString()}`
    : "/internal/diagnostics/provider-health/summary";
  const result = await gatewayFetch<ProviderHealthSummaryResponse>(
    path,
    {},
    { credentials: access.credentials, internalAdmin: true }
  );
  return gatewayResultToResponse(result);
}
