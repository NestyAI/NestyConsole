import { NextResponse } from "next/server";

import {
  deleteGatewayConversation,
  getGatewayConversation,
  patchGatewayConversation
} from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

function cleanOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function readPatchPayload(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const raw = input as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  const title = cleanOptionalText(raw.title);
  const name = cleanOptionalText(raw.name);
  if (title !== null) {
    payload.title = title;
  } else if (name !== null) {
    payload.name = name;
  }

  if (typeof raw.archived === "boolean") {
    payload.archived = raw.archived;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export async function GET(_request: Request, context: RouteContext) {
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

  const result = await getGatewayConversation(id);
  return gatewayResultToResponse(result);
}

export async function PATCH(request: Request, context: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Invalid request body.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const payload = readPatchPayload(body);
  if (!payload) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Only title/name and archived fields are allowed.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await patchGatewayConversation(id, payload);
  return gatewayResultToResponse(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  const result = await deleteGatewayConversation(id);
  return gatewayResultToResponse(result);
}
