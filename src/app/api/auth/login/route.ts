import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createSessionToken, getAuthConfig, setSessionCookie } from "@/lib/auth/session";

function safeCompare(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Invalid login request.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const config = getAuthConfig();
  if (!config.password || !config.sessionSecret) {
    return NextResponse.json(
      {
        error: {
          code: "auth_not_configured",
          message: "Console authentication is not configured on server.",
          type: "console_error"
        }
      },
      { status: 503 }
    );
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const usernameOk = safeCompare(username, config.username);
  const passwordOk = safeCompare(password, config.password);

  if (!usernameOk || !passwordOk) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_credentials",
          message: "Invalid username or password.",
          type: "console_error"
        }
      },
      { status: 401 }
    );
  }

  const token = await createSessionToken(config.username);
  const response = NextResponse.json({ ok: true, username: config.username });
  setSessionCookie(response, token);
  return response;
}
