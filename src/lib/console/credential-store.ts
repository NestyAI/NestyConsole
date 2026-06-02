import "server-only";

import { getConsoleDb } from "@/lib/console/db";
import { decryptSecret, encryptSecret, isCredentialsSecretConfigured } from "@/lib/console/crypto";
import {
  getCredentialStorageModeDetails,
  type CredentialStorageModeDetails
} from "@/lib/console/storage-mode";
import {
  deleteRedisCredentialRecord,
  getRedisCredentialRecord,
  setRedisCredentialRecord,
  testRedisKvConnection
} from "@/lib/console/redis-kv";
import type {
  EffectiveGatewayCredentials,
  GatewayCredentialsRecord,
  GatewayCredentialsUpdateInput,
  GatewayCredentialsView,
  GatewayTestStatus
} from "@/lib/console/types";

let sqliteAvailableCache: boolean | null = null;
let sqliteWarningCache: string | null = null;

export class CredentialsManagerError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeUrl(raw: string | null | undefined): string | null {
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

export function cleanOptionalText(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  return value || null;
}

function storageUnavailableMessage(details: CredentialStorageModeDetails, extra?: string): string {
  if (extra) {
    return extra;
  }
  if (details.mode === "redis_kv") {
    return "Redis KV storage is selected but UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, or NESTY_CONSOLE_CREDENTIALS_SECRET is missing.";
  }
  if (details.mode === "env_only") {
    return "Credential storage is disabled in env-only mode.";
  }
  return details.warning || "Credential storage is unavailable.";
}

export async function checkCredentialStorageAvailable(): Promise<{ available: boolean; warning?: string }> {
  const details = getCredentialStorageModeDetails();
  if (details.mode === "env_only") {
    return { available: false, warning: details.warning || storageUnavailableMessage(details) };
  }

  if (details.mode === "redis_kv") {
    if (!details.available) {
      return { available: false, warning: details.warning || storageUnavailableMessage(details) };
    }
    if (!isCredentialsSecretConfigured()) {
      return { available: false, warning: storageUnavailableMessage(details) };
    }
    return { available: true, warning: details.warning };
  }

  if (sqliteAvailableCache !== null) {
    return { available: sqliteAvailableCache, warning: sqliteWarningCache || details.warning };
  }

  try {
    getConsoleDb();
    sqliteAvailableCache = true;
    sqliteWarningCache = null;
    return { available: true, warning: details.warning };
  } catch (err) {
    sqliteAvailableCache = false;
    const msg = err instanceof Error ? err.message : String(err);
    sqliteWarningCache = `Database unavailable: ${msg}`;
    console.warn(`[Storage Warning] Database initialization failed. Reason: ${msg}`);
    return {
      available: false,
      warning: details.warning ? `${details.warning} | ${sqliteWarningCache}` : sqliteWarningCache
    };
  }
}

export const checkStorageAvailable = checkCredentialStorageAvailable;

function getStoredGatewayCredentialsFromSqlite(): GatewayCredentialsRecord | null {
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

export async function getStoredGatewayCredentials(): Promise<GatewayCredentialsRecord | null> {
  const details = getCredentialStorageModeDetails();
  const { available } = await checkCredentialStorageAvailable();
  if (!available) {
    return null;
  }

  try {
    if (details.mode === "redis_kv") {
      return await getRedisCredentialRecord();
    }
    if (details.mode === "sqlite") {
      return getStoredGatewayCredentialsFromSqlite();
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Storage Warning] Failed to read stored credentials: ${msg}`);
    return null;
  }
}

function applyUrlWarning(gatewayUrl: string | null, warning?: string): string | undefined {
  if (!gatewayUrl) {
    return warning;
  }
  const lower = gatewayUrl.toLowerCase();
  if (lower.endsWith("/v1") || lower.endsWith("/v1/") || lower.endsWith("/api") || lower.endsWith("/api/")) {
    const urlWarning = "Gateway URL includes a '/v1' or '/api' suffix. Set it to the base URL of the service (e.g. http://localhost:8000).";
    return warning ? `${warning} | ${urlWarning}` : urlWarning;
  }
  return warning;
}

export async function resolveEffectiveGatewayCredentials(): Promise<EffectiveGatewayCredentials> {
  const details = getCredentialStorageModeDetails();
  const { available, warning } = await checkCredentialStorageAvailable();
  const stored = available ? await getStoredGatewayCredentials() : null;

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
    storageMode: details.mode,
    storageAvailable: available,
    storageWarning: applyUrlWarning(gatewayUrl, warning),
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

export async function getGatewayCredentialsView(): Promise<GatewayCredentialsView> {
  const effective = await resolveEffectiveGatewayCredentials();
  const source =
    effective.gatewayUrlSource === "stored" ||
    effective.gatewayApiKeySource === "stored" ||
    effective.internalAdminTokenSource === "stored" ||
    effective.internalAdminEnabledSource === "stored"
      ? "stored"
      : effective.gatewayUrlSource === "env" ||
          effective.gatewayApiKeySource === "env" ||
          effective.internalAdminTokenSource === "env" ||
          effective.internalAdminEnabledSource === "env"
        ? "env"
        : "missing";
  return {
    source,
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
    updated_at: effective.metadata.updatedAt,
    storage_mode: effective.storageMode,
    storage_available: effective.storageAvailable,
    storage_warning: effective.storageWarning
  };
}

function buildSavedRecord(
  input: GatewayCredentialsUpdateInput,
  existing: GatewayCredentialsRecord | null
): GatewayCredentialsRecord {
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

  return {
    gateway_url: gatewayUrl,
    encrypted_gateway_api_key: encryptedGatewayApiKey,
    encrypted_internal_admin_token: encryptedInternalAdminToken,
    internal_admin_enabled:
      typeof input.internal_admin_enabled === "boolean"
        ? input.internal_admin_enabled
        : existing
          ? existing.internal_admin_enabled
          : toBool(process.env.NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN, false),
    last_verified_at: existing?.last_verified_at || null,
    last_status: existing?.last_status || null,
    last_error: existing?.last_error || null,
    updated_at: now
  };
}

function saveGatewayCredentialsToSqlite(record: GatewayCredentialsRecord): void {
  const db = getConsoleDb();
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
    record.gateway_url,
    record.encrypted_gateway_api_key,
    record.encrypted_internal_admin_token,
    record.internal_admin_enabled ? 1 : 0,
    record.last_verified_at,
    record.last_status,
    record.last_error,
    record.updated_at || nowIso()
  );
}

export async function saveGatewayCredentials(input: GatewayCredentialsUpdateInput): Promise<GatewayCredentialsView> {
  const details = getCredentialStorageModeDetails();
  const { available, warning } = await checkCredentialStorageAvailable();
  if (!available) {
    throw new CredentialsManagerError(
      "credential_storage_unavailable",
      warning || storageUnavailableMessage(details),
      409
    );
  }

  const existing = await getStoredGatewayCredentials();
  const record = buildSavedRecord(input, existing);

  try {
    if (details.mode === "redis_kv") {
      await setRedisCredentialRecord(record);
    } else if (details.mode === "sqlite") {
      saveGatewayCredentialsToSqlite(record);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new CredentialsManagerError(
      "credential_storage_unavailable",
      details.mode === "redis_kv" ? "Failed to write encrypted credentials to Redis KV." : `Failed to write to database: ${msg}`,
      details.mode === "redis_kv" ? 409 : 500
    );
  }

  return getGatewayCredentialsView();
}

export async function clearStoredGatewayCredentials(): Promise<GatewayCredentialsView> {
  const details = getCredentialStorageModeDetails();
  const { available, warning } = await checkCredentialStorageAvailable();
  if (!available) {
    throw new CredentialsManagerError(
      "credential_storage_unavailable",
      warning || storageUnavailableMessage(details),
      409
    );
  }

  try {
    if (details.mode === "redis_kv") {
      await deleteRedisCredentialRecord();
    } else if (details.mode === "sqlite") {
      const db = getConsoleDb();
      db.prepare("DELETE FROM gateway_credentials WHERE id = 1").run();
    }
  } catch {
    throw new CredentialsManagerError("credential_storage_unavailable", "Failed to clear stored credentials.", 409);
  }

  return getGatewayCredentialsView();
}

export async function updateGatewayCredentialsStatus(status: GatewayTestStatus, errorMessage: string | null): Promise<void> {
  const details = getCredentialStorageModeDetails();
  const { available } = await checkCredentialStorageAvailable();
  if (!available) {
    return;
  }

  try {
    const existing = await getStoredGatewayCredentials();
    if (!existing) {
      return;
    }
    const record: GatewayCredentialsRecord = {
      gateway_url: existing?.gateway_url || null,
      encrypted_gateway_api_key: existing?.encrypted_gateway_api_key || null,
      encrypted_internal_admin_token: existing?.encrypted_internal_admin_token || null,
      internal_admin_enabled: existing?.internal_admin_enabled || false,
      last_verified_at: nowIso(),
      last_status: status,
      last_error: errorMessage,
      updated_at: nowIso()
    };

    if (details.mode === "redis_kv") {
      await setRedisCredentialRecord(record);
    } else if (details.mode === "sqlite") {
      saveGatewayCredentialsToSqlite(record);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Storage Warning] Failed to update test status: ${msg}`);
  }
}

export async function checkRedisCredentialStorageConnection(): Promise<boolean> {
  return testRedisKvConnection();
}
