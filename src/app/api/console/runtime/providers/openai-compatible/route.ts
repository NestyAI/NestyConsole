import { NextResponse } from "next/server";

import { createRuntimeOpenAIProvider } from "@/lib/runtime-providers/server";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withRuntimeAdmin(async ({ credentials }) => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "invalid_request_body",
            message: "Request body must be valid JSON.",
            type: "console_error"
          }
        },
        { status: 400 }
      );
    }

    const result = await createRuntimeOpenAIProvider(body as Parameters<typeof createRuntimeOpenAIProvider>[0], credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}
