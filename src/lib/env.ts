type ConsoleEnvStatus = {
  nodeEnv: string;
  appName: string;
  gatewayUrlConfigured: boolean;
  apiKeyConfigured: boolean;
  internalAdminEnabled: boolean;
  internalAdminTokenConfigured: boolean;
  consoleClientIdConfigured: boolean;
  consoleClientSecretConfigured: boolean;
  adminUsernameConfigured: boolean;
  adminPasswordConfigured: boolean;
  sessionSecretConfigured: boolean;
  adminAuthConfigured: boolean;
};

function toBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getGatewayBaseUrl(): string | null {
  const raw = process.env.NESTY_GATEWAY_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getServerEnvStatus(): ConsoleEnvStatus {
  const adminUsername = process.env.NESTY_CONSOLE_ADMIN_USERNAME?.trim() || "admin";
  const adminPassword = process.env.NESTY_CONSOLE_ADMIN_PASSWORD?.trim() || "";
  const sessionSecret = process.env.NESTY_CONSOLE_SESSION_SECRET?.trim() || "";

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Nesty Console",
    gatewayUrlConfigured: Boolean(getGatewayBaseUrl()),
    apiKeyConfigured: Boolean(process.env.NESTY_API_KEY?.trim()),
    internalAdminEnabled: toBool(process.env.NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN, false),
    internalAdminTokenConfigured: Boolean(process.env.NESTY_INTERNAL_ADMIN_TOKEN?.trim()),
    consoleClientIdConfigured: Boolean(process.env.NESTY_CONSOLE_CLIENT_ID?.trim()),
    consoleClientSecretConfigured: Boolean(process.env.NESTY_CONSOLE_CLIENT_SECRET?.trim()),
    adminUsernameConfigured: Boolean(adminUsername),
    adminPasswordConfigured: Boolean(adminPassword),
    sessionSecretConfigured: Boolean(sessionSecret),
    adminAuthConfigured: Boolean(adminPassword && sessionSecret)
  };
}

export function isCredentialsSecretConfigured(): boolean {
  return Boolean(process.env.NESTY_CONSOLE_CREDENTIALS_SECRET?.trim());
}

export function getGatewayHeaders(internalAdmin = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };

  if (internalAdmin) {
    const enabled = toBool(process.env.NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN, false);
    const token = process.env.NESTY_INTERNAL_ADMIN_TOKEN?.trim();
    if (enabled && token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  const apiKey = process.env.NESTY_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}
