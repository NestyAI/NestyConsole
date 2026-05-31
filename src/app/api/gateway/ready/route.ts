import { NextResponse } from "next/server";

import { getGatewayReady } from "@/lib/gateway/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getGatewayReady();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: result.status });
}
