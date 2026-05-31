import "server-only";

import { getConsoleDb } from "@/lib/console/db";
import { decryptSecret, encryptSecret, isCredentialsSecretConfigured } from "@/lib/console/crypto";
import type {
  EffectiveGatewayCredentials,
  GatewayCredentialsRecord,
  GatewayCredentialsUpdateInput,
  GatewayCredentialsView,
  GatewayTestStatus
} from "@/lib/console/types";

function toBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function cleanOptionalText(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  return value || null;
}

export class CredentialsManagerError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getStoredGatewayCredentials(): GatewayCredentialsRecord | null {
  const db = getConsoleDb();
  const row = db
    .prepare(
      `SELECT gateway_url,
              encrypted_gateway_api_key,
              encrypted_internal_admin_token,
              internal_admin_enabled,
              last_verified_at,
              last_status,
              last_error,
              updated_at
       FROM gateway_credentials
       WHERE id = 1`
    )
    .get() as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    gateway_url: row.gateway_url ? String(row.gateway_url) : null,
    encrypted_gateway_api_key: row.encrypted_gateway_api_key ? String(row.encrypted_gateway_api_key) : null,
    encrypted_internal_admin_token: row.encrypted_internal_admin_token
      ? String(row.encrypted_internal_admin_token)
      : null,
    internal_admin_enabled: Boolean(row.internal_admin_enabled),
    last_verified_at: row.last_verified_at ? String(row.last_verified_at) : null,
    last_status: row.last_status ? String(row.last_status) : null,
    last_error: row.last_error ? String(row.last_error) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null
  };
}

export function resolveEffectiveGatewayCredentials(): EffectiveGatewayCredentials {
  const stored = getStoredGatewayCredentials();
  const envGatewayUrl = normalizeUrl(process.env.NESTY_GATEWAY_URL);
  const envApiKey = cleanOptionalText(process.env.NESTY_API_KEY);
  const envInternalToken = cleanOptionalText(process.env.NESTY_INTERNAL_ADMIN_TOKEN);
  const envInternalEnabled = toBool(process.env.NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN, false);

  let decryptedApiKey: string | null = null;
  let decryptedInternalToken: string | null = null;
  let decryptError = false;

  if (stored?.encrypted_gateway_api_key) {
    try {
      decryptedApiKey = cleanOptionalText(decryptSecret(stored.encrypted_gateway_api_key));
    } catch {
      decryptError = true;
    }
  }
  if (stored?.encrypted_internal_admin_token) {
    try {
      decryptedInternalToken = cleanOptionalText(decryptSecret(stored.encrypted_internal_admin_token));
    } catch {
      decryptError = true;
    }
  }

  const storedGatewayUrl = normalizeUrl(stored?.gateway_url || null);
  const gatewayUrl = storedGatewayUrl || envGatewayUrl;
  const gatewayUrlSource = storedGatewayUrl ? "stored" : envGatewayUrl ? "env" : "missing";

  const gatewayApiKey = decryptedApiKey || envApiKey;
  const gatewayApiKeySource = decryptedApiKey ? "stored" : envApiKey ? "env" : "missing";

  const internalAdminToken = decryptedInternalToken || envInternalToken;
  const internalAdminTokenSource = decryptedInternalToken ? "stored" : envInternalToken ? "env" : "missing";

  const internalAdminEnabled = stored ? Boolean(stored.internal_admin_enabled) : envInternalEnabled;
  const internalAdminEnabledSource = stored ? "stored" : "env";

  return {
    gatewayUrl,
    gatewayApiKey,
    internalAdminToken,
    internalAdminEnabled,
    gatewayUrlSource,
    gatewayApiKeySource,
    internalAdminTokenSource,
    internalAdminEnabledSource,
    metadata: {
      hasStoredConfig: Boolean(stored),
      decryptError,
      lastVerifiedAt: stored?.last_verified_at || null,
      lastStatus: stored?.last_status || null,
      lastError: stored?.last_error || null,
      updatedAt: stored?.updated_at || null
    }
  };
}

export function getGatewayCredentialsView(): GatewayCredentialsView {
  const effective = resolveEffectiveGatewayCredentials();
  return {
    gateway_url: effective.gatewayUrl,
    gateway_url_source: effective.gatewayUrlSource,
    api_key_configured: Boolean(effective.gatewayApiKey),
    api_key_source: effective.gatewayApiKeySource,
    internal_admin_token_configured: Boolean(effective.internalAdminToken),
    internal_admin_token_source: effective.internalAdminTokenSource,
    internal_admin_enabled: effective.internalAdminEnabled,
    internal_admin_enabled_source: effective.internalAdminEnabledSource,
    last_verified_at: effective.metadata.lastVerifiedAt,
    last_status: effective.metadata.lastStatus,
    last_error: effective.metadata.lastError,
    updated_at: effective.metadata.updatedAt
  };
}

export function saveGatewayCredentials(input: GatewayCredentialsUpdateInput): GatewayCredentialsView {
  const existing = getStoredGatewayCredentials();
  const now = nowIso();

  const gatewayUrlInput = cleanOptionalText(input.gateway_url);
  const gatewayUrl =
    gatewayUrlInput !== null ? normalizeUrl(gatewayUrlInput) : normalizeUrl(existing?.gateway_url || null);
  if (gatewayUrlInput !== null && !gatewayUrl) {
    throw new CredentialsManagerError("invalid_gateway_url", "Gateway URL must be a valid http/https URL.", 400);
  }

  let encryptedGatewayApiKey = existing?.encrypted_gateway_api_key || null;
  const gatewayApiKeyInput = cleanOptionalText(input.gateway_api_key);
  if (gatewayApiKeyInput !== null) {
    if (!isCredentialsSecretConfigured()) {
      throw new CredentialsManagerError(
        "credentials_secret_missing",
        "NESTY_CONSOLE_CREDENTIALS_SECRET is required before saving secrets.",
        400
      );
    }
    encryptedGatewayApiKey = encryptSecret(gatewayApiKeyInput);
  }

  let encryptedInternalAdminToken = existing?.encrypted_internal_admin_token || null;
  const internalAdminTokenInput = cleanOptionalText(input.internal_admin_token);
  if (internalAdminTokenInput !== null) {
    if (!isCredentialsSecretConfigured()) {
      throw new CredentialsManagerError(
        "credentials_secret_missing",
        "NESTY_CONSOLE_CREDENTIALS_SECRET is required before saving secrets.",
        400
      );
    }
    encryptedInternalAdminToken = encryptSecret(internalAdminTokenInput);
  }

  const internalAdminEnabled =
    typeof input.internal_admin_enabled === "boolean"
      ? input.internal_admin_enabled
      : existing
        ? existing.internal_admin_enabled
        : toBool(process.env.NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN, false);

  const db = getConsoleDb();
  db.prepare(
    `INSERT INTO gateway_credentials
       (id, gateway_url, encrypted_gateway_api_key, encrypted_internal_admin_token, internal_admin_enabled, updated_at)
     VALUES
       (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       gateway_url = excluded.gateway_url,
       encrypted_gateway_api_key = excluded.encrypted_gateway_api_key,
       encrypted_internal_admin_token = excluded.encrypted_internal_admin_token,
       internal_admin_enabled = excluded.internal_admin_enabled,
       updated_at = excluded.updated_at`
  ).run(gatewayUrl, encryptedGatewayApiKey, encryptedInternalAdminToken, internalAdminEnabled ? 1 : 0, now);

  return getGatewayCredentialsView();
}

export function updateGatewayCredentialsStatus(status: GatewayTestStatus, errorMessage: string | null): void {
  const db = getConsoleDb();
  const existing = getStoredGatewayCredentials();
  const now = nowIso();

  db.prepare(
    `INSERT INTO gateway_credentials
       (id, gateway_url, encrypted_gateway_api_key, encrypted_internal_admin_token, internal_admin_enabled, last_verified_at, last_status, last_error, updated_at)
     VALUES
       (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       gateway_url = excluded.gateway_url,
       encrypted_gateway_api_key = excluded.encrypted_gateway_api_key,
       encrypted_internal_admin_token = excluded.encrypted_internal_admin_token,
       internal_admin_enabled = excluded.internal_admin_enabled,
       last_verified_at = excluded.last_verified_at,
       last_status = excluded.last_status,
       last_error = excluded.last_error,
       updated_at = excluded.updated_at`
  ).run(
    existing?.gateway_url || null,
    existing?.encrypted_gateway_api_key || null,
    existing?.encrypted_internal_admin_token || null,
    existing?.internal_admin_enabled ? 1 : 0,
    now,
    status,
    errorMessage,
    now
  );
}
