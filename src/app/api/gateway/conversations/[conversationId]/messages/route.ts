import { NextResponse } from "next/server";

import { getGatewayConversationMessages } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

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

function parseOrder(value: string | null): "asc" | "desc" | undefined {
  if (!value) {
    return undefined;
  }
  const lowered = value.trim().toLowerCase();
  if (lowered === "asc" || lowered === "desc") {
    return lowered;
  }
  return undefined;
}

export async function GET(request: Request, context: RouteContext) {
  const { conversationId } = await context.params;
  const id = conversationId.trim();
  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Conversation ID is required.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const limit = parseOptionalInt(url.searchParams.get("limit"), 1, 200);
  const offset = parseOptionalInt(url.searchParams.get("offset"), 0, 10000);
  const order = parseOrder(url.searchParams.get("order"));

  const result = await getGatewayConversationMessages(id, {
    limit,
    offset,
    order
  });

  return gatewayResultToResponse(result);
}
