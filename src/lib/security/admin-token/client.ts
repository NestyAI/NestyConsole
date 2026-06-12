import type { AdminTokenRotateResponse, AdminTokenStatusResponse } from "@/lib/security/admin-token/types";

type ConsoleErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
    details?: Record<string, unknown>;
  };
};

async function parseJson<T>(response: Response): Promise<T | ConsoleErrorEnvelope> {
  try {
    return (await response.json()) as T;
  } catch {
    return {};
  }
}

function throwFromEnvelope(payload: ConsoleErrorEnvelope, status: number): never {
  const error = payload.error || {};
  const err = new Error(error.message || "Admin token request failed.");
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).code = error.code;
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).details = error.details;
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).status = status;
  throw err;
}

async function securityFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });
  const payload = await parseJson<T | ConsoleErrorEnvelope>(response);
  if (!response.ok) {
    throwFromEnvelope(payload as ConsoleErrorEnvelope, response.status);
  }
  return payload as T;
}

export async function fetchAdminTokenStatus(): Promise<AdminTokenStatusResponse> {
  return securityFetch<AdminTokenStatusResponse>("/api/console/security/admin-token/status");
}

export async function rotateAdminToken(): Promise<AdminTokenRotateResponse> {
  return securityFetch<AdminTokenRotateResponse>("/api/console/security/admin-token/rotate", {
    method: "POST",
    body: JSON.stringify({})
  });
}
