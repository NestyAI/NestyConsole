import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { ProviderHealthListResponse } from "@/lib/gateway/types";
import { ensureInternalDiagnosticsAccess } from "@/lib/diagnostics/server";

export const dynamic = "force-dynamic";

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
  const limit = parseOptionalInt(url.searchParams.get("limit"), 1, 200);
  const provider = url.searchParams.get("provider")?.trim() || undefined;
  const modelAlias = url.searchParams.get("model_alias")?.trim() || undefined;
  const status = url.searchParams.get("status")?.trim() || undefined;

  const query = new URLSearchParams();
  if (sinceSeconds !== undefined) {
    query.set("since_seconds", String(sinceSeconds));
  }
  if (limit !== undefined) {
    query.set("limit", String(limit));
  }
  if (provider) {
    query.set("provider", provider);
  }
  if (modelAlias) {
    query.set("model_alias", modelAlias);
  }
  if (status) {
    query.set("status", status);
  }

  const path = query.toString()
    ? `/internal/diagnostics/provider-health?${query.toString()}`
    : "/internal/diagnostics/provider-health";
  const result = await gatewayFetch<ProviderHealthListResponse>(
    path,
    {},
    { credentials: access.credentials, internalAdmin: true }
  );
  return gatewayResultToResponse(result);
}

export async function DELETE(request: Request) {
  const access = await ensureInternalDiagnosticsAccess();
  if (!access.ok) {
    return access.response;
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider")?.trim() || undefined;
  const modelAlias = url.searchParams.get("model_alias")?.trim() || undefined;
  const status = url.searchParams.get("status")?.trim() || undefined;
  const olderThanSeconds = parseOptionalInt(url.searchParams.get("older_than_seconds"), 1, 365 * 24 * 60 * 60);

  const query = new URLSearchParams();
  if (provider) query.set("provider", provider);
  if (modelAlias) query.set("model_alias", modelAlias);
  if (status) query.set("status", status);
  if (olderThanSeconds !== undefined) query.set("older_than_seconds", String(olderThanSeconds));

  const path = query.toString()
    ? `/internal/diagnostics/provider-health?${query.toString()}`
    : "/internal/diagnostics/provider-health";

  const result = await gatewayFetch<Record<string, unknown>>(
    path,
    { method: "DELETE" },
    { credentials: access.credentials, internalAdmin: true }
  );

  if (!result.ok) {
    return gatewayResultToResponse(result);
  }

  const deletedRaw = (result.data || {}).deleted;
  const deleted = typeof deletedRaw === "number" && Number.isFinite(deletedRaw) ? deletedRaw : 0;
  return NextResponse.json(
    {
      ok: true,
      deleted,
      filters: {
        provider: provider || null,
        model_alias: modelAlias || null,
        status: status || null,
        older_than_seconds: olderThanSeconds ?? null
      }
    },
    { status: 200 }
  );
}
