import { NextResponse } from "next/server";

import { getGatewayHealth } from "@/lib/gateway/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getGatewayHealth();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: result.status });
}
