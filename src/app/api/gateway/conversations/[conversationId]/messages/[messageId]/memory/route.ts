import { NextResponse } from "next/server";

import { patchGatewayMessageMemory } from "@/lib/gateway/client";
import type { GatewayMessageMemoryPatchRequest } from "@/lib/gateway/types";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
    messageId: string;
  }>;
};

const ALLOWED_KEYS = new Set(["memory_pinned", "memory_excluded", "memory_tags"]);

function normalizeTags(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const tags = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 24)
      .map((tag) => tag.slice(0, 64));
    return tags;
  }

  if (typeof value === "string") {
    const tags = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24)
      .map((tag) => tag.slice(0, 64));
    return tags;
  }

  if (value === undefined || value === null) {
    return [];
  }
  return null;
}

function normalizePayload(input: unknown): GatewayMessageMemoryPatchRequest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) {
      return null;
    }
  }

  const payload: GatewayMessageMemoryPatchRequest = {};

  if ("memory_pinned" in raw) {
    if (typeof raw.memory_pinned !== "boolean") {
      return null;
    }
    payload.memory_pinned = raw.memory_pinned;
  }

  if ("memory_excluded" in raw) {
    if (typeof raw.memory_excluded !== "boolean") {
      return null;
    }
    payload.memory_excluded = raw.memory_excluded;
  }

  if ("memory_tags" in raw) {
    const tags = normalizeTags(raw.memory_tags);
    if (!tags) {
      return null;
    }
    payload.memory_tags = tags;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  return payload;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { conversationId, messageId } = await context.params;
  const conversation = conversationId.trim();
  const message = messageId.trim();
  if (!conversation || !message) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_memory_control_request",
          message: "Conversation ID and message ID are required.",
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
          code: "invalid_memory_control_request",
          message: "Invalid memory control request body.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const payload = normalizePayload(body);
  if (!payload) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_memory_control_request",
          message: "Only memory_pinned, memory_excluded, and memory_tags are allowed.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await patchGatewayMessageMemory(conversation, message, payload);
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
