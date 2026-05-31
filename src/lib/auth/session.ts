import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "nesty_console_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type ConsoleSession = {
  username: string;
  issuedAt: number;
};

export type AuthConfig = {
  username: string;
  password: string | null;
  sessionSecret: string | null;
  isProduction: boolean;
};

type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

function encoder(): TextEncoder {
  return new TextEncoder();
}

function getSubtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("crypto_subtle_unavailable");
  }
  return globalThis.crypto.subtle;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return getSubtle().importKey("raw", encoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await getSubtle().sign("HMAC", key, encoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

async function verifyPayload(payload: string, signature: string, secret: string): Promise<boolean> {
  const key = await importHmacKey(secret, ["verify"]);
  const signatureBytes = Uint8Array.from(fromBase64Url(signature));
  return getSubtle().verify("HMAC", key, signatureBytes, encoder().encode(payload));
}

export function getAuthConfig(): AuthConfig {
  const username = process.env.NESTY_CONSOLE_ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.NESTY_CONSOLE_ADMIN_PASSWORD?.trim() || null;
  const sessionSecret = process.env.NESTY_CONSOLE_SESSION_SECRET?.trim() || null;
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase() || "development";
  const isProduction = nodeEnv === "production";

  return {
    username,
    password,
    sessionSecret,
    isProduction
  };
}

export function getSessionCookieOptions(): SessionCookieOptions {
  const { isProduction } = getAuthConfig();
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

export async function createSessionToken(username: string): Promise<string> {
  const { sessionSecret } = getAuthConfig();
  if (!sessionSecret) {
    throw new Error("session_secret_missing");
  }

  const payload: ConsoleSession = {
    username,
    issuedAt: Math.floor(Date.now() / 1000)
  };

  const payloadPart = toBase64Url(encoder().encode(JSON.stringify(payload)));
  const signature = await signPayload(payloadPart, sessionSecret);
  return `${payloadPart}.${signature}`;
}

export async function parseSessionToken(token: string | null | undefined): Promise<ConsoleSession | null> {
  if (!token) {
    return null;
  }

  const { sessionSecret } = getAuthConfig();
  if (!sessionSecret) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadPart, signaturePart] = parts;
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const validSignature = await verifyPayload(payloadPart, signaturePart, sessionSecret);
  if (!validSignature) {
    return null;
  }

  try {
    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(payloadJson) as Partial<ConsoleSession>;
    if (!payload.username || typeof payload.username !== "string") {
      return null;
    }
    if (!payload.issuedAt || typeof payload.issuedAt !== "number") {
      return null;
    }
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.issuedAt;
    if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) {
      return null;
    }
    return {
      username: payload.username,
      issuedAt: payload.issuedAt
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest): Promise<ConsoleSession | null> {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
  return parseSessionToken(raw);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });
}
