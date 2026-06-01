import "server-only";

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

export function getCredentialStorageMode(): "sqlite" | "env_only" {
  if (isVercelRuntime() || isCredentialStorageDisabledByEnv()) {
    return "env_only";
  }
  return "sqlite";
}

export function getCredentialStorageModeDetails(): {
  mode: "sqlite" | "env_only";
  reason: "vercel" | "disabled_by_env" | "default_sqlite";
} {
  if (isVercelRuntime()) {
    return { mode: "env_only", reason: "vercel" };
  }
  if (isCredentialStorageDisabledByEnv()) {
    return { mode: "env_only", reason: "disabled_by_env" };
  }
  return { mode: "sqlite", reason: "default_sqlite" };
}
