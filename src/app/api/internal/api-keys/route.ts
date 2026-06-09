import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type {
  GatewayApiKeyCreateResponse,
  GatewayApiKeyListResponse
} from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";

export const dynamic = "force-dynamic";

function withQuery(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function GET(request: Request) {
  const access = await ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const { searchParams } = new URL(request.url);
  const environment = searchParams.get("environment") || undefined;
  const revoked = searchParams.get("revoked") || undefined;
  const q = searchParams.get("q") || undefined;
  const limit = searchParams.get("limit") || undefined;
  const offset = searchParams.get("offset") || undefined;

  const targetPath = withQuery("/internal/api-keys", {
    environment,
    revoked,
    q,
    limit,
    offset
  });

  const result = await gatewayFetch<GatewayApiKeyListResponse>(
    targetPath,
    {},
    { credentials: access.credentials, internalAdmin: true }
  );

  return gatewayResultToResponse(result);
}

export async function POST(request: Request) {
  const access = await ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key_request",
          message: "Invalid JSON body payload.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key_request",
          message: "Request body must be an object.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const obj = body as Record<string, unknown>;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key_request",
          message: "name field is required and cannot be empty.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  // Sanitize and construct clean allowlisted payload
  const payload: Record<string, unknown> = { name };

  if (typeof obj.environment === "string" && obj.environment.trim()) {
    payload.environment = obj.environment.trim().toLowerCase();
  }

  if (obj.daily_limit !== undefined && obj.daily_limit !== null) {
    const dailyLimit = Number(obj.daily_limit);
    if (!Number.isNaN(dailyLimit)) {
      payload.daily_limit = dailyLimit;
    }
  }

  if (obj.monthly_limit !== undefined && obj.monthly_limit !== null) {
    const monthlyLimit = Number(obj.monthly_limit);
    if (!Number.isNaN(monthlyLimit)) {
      payload.monthly_limit = monthlyLimit;
    }
  }

  if (Array.isArray(obj.models)) {
    payload.models = obj.models.map((m) => String(m).trim()).filter(Boolean);
  }

  if (typeof obj.key_prefix === "string" && obj.key_prefix.trim()) {
    payload.key_prefix = obj.key_prefix.trim();
  }

  const result = await gatewayFetch<GatewayApiKeyCreateResponse>(
    "/internal/api-keys",
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
