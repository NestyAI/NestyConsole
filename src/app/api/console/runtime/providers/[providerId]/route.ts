import { NextResponse } from "next/server";

import { deleteRuntimeProvider, getRuntimeProvider, updateRuntimeProvider } from "@/lib/runtime-providers/server";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { providerId } = await context.params;
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await getRuntimeProvider(providerId, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { providerId } = await context.params;
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

    const result = await updateRuntimeProvider(
      providerId,
      body as Parameters<typeof updateRuntimeProvider>[1],
      credentials
    );
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { providerId } = await context.params;
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await deleteRuntimeProvider(providerId, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}
