export type GatewayHealthResponse = {
  status?: string;
  service?: string;
  version?: string;
  api_version?: string;
};

export type GatewayReadyResponse = {
  status?: string;
  service?: string;
  version?: string;
  api_version?: string;
  database?: string;
};

export type GatewayModel = {
  id: string;
  object?: string;
  owned_by?: string;
  description?: string;
  config_source?: string;
  notes?: string;
};

export type GatewayModelsResponse = {
  object?: string;
  data: GatewayModel[];
};

export type GatewayErrorEnvelope = {
  error: {
    code: string;
    message: string;
    type: "gateway_error";
    details?: Record<string, unknown>;
  };
};

export type GatewayResult<T> =
  | {
      ok: true;
      status: number;
      data: T;
    }
  | {
      ok: false;
      status: number;
      error: GatewayErrorEnvelope["error"];
    };

export type GatewayErrorCode =
  | "credentials_not_configured"
  | "invalid_api_key"
  | "gateway_unreachable"
  | "internal_admin_invalid"
  | "diagnostics_disabled"
  | "model_config_not_found"
  | "invalid_model_config"
  | "conversation_not_found"
  | "message_not_found"
  | "invalid_memory_control_request"
  | "semantic_recall_unavailable"
  | "not_found"
  | "unknown_error"
  | "gateway_request_failed";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  search?: "auto" | "on" | "off";
  tools?: "auto" | "off" | string[];
  store?: boolean;
  semantic_recall?: "auto" | "on" | "off";
  conversation_id?: string;
  temperature?: number;
  max_tokens?: number;
};

export type GatewayOrchestrationMode = "off" | "single" | "reduced" | "full" | "fallback" | "unknown" | string;

export type GatewayOrchestrationMetadata = {
  requested?: string | boolean;
  used?: boolean;
  mode?: GatewayOrchestrationMode;
  decision_reason?: string | null;
  complexity_score?: number | null;
  roles?: string[];
  completed_roles?: string[];
  failed_roles?: string[];
  skipped_roles?: string[];
  internal_calls?: number;
  fallback_used?: boolean;
  fallback_reason?: string | null;
  streaming_fallback?: boolean;
  total_latency_ms?: number | null;
  role_latency_ms?: Record<string, number>;
  evidence_sources_used?: string[] | null;
  planner_metadata_used?: boolean | null;
  retrieval_metadata_used?: boolean | null;
  quality_guard_applied?: boolean | null;
  pro_context_budget_chars?: number | null;
  pro_context_truncated?: boolean | null;
};

export type GatewayOutputSafetyMetadata = {
  internal_tool_markup_detected?: boolean;
  internal_tool_markup_removed?: boolean;
};

export type GatewayProviderAttempt = {
  provider?: string;
  model?: string;
  status?: string;
  error_code?: string;
  upstream_status?: number | string | null;
  latency_ms?: number | null;
};

export type GatewayProviderError = {
  provider?: string;
  model?: string;
  error_code?: string;
  upstream_status?: number | string | null;
};

export type GatewayRuntimeFallbackMetadata = {
  attempted_providers?: GatewayProviderAttempt[];
  provider_errors?: GatewayProviderError[];
  selected_provider?: string | null;
  selected_model?: string | null;
  fallback_used?: boolean;
  fallback_reason?: string | null;
};

export type GatewayRetrievalMetadata = {
  context_used?: boolean;
  context_sources?: string[];
  context_items_count?: number;
  context_truncated?: boolean;
  context_budget_chars?: number;
  context_used_chars?: number;
  summary_used?: boolean;
  pinned_memory_used?: boolean;
  fts_used?: boolean;
  semantic_recall_used?: boolean;
  search_used?: boolean;
  tools_used?: string[];
  retrieval_decision?: string;
  retrieval_reason?: string;
};

export type GatewayPlannerMetadata = {
  search_decision?: string;
  search_planned?: boolean;
  search_used?: boolean;
  search_reason?: string;
  tool_decision?: string;
  tools_planned?: string[];
  tools_used?: string[];
  tool_reason?: string;
  clarification_needed?: boolean;
  clarification_reason?: string;
};

export type GatewayAnswerQualityMetadata = {
  checked?: boolean;
  flags?: string[];
  action?: string;
};

export type ChatCompletionMetadata = {
  model?: string;
  model_alias?: string;
  provider?: string;
  conversation_id?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  orchestration?: GatewayOrchestrationMetadata;
  output_safety?: GatewayOutputSafetyMetadata;
  attempted_providers?: GatewayProviderAttempt[];
  provider_errors?: GatewayProviderError[];
  selected_provider?: string | null;
  selected_model?: string | null;
  fallback_used?: boolean;
  fallback_reason?: string | null;
  retrieval?: GatewayRetrievalMetadata;
  planner?: GatewayPlannerMetadata;
  answer_quality?: GatewayAnswerQualityMetadata;
};

export type GatewayChatMetadata = ChatCompletionMetadata;

export type ChatCompletionResponse = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  model_alias?: string;
  provider?: string;
  conversation_id?: string;
  metadata?: Record<string, unknown>;
  orchestration?: GatewayOrchestrationMetadata;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  conversation?: {
    id?: string;
    created?: boolean;
    summary_mode?: string;
    summary_used?: boolean;
    summary_updated?: boolean;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export type ChatStreamEvent = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  model_alias?: string;
  provider?: string;
  conversation_id?: string;
  metadata?: Record<string, unknown>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  orchestration?: GatewayOrchestrationMetadata;
  choices?: Array<{
    index?: number;
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

export type GatewayConversation = {
  id?: string;
  conversation_id?: string;
  title?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  archived_at?: string | null;
  archived?: boolean;
  message_count?: number;
  summary?: string;
  summary_exists?: boolean;
  summary_updated_at?: string;
  summary_message_count?: number;
  config_source?: string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type GatewayConversationListResponse = {
  object?: string;
  data?: GatewayConversation[];
  conversations?: GatewayConversation[];
  items?: GatewayConversation[];
  total?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
};

export type GatewayConversationDetailResponse = GatewayConversation & {
  conversation?: GatewayConversation;
};

export type GatewayConversationSearchResponse = {
  object?: string;
  data?: GatewayConversation[];
  conversations?: GatewayConversation[];
  items?: GatewayConversation[];
  total?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
};

export type GatewayConversationMessage = {
  id?: string;
  message_id?: string;
  conversation_id?: string;
  role?: string;
  content?: string;
  model?: string;
  provider?: string;
  created_at?: string;
  memory_pinned?: boolean;
  memory_excluded?: boolean;
  memory_tags?: string[];
  memory_updated_at?: string;
  score?: number;
  preview?: string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type GatewayConversationMessagesResponse = {
  object?: string;
  data?: GatewayConversationMessage[];
  messages?: GatewayConversationMessage[];
  items?: GatewayConversationMessage[];
  limit?: number;
  offset?: number;
  total?: number;
  [key: string]: unknown;
};

export type GatewayConversationExportResponse = {
  conversation?: GatewayConversation;
  messages?: GatewayConversationMessage[];
  [key: string]: unknown;
};

export type GatewayConversationMemoryControlsResponse = {
  object?: string;
  data?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  [key: string]: unknown;
};

export type GatewayMessageMemoryPatchRequest = {
  memory_pinned?: boolean;
  memory_excluded?: boolean;
  memory_tags?: string[];
};

export type GatewaySemanticRecallTestRequest = {
  text: string;
  top_k?: number;
  scope?: string;
  include_archived?: boolean;
};

export type GatewaySemanticRecallTestResponse = {
  object?: string;
  data?: Array<Record<string, unknown>>;
  matches?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProviderHealthCheck = {
  id?: string;
  provider?: string;
  model?: string;
  model_alias?: string;
  role?: string;
  status?: string;
  latency_ms?: number;
  created_at?: string;
  checked_at?: string;
  error_code?: string;
  output_preview?: string;
  reliability?: number;
  score?: number;
  confidence?: string;
  sample_count?: number;
  avg_latency_ms?: number;
  stale?: boolean;
  [key: string]: unknown;
};

export type ProviderReliabilityRecord = {
  provider?: string;
  model?: string;
  model_alias?: string;
  role?: string;
  reliability_score?: number | null;
  score?: number | null;
  confidence?: string;
  sample_count?: number;
  avg_latency_ms?: number;
  stale?: boolean;
  [key: string]: unknown;
};

export type ProviderHealthSummary = {
  total_checks?: number;
  ok?: number;
  failed?: number;
  unavailable?: number;
  timeout?: number;
  skipped?: number;
  stale?: number;
  healthy?: number;
  unhealthy?: number;
  last_check_at?: string;
  [key: string]: unknown;
};

export type ProviderHealthLatestResponse = {
  object?: string;
  data?: ProviderHealthCheck[];
  summary?: ProviderHealthSummary;
  [key: string]: unknown;
};

export type ProviderHealthListResponse = {
  object?: string;
  data?: ProviderHealthCheck[];
  pagination?: {
    limit?: number;
    offset?: number;
    count?: number;
    has_more?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type DiagnosticErrorEnvelope = {
  error: {
    code?: string;
    message?: string;
    type?: string;
    details?: Record<string, unknown>;
  };
};

export type GatewayProviderChainItem = {
  provider?: string;
  model?: string;
  base_url?: string;
  timeout_seconds?: number;
  max_tokens?: number;
  temperature?: number;
  enabled?: boolean;
  label?: string;
  name?: string;
  [key: string]: unknown;
};

export type GatewayOrchestrationRoleConfig = {
  provider_chain?: GatewayProviderChainItem[];
  [key: string]: unknown;
};

export type GatewayModelConfig = {
  model_alias?: string;
  model_id?: string;
  id?: string;
  display_name?: string;
  behavior_profile?: string;
  provider_chain?: GatewayProviderChainItem[];
  orchestration_roles?: Record<string, GatewayOrchestrationRoleConfig>;
  config_source?: string;
  default_config?: Record<string, unknown> | null;
  override_config?: Record<string, unknown> | null;
  effective_config?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
  notes?: string;
  [key: string]: unknown;
};

export type GatewayModelConfigListResponse = {
  object?: string;
  data?: GatewayModelConfig[];
  model_configs?: GatewayModelConfig[];
  items?: GatewayModelConfig[];
  [key: string]: unknown;
};

export type GatewayModelConfigDetailResponse = GatewayModelConfig & {
  default_config?: Record<string, unknown> | null;
  override_config?: Record<string, unknown> | null;
  effective_config?: Record<string, unknown> | null;
};

export type GatewayModelConfigPatchRequest = {
  override: Record<string, unknown>;
  changed_by_label?: string;
};

export type GatewayModelConfigErrorEnvelope = {
  error: {
    code?: string;
    message?: string;
    type?: string;
    details?: Record<string, unknown>;
  };
};

export type GatewayApiKeyPublicInfo = {
  id: string;
  name: string;
  environment?: string;
  key_prefix?: string;
  models?: string[];
  daily_limit?: number | null;
  monthly_limit?: number | null;
  is_revoked?: boolean;
  revoked_at?: string | null;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string | null;
  usage_today?: number | null;
  usage_month?: number | null;
};

export type GatewayApiKeyListResponse = {
  items: GatewayApiKeyPublicInfo[];
  limit: number;
  offset: number;
  has_more: boolean;
};

export type GatewayApiKeyCreateRequest = {
  name: string;
  environment?: string;
  daily_limit?: number | null;
  monthly_limit?: number | null;
  models?: string[];
  key_prefix?: string;
};

export type GatewayApiKeyCreateResponse = {
  api_key: GatewayApiKeyPublicInfo;
  raw_key: string;
};

export type GatewayApiKeyUpdateRequest = {
  name?: string;
  environment?: string;
  daily_limit?: number | null;
  monthly_limit?: number | null;
  models?: string[];
};

export type GatewayApiKeyRevokeRequest = {
  reason?: string;
};

export type GatewayApiKeyRevokeResponse = {
  id: string;
  is_revoked: boolean;
  revoked_at?: string | null;
  reason?: string | null;
};

