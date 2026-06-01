import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import { ensureInternalDiagnosticsAccess } from "@/lib/diagnostics/server";

export const dynamic = "force-dynamic";

type ProviderHealthCheckRequest = {
  model_alias?: string;
  include_roles?: boolean;
  message?: string;
  dry_run?: boolean;
};

type ProviderHealthCheckResponse = {
  ok?: boolean;
  result?: Record<string, unknown>;
  [key: string]: unknown;
};

function cleanOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeBody(input: unknown): ProviderHealthCheckRequest {
  if (!input || typeof input !== "object") {
    return {};
  }
  const raw = input as Record<string, unknown>;
  const modelAlias = cleanOptionalText(raw.model_alias);
  const message = cleanOptionalText(raw.message);
  const includeRoles = typeof raw.include_roles === "boolean" ? raw.include_roles : undefined;
  const dryRun = typeof raw.dry_run === "boolean" ? raw.dry_run : undefined;

  const payload: ProviderHealthCheckRequest = {};
  if (modelAlias) {
    payload.model_alias = modelAlias;
  }
  if (message) {
    payload.message = message;
  }
  if (includeRoles !== undefined) {
    payload.include_roles = includeRoles;
  }
  if (dryRun !== undefined) {
    payload.dry_run = dryRun;
  }
  return payload;
}

export async function POST(request: Request) {
  const access = ensureInternalDiagnosticsAccess();
  if (!access.ok) {
    return access.response;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = normalizeBody(body);
  const result = await gatewayFetch<ProviderHealthCheckResponse>(
    "/internal/diagnostics/provider-health/check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    { credentials: access.credentials, internalAdmin: true }
  );
  return gatewayResultToResponse(result);
}

export function GET() {
  return NextResponse.json(
    {
      error: {
        code: "method_not_allowed",
        message: "Method not allowed.",
        type: "console_error"
      }
    },
    { status: 405 }
  );
}
