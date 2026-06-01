export type CredentialSource = "stored" | "env" | "missing";

export type GatewayCredentialsRecord = {
  gateway_url: string | null;
  encrypted_gateway_api_key: string | null;
  encrypted_internal_admin_token: string | null;
  internal_admin_enabled: boolean;
  last_verified_at: string | null;
  last_status: string | null;
  last_error: string | null;
  updated_at: string | null;
};

export type EffectiveGatewayCredentials = {
  gatewayUrl: string | null;
  gatewayApiKey: string | null;
  internalAdminToken: string | null;
  internalAdminEnabled: boolean;
  gatewayUrlSource: CredentialSource;
  gatewayApiKeySource: CredentialSource;
  internalAdminTokenSource: CredentialSource;
  internalAdminEnabledSource: "stored" | "env";
  storageMode: "sqlite" | "env_only";
  storageAvailable: boolean;
  storageWarning?: string;
  metadata: {
    hasStoredConfig: boolean;
    decryptError: boolean;
    lastVerifiedAt: string | null;
    lastStatus: string | null;
    lastError: string | null;
    updatedAt: string | null;
  };
};

export type GatewayCredentialsView = {
  gateway_url: string | null;
  gateway_url_source: CredentialSource;
  api_key_configured: boolean;
  api_key_source: CredentialSource;
  internal_admin_token_configured: boolean;
  internal_admin_token_source: CredentialSource;
  internal_admin_enabled: boolean;
  internal_admin_enabled_source: "stored" | "env";
  last_verified_at: string | null;
  last_status: string | null;
  last_error: string | null;
  updated_at: string | null;
  storage_mode: "sqlite" | "env_only";
  storage_available: boolean;
  storage_warning?: string;
};

export type GatewayCredentialsUpdateInput = {
  gateway_url?: string | null;
  gateway_api_key?: string | null;
  internal_admin_token?: string | null;
  internal_admin_enabled?: boolean;
};

export type GatewayTestStatus =
  | "ok"
  | "credentials_not_configured"
  | "invalid_api_key"
  | "gateway_unreachable"
  | "internal_admin_invalid"
  | "unknown_error";
