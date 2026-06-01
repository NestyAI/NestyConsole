import { NextResponse } from "next/server";

import { runGatewaySemanticRecallTest } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { GatewaySemanticRecallTestRequest, GatewaySemanticRecallTestResponse } from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";
import { isSecretLikeKey, redactSecrets } from "@/lib/security/redact";

export const dynamic = "force-dynamic";

const SAFE_BODY_KEYS = new Set(["text", "top_k", "scope", "include_archived"]);
const VECTOR_LIKE_KEY_PATTERN = /(embedding|vector)/i;

function sanitizeUnknown(value: unknown): unknown {
  const redacted = redactSecrets(value);
  if (Array.isArray(value)) {
    return redacted;
  }
  if (!redacted || typeof redacted !== "object") {
    return redacted;
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(redacted as Record<string, unknown>)) {
    if (isSecretLikeKey(key) || VECTOR_LIKE_KEY_PATTERN.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = sanitizeUnknown(entry);
    }
  }
  return output;
}

function normalizeBody(input: unknown): GatewaySemanticRecallTestRequest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!SAFE_BODY_KEYS.has(key)) {
      return null;
    }
  }

  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) {
    return null;
  }

  const payload: GatewaySemanticRecallTestRequest = {
    text: text.slice(0, 12000)
  };

  if (raw.top_k !== undefined) {
    const parsed = Number(raw.top_k);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    payload.top_k = Math.max(1, Math.min(50, Math.round(parsed)));
  }

  if (raw.scope !== undefined) {
    if (typeof raw.scope !== "string") {
      return null;
    }
    const scope = raw.scope.trim();
    if (scope) {
      payload.scope = scope.slice(0, 120);
    }
  }

  if (raw.include_archived !== undefined) {
    if (typeof raw.include_archived !== "boolean") {
      return null;
    }
    payload.include_archived = raw.include_archived;
  }

  return payload;
}

export async function POST(request: Request) {
  const access = ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Invalid recall test request body.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const payload = normalizeBody(body);
  if (!payload) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Only text, top_k, scope, and include_archived are allowed.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await runGatewaySemanticRecallTest(payload, access.credentials);
  if (!result.ok) {
    return gatewayResultToResponse(result);
  }

  const safeResponse = sanitizeUnknown(result.data) as GatewaySemanticRecallTestResponse;
  return NextResponse.json(safeResponse, { status: result.status });
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
