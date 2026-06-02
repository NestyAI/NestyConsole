import "server-only";

export type CredentialStorageMode = "sqlite" | "redis_kv" | "env_only";
export type ConfiguredCredentialStorageMode = CredentialStorageMode | "auto";

export type CredentialStorageModeDetails = {
  mode: CredentialStorageMode;
  reason:
    | "explicit"
    | "auto_redis_kv"
    | "vercel_env_only"
    | "disabled_by_env"
    | "default_sqlite"
    | "invalid_config";
  available: boolean;
  warning?: string;
};

export function isVercelRuntime(): boolean {
  const vercel = process.env.VERCEL;
  return vercel === "1" || vercel === "true";
}

export function isCredentialStorageDisabledByEnv(): boolean {
  const disabled = process.env.NESTY_CONSOLE_DISABLE_CREDENTIAL_STORAGE;
  if (!disabled) {
    return false;
  }
  const cleaned = disabled.trim().toLowerCase();
  return cleaned === "true" || cleaned === "1" || cleaned === "yes" || cleaned === "on";
}

export function getConfiguredCredentialStorageMode(): ConfiguredCredentialStorageMode {
  const configured = process.env.NESTY_CONSOLE_CREDENTIAL_STORAGE?.trim().toLowerCase();
  if (!configured) {
    return "auto";
  }
  if (configured === "sqlite" || configured === "redis_kv" || configured === "env_only" || configured === "auto") {
    return configured;
  }
  return "auto";
}

export function hasInvalidConfiguredCredentialStorageMode(): boolean {
  const configured = process.env.NESTY_CONSOLE_CREDENTIAL_STORAGE?.trim().toLowerCase();
  return Boolean(
    configured &&
      configured !== "auto" &&
      configured !== "sqlite" &&
      configured !== "redis_kv" &&
      configured !== "env_only"
  );
}

export function isRedisKvConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

export function getStoragePrefix(): string {
  const raw = process.env.NESTY_CONSOLE_STORAGE_PREFIX?.trim() || "nesty-console";
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 80) || "nesty-console";
}

function explicitStorageWarning(mode: CredentialStorageMode): string | undefined {
  if (mode === "redis_kv" && !isRedisKvConfigured()) {
    return "Redis KV storage is selected but UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing.";
  }
  return undefined;
}

export function getCredentialStorageModeDetails(): CredentialStorageModeDetails {
  if (isCredentialStorageDisabledByEnv()) {
    return {
      mode: "env_only",
      reason: "disabled_by_env",
      available: false,
      warning: "Credential storage is disabled by NESTY_CONSOLE_DISABLE_CREDENTIAL_STORAGE."
    };
  }

  const configured = getConfiguredCredentialStorageMode();
  const invalid = hasInvalidConfiguredCredentialStorageMode();

  if (configured !== "auto") {
    const warning = explicitStorageWarning(configured);
    return {
      mode: configured,
      reason: "explicit",
      available: configured !== "env_only" && !warning,
      warning
    };
  }

  if (isRedisKvConfigured()) {
    return {
      mode: "redis_kv",
      reason: invalid ? "invalid_config" : "auto_redis_kv",
      available: true,
      warning: invalid
        ? "Invalid NESTY_CONSOLE_CREDENTIAL_STORAGE value. Falling back to auto Redis KV selection."
        : undefined
    };
  }

  if (isVercelRuntime()) {
    return {
      mode: "env_only",
      reason: invalid ? "invalid_config" : "vercel_env_only",
      available: false,
      warning: invalid
        ? "Invalid NESTY_CONSOLE_CREDENTIAL_STORAGE value. Falling back to env-only mode on Vercel."
        : "Vercel runtime detected without Redis KV configuration; using env-only credentials."
    };
  }

  return {
    mode: "sqlite",
    reason: invalid ? "invalid_config" : "default_sqlite",
    available: true,
    warning: invalid
      ? "Invalid NESTY_CONSOLE_CREDENTIAL_STORAGE value. Falling back to local SQLite storage."
      : undefined
  };
}

export function getCredentialStorageMode(): CredentialStorageMode {
  return getCredentialStorageModeDetails().mode;
}

export function isPersistentCredentialStorageMode(mode = getCredentialStorageMode()): boolean {
  return mode === "sqlite" || mode === "redis_kv";
}
