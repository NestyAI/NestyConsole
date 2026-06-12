export type RuntimeProviderSource = "builtin" | "runtime";

export type RuntimeSecretStatus = "env_ref" | "stored" | "none" | "missing" | "managed" | "configured" | string;

export type RuntimeCredentialSource = "env" | "secret_file" | "managed_store" | "missing" | string;

export type GatewayProviderCapability = {
  provider_id: string;
  source?: RuntimeProviderSource;
  provider_type?: string;
  display_name?: string;
  enabled?: boolean;
  supports_streaming?: boolean;
  supports_chat_completions?: boolean;
  supports_json_mode?: boolean;
  supports_tools?: boolean;
  supports_reasoning_effort?: boolean;
  default_timeout_seconds?: number;
  health_check_model?: string | null;
  secret_status?: RuntimeSecretStatus | null;
  credential_source?: RuntimeCredentialSource | null;
  api_key_env_name?: string | null;
  api_key_mode?: string | null;
};

export type RuntimeProvidersListResponse = {
  ok?: boolean;
  request_id?: string | null;
  providers?: GatewayProviderCapability[];
};

export type RuntimeProviderDetailResponse = {
  ok?: boolean;
  request_id?: string | null;
  provider_id?: string;
  provider_type?: string;
  secret_status?: RuntimeSecretStatus | null;
  provider?: GatewayProviderCapability & Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export type RuntimeProviderMutationResponse = {
  ok?: boolean;
  request_id?: string | null;
  provider_id?: string | null;
  provider_type?: string | null;
  secret_status?: RuntimeSecretStatus | null;
  changed_fields?: string[];
  warnings?: string[];
  semantics?: string;
  extra?: Record<string, unknown>;
};

export type RuntimeProviderTestResponse = {
  ok?: boolean;
  request_id?: string | null;
  provider_id?: string;
  warnings?: string[];
  extra?: {
    status?: string;
    error_code?: string;
    output_preview?: string;
    output_chars?: number;
  };
};

export type RuntimeStatusResponse = {
  ok?: boolean;
  request_id?: string | null;
  disabled_providers?: string[];
  runtime_state_updated_at?: string | null;
  provider_capabilities?: GatewayProviderCapability[];
  models?: Array<{
    model_id?: string;
    config_source?: string;
    display_name?: string | null;
  }>;
};

export type RuntimeOpenAIProviderCreateBody = {
  provider_id: string;
  display_name: string;
  base_url: string;
  chat_completions_path?: string;
  models_path?: string | null;
  api_key_mode?: "env" | "secret_file" | "none";
  api_key_env_name?: string | null;
  api_key?: string | null;
  default_timeout_seconds?: number;
  supports_streaming?: boolean;
  supports_json_mode?: boolean;
  supports_tools?: boolean;
  supports_reasoning_effort?: boolean;
  health_check_model?: string | null;
  enabled?: boolean;
  default_headers?: Record<string, string>;
};

export type RuntimeOpenAIProviderUpdateBody = Partial<
  Omit<RuntimeOpenAIProviderCreateBody, "provider_id">
>;
