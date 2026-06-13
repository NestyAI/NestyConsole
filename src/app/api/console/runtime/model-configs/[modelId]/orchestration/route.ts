import { NextResponse } from "next/server";

import { getOrchestrationConfig, patchOrchestrationConfig } from "@/lib/orchestration-roles/server";
import { validateOrchestrationPatchBody } from "@/lib/orchestration-roles/validate";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ modelId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { modelId } = await context.params;
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await getOrchestrationConfig(modelId, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse({ ok: true, data: result.data }, result.status);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { modelId } = await context.params;
  return withRuntimeAdmin(async ({ credentials }) => {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "invalid_model_config",
            message: "Orchestration patch body must be valid JSON."
          }
        },
        { status: 400 }
      );
    }

    const validated = validateOrchestrationPatchBody(payload);
    if (!validated.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "invalid_model_config",
            message: validated.message
          }
        },
        { status: 400 }
      );
    }

    const result = await patchOrchestrationConfig(modelId, validated.body, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse({ ok: true, data: result.data }, result.status);
  });
}
