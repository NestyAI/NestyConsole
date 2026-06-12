import { NextResponse } from "next/server";

import { rotateBuiltinProviderApiKey } from "@/lib/builtin-providers/server";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

async function parseApiKeyBody(request: Request): Promise<{ api_key: string } | null> {
  try {
    const body = (await request.json()) as { api_key?: unknown };
    const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
    if (!apiKey) {
      return null;
    }
    return { api_key: apiKey };
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { providerId } = await context.params;
  const body = await parseApiKeyBody(request);
  if (!body) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Request body must include a non-empty api_key string.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await rotateBuiltinProviderApiKey(providerId, body, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}
