import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { GatewayApiKeyRevokeResponse } from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    apiKeyId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  // Parse optional reason body
  let reason: string | undefined = undefined;
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (body && typeof body === "object" && !Array.isArray(body)) {
        if (typeof body.reason === "string" && body.reason.trim()) {
          reason = body.reason.trim();
        }
      }
    }
  } catch {
    // Treat parsing error as no reason provided
  }

  const payload: Record<string, unknown> = {};
  if (reason) {
    payload.reason = reason;
  }

  const result = await gatewayFetch<GatewayApiKeyRevokeResponse>(
    `/internal/api-keys/${encodeURIComponent(keyId)}/revoke`,
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
