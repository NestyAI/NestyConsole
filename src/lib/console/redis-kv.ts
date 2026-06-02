import "server-only";

import type { GatewayCredentialsRecord } from "@/lib/console/types";
import { getStoragePrefix, isRedisKvConfigured as storageModeRedisConfigured } from "@/lib/console/storage-mode";

type UpstashResponse = {
  result?: unknown;
  error?: unknown;
};

const CREDENTIAL_KEY_SUFFIX = "gateway-credentials:v1";

function getRedisUrl(): string | null {
  return process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "") || null;
}

function getRedisToken(): string | null {
  return process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;
}

function getCredentialKey(): string {
  return `${getStoragePrefix()}:${CREDENTIAL_KEY_SUFFIX}`;
}

export function isRedisKvConfigured(): boolean {
  return storageModeRedisConfigured();
}

async function runRedisCommand(command: unknown[]): Promise<unknown> {
  const url = getRedisUrl();
  const token = getRedisToken();
  if (!url || !token) {
    throw new Error("redis_kv_not_configured");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command),
      cache: "no-store"
    });
  } catch {
    throw new Error("redis_kv_unreachable");
  }

  let payload: UpstashResponse | null = null;
  try {
    payload = (await response.json()) as UpstashResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error) {
    throw new Error("redis_kv_request_failed");
  }

  return payload?.result;
}

export async function getRedisCredentialRecord(): Promise<GatewayCredentialsRecord | null> {
  const result = await runRedisCommand(["GET", getCredentialKey()]);
  if (result === null || result === undefined) {
    return null;
  }

  const raw = typeof result === "string" ? result : JSON.stringify(result);
  try {
    const parsed = JSON.parse(raw) as GatewayCredentialsRecord;
    return {
      gateway_url: typeof parsed.gateway_url === "string" ? parsed.gateway_url : null,
      encrypted_gateway_api_key:
        typeof parsed.encrypted_gateway_api_key === "string" ? parsed.encrypted_gateway_api_key : null,
      encrypted_internal_admin_token:
        typeof parsed.encrypted_internal_admin_token === "string" ? parsed.encrypted_internal_admin_token : null,
      internal_admin_enabled: Boolean(parsed.internal_admin_enabled),
      last_verified_at: typeof parsed.last_verified_at === "string" ? parsed.last_verified_at : null,
      last_status: typeof parsed.last_status === "string" ? parsed.last_status : null,
      last_error: typeof parsed.last_error === "string" ? parsed.last_error : null,
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : null
    };
  } catch {
    throw new Error("redis_kv_payload_invalid");
  }
}

export async function setRedisCredentialRecord(record: GatewayCredentialsRecord): Promise<void> {
  await runRedisCommand(["SET", getCredentialKey(), JSON.stringify(record)]);
}

export async function deleteRedisCredentialRecord(): Promise<void> {
  await runRedisCommand(["DEL", getCredentialKey()]);
}

export async function testRedisKvConnection(): Promise<boolean> {
  try {
    await runRedisCommand(["PING"]);
    return true;
  } catch {
    return false;
  }
}
