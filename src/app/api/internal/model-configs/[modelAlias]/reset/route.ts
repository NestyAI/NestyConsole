import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { GatewayModelConfigDetailResponse } from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    modelAlias: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const access = ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const { modelAlias } = await context.params;
  const alias = modelAlias.trim();
  if (!alias) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_model_config",
          message: "Model alias is required.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await gatewayFetch<GatewayModelConfigDetailResponse>(
    `/internal/model-configs/${encodeURIComponent(alias)}/reset`,
    {
      method: "POST"
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
