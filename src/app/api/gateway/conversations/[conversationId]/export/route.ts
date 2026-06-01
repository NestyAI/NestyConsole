import { NextResponse } from "next/server";

import { getGatewayConversationExport } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

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

function parseMessagesOrder(value: string | null): "asc" | "desc" | undefined {
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
  const includeMetadata = parseOptionalBool(url.searchParams.get("include_metadata"));
  const messagesOrder = parseMessagesOrder(url.searchParams.get("messages_order"));

  const result = await getGatewayConversationExport(id, {
    include_metadata: includeMetadata,
    messages_order: messagesOrder
  });
  return gatewayResultToResponse(result);
}
