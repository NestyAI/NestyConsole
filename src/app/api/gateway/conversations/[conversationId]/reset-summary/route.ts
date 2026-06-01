import { NextResponse } from "next/server";

import { resetGatewayConversationSummary } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
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

  const result = await resetGatewayConversationSummary(id);
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
