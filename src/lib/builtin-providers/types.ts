export type BuiltinProviderType = "openai_compatible" | "native";

export type BuiltinCredentialSource = "env" | "secret_file" | "managed_store" | "missing";

export type BuiltinSecretStatus =
  | "configured"
  | "missing"
  | "env_ref"
  | "stored"
  | "managed"
  | "none"
  | string;

export type BuiltinProviderCapability = {
  provider_id: string;
  display_name: string;
  source: "builtin";
  provider_type?: BuiltinProviderType | string;
  supports_streaming?: boolean;
  supports_chat_completions?: boolean;
  supports_tools?: boolean;
  supports_json_mode?: boolean;
  supports_reasoning_effort?: boolean;
  credential_source?: BuiltinCredentialSource | string;
  secret_status?: BuiltinSecretStatus;
  api_key_env_name?: string | null;
  api_base_env_name?: string | null;
  health_check_model?: string | null;
  default_timeout_seconds?: number;
  enabled?: boolean;
};

export type BuiltinProvidersListResponse = {
  ok: boolean;
  request_id?: string | null;
  providers: BuiltinProviderCapability[];
};

export type BuiltinProviderDetailResponse = {
  ok: boolean;
  request_id?: string | null;
  provider_id?: string;
  provider?: BuiltinProviderCapability;
};

export type BuiltinCredentialRecord = {
  provider_id: string;
  credential_name: string;
  source?: string;
  secret_status?: BuiltinSecretStatus;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  last_rotated_at?: string | null;
};

export type BuiltinCredentialsListResponse = {
  ok: boolean;
  request_id?: string | null;
  provider_id?: string;
  provider?: BuiltinProviderCapability;
  credentials: BuiltinCredentialRecord[];
};

export type BuiltinCredentialMutationResponse = {
  ok: boolean;
  request_id?: string | null;
  provider_id?: string;
  changed_fields?: string[];
  credential?: {
    provider_id?: string;
    credential_name?: string;
    source?: string;
    secret_status?: BuiltinSecretStatus;
    credential_source?: string;
  };
  deleted?: boolean;
};

export type BuiltinProviderTestResponse = {
  ok: boolean;
  request_id?: string | null;
  provider_id?: string;
  test_result?: {
    ok?: boolean;
    status?: string;
    error_code?: string;
    secret_status?: string;
    output_preview?: string;
    output_chars?: number;
    warnings?: string[];
  };
};

export type BuiltinApiKeyBody = {
  api_key: string;
};

export type BuiltinApiKeyTestBody = {
  model?: string;
  message?: string;
};

export const BUILTIN_PROVIDER_IDS = [
  "groq",
  "openrouter",
  "nvidia",
  "ollama_cloud",
  "deepseek",
  "openai",
  "mistral",
  "z_ai",
  "google_gemini",
  "anthropic_claude"
] as const;
