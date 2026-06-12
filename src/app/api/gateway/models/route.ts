import { NextResponse } from "next/server";

import { getGatewayModels } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getGatewayModels();
  if (!result.ok) {
    return gatewayResultToResponse(result);
  }
  return NextResponse.json(result.data, { status: result.status });
}
