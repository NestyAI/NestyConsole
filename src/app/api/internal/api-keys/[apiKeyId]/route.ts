import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { GatewayApiKeyPublicInfo } from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    apiKeyId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const { apiKeyId } = await context.params;
  const keyId = apiKeyId.trim();
  if (!keyId) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key_request",
          message: "API key ID is required.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await gatewayFetch<GatewayApiKeyPublicInfo>(
    `/internal/api-keys/${encodeURIComponent(keyId)}`,
    {},
    { credentials: access.credentials, internalAdmin: true }
  );

  return gatewayResultToResponse(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const { apiKeyId } = await context.params;
  const keyId = apiKeyId.trim();
  if (!keyId) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key_request",
          message: "API key ID is required.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
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

  // Constrain body elements to safe update parameters only
  const payload: Record<string, unknown> = {};

  if (typeof obj.name === "string") {
    const name = obj.name.trim();
    if (!name) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_api_key_request",
            message: "name cannot be empty.",
            type: "console_error"
          }
        },
        { status: 400 }
      );
    }
    payload.name = name;
  }

  if (typeof obj.environment === "string") {
    payload.environment = obj.environment.trim().toLowerCase();
  }

  if (obj.daily_limit !== undefined) {
    if (obj.daily_limit === null) {
      payload.daily_limit = null;
    } else {
      const dailyLimit = Number(obj.daily_limit);
      if (!Number.isNaN(dailyLimit)) {
        payload.daily_limit = dailyLimit;
      }
    }
  }

  if (obj.monthly_limit !== undefined) {
    if (obj.monthly_limit === null) {
      payload.monthly_limit = null;
    } else {
      const monthlyLimit = Number(obj.monthly_limit);
      if (!Number.isNaN(monthlyLimit)) {
        payload.monthly_limit = monthlyLimit;
      }
    }
  }

  if (obj.models !== undefined) {
    if (obj.models === null) {
      payload.models = null;
    } else if (Array.isArray(obj.models)) {
      payload.models = obj.models.map((m) => String(m).trim()).filter(Boolean);
    }
  }

  // If no fields to update, reject the request
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key_request",
          message: "No valid editable fields provided for update.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await gatewayFetch<GatewayApiKeyPublicInfo>(
    `/internal/api-keys/${encodeURIComponent(keyId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    { credentials: access.credentials, internalAdmin: true }
  );

  return gatewayResultToResponse(result);
}
