import { NextResponse } from "next/server";

import { resolveEffectiveGatewayCredentials } from "@/lib/console/credentials";
import type { ChatCompletionResponse, ChatRequest } from "@/lib/gateway/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConsoleErrorCode =
  | "credentials_not_configured"
  | "invalid_gateway_api_key"
  | "gateway_unreachable"
  | "unknown_error"
  | "invalid_request_body";

function consoleError(code: ConsoleErrorCode, message: string, status = 400) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        type: "console_error"
      }
    },
    { status }
  );
}

function normalizeChatRequest(raw: unknown): ChatRequest | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const input = raw as Record<string, unknown>;
  const model = String(input.model || "").trim();
  const messages = Array.isArray(input.messages) ? input.messages : [];
  if (!model || messages.length === 0) {
    return null;
  }

  const cleanedMessages = messages
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const role = String(row.role || "").trim();
      const content = String(row.content || "");
      if (!role || !content.trim()) {
        return null;
      }
      return {
        role,
        content
      };
    })
    .filter(Boolean) as ChatRequest["messages"];

  if (cleanedMessages.length === 0) {
    return null;
  }

  const payload: ChatRequest = {
    model,
    messages: cleanedMessages
  };

  if (typeof input.stream === "boolean") payload.stream = input.stream;
  if (typeof input.search === "string") payload.search = input.search as ChatRequest["search"];
  if (typeof input.tools === "string" || Array.isArray(input.tools)) payload.tools = input.tools as ChatRequest["tools"];
  if (typeof input.store === "boolean") payload.store = input.store;
  if (typeof input.semantic_recall === "string") payload.semantic_recall = input.semantic_recall as ChatRequest["semantic_recall"];
  if (typeof input.conversation_id === "string") payload.conversation_id = input.conversation_id.trim();
  if (typeof input.temperature === "number") payload.temperature = input.temperature;
  if (typeof input.max_tokens === "number") payload.max_tokens = input.max_tokens;

  return payload;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapGatewayError(status: number, payload: unknown) {
  const envelope = payload as { error?: { code?: string; message?: string } } | null;
  const code = String(envelope?.error?.code || "").toLowerCase();

  if (code === "invalid_api_key" || code === "missing_api_key" || status === 401 || status === 403) {
    return consoleError(
      "invalid_gateway_api_key",
      "Gateway API key is invalid or expired. Update it in Settings -> Gateway Credentials.",
      401
    );
  }

  if (code === "credentials_not_configured") {
    return consoleError("credentials_not_configured", "Gateway credentials are not configured.", 400);
  }

  return consoleError("unknown_error", "Gateway chat request failed.", status >= 400 ? status : 500);
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return consoleError("invalid_request_body", "Invalid chat request payload.", 400);
  }

  const payload = normalizeChatRequest(rawBody);
  if (!payload) {
    return consoleError("invalid_request_body", "Chat request must include model and at least one valid message.", 400);
  }

  const effective = resolveEffectiveGatewayCredentials();
  if (!effective.gatewayUrl || !effective.gatewayApiKey) {
    return consoleError("credentials_not_configured", "Gateway credentials are not configured.", 400);
  }

  const url = new URL("/v1/chat/completions", `${effective.gatewayUrl}/`);
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${effective.gatewayApiKey}`
  });

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: request.signal
    });
  } catch {
    return consoleError("gateway_unreachable", "Gateway is unavailable or unreachable from Nesty Console.", 503);
  }

  if (!upstream.ok) {
    const upstreamPayload = await safeJson(upstream);
    return mapGatewayError(upstream.status, upstreamPayload);
  }

  const isStream = Boolean(payload.stream);
  const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();

  if (isStream && contentType.includes("text/event-stream")) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  }

  const data = (await safeJson(upstream)) as ChatCompletionResponse | null;
  if (!data) {
    return consoleError("unknown_error", "Gateway returned an invalid chat response.", 502);
  }
  return NextResponse.json(data, { status: 200 });
}
