import { NextResponse } from "next/server";

import { getGatewayConversationMemoryControls } from "@/lib/gateway/client";
import { parseArchivedFilterParam } from "@/lib/gateway/query-utils";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

function parseOptionalInt(value: string | null, min: number, max: number): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.max(min, Math.min(max, parsed));
}


export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseOptionalInt(url.searchParams.get("limit"), 1, 200);
  const offset = parseOptionalInt(url.searchParams.get("offset"), 0, 10000);
  const archived = parseArchivedFilterParam(url.searchParams.get("archived"));

  const result = await getGatewayConversationMemoryControls({
    limit,
    offset,
    archived
  });
  return gatewayResultToResponse(result);
}

export function POST() {
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
