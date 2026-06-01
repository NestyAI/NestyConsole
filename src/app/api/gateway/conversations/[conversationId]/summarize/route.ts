import { NextResponse } from "next/server";

import { summarizeGatewayConversation } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

function normalizeBody(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

export async function POST(request: Request, context: RouteContext) {
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await summarizeGatewayConversation(id, normalizeBody(body));
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
