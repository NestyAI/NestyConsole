import { NextResponse } from "next/server";

import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import { searchGatewayConversations } from "@/lib/gateway/client";

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

function parseOptionalBool(value: string | null): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const lowered = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(lowered)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(lowered)) {
    return false;
  }
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const limit = parseOptionalInt(url.searchParams.get("limit"), 1, 200);
  const offset = parseOptionalInt(url.searchParams.get("offset"), 0, 10000);
  const scope = url.searchParams.get("scope")?.trim() || undefined;
  const archived = parseOptionalBool(url.searchParams.get("archived"));

  const result = await searchGatewayConversations({
    q,
    limit,
    offset,
    scope,
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
