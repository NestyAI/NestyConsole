import type { EditableChainItem } from "@/lib/model-configs/chain-utils";
import type { GatewayProviderChainItem } from "@/lib/gateway/types";

export const SUPPORTED_ORCHESTRATION_ROLE_IDS = ["planner", "researcher", "critic", "finalizer"] as const;
export const REQUIRED_ORCHESTRATION_ROLE_IDS = ["planner", "finalizer"] as const;
export const OPTIONAL_ORCHESTRATION_ROLE_IDS = ["researcher", "critic"] as const;

export type OrchestrationRoleId = (typeof SUPPORTED_ORCHESTRATION_ROLE_IDS)[number];

export type OrchestrationRoleConfig = {
  enabled?: boolean;
  provider_chain?: GatewayProviderChainItem[];
  temperature?: number;
  max_tokens?: number;
  timeout_seconds?: number;
};

export type OrchestrationRoleTemplate = {
  enabled?: boolean;
  provider_chain?: GatewayProviderChainItem[];
  temperature?: number | null;
  max_tokens?: number;
  timeout_seconds?: number | null;
};

export type OrchestrationConfigView = {
  model_id: string;
  orchestration_enabled: boolean;
  orchestration_mode: string;
  supported_role_ids: string[];
  required_role_ids: string[];
  default_role_config: Record<string, OrchestrationRoleTemplate>;
  effective_roles: Record<string, OrchestrationRoleConfig>;
  override_roles: Record<string, OrchestrationRoleConfig>;
  validation_warnings: string[];
  request_id?: string;
};

export type OrchestrationPatchBody = {
  roles: Record<string, OrchestrationRoleConfig>;
  changed_by_label?: string;
};

export type OrchestrationConsoleError = {
  code: string;
  message: string;
};

export type OrchestrationFetchResult =
  | { ok: true; data: OrchestrationConfigView }
  | { ok: false; error: OrchestrationConsoleError };

export type EditableOrchestrationRole = {
  enabled: boolean;
  providerChain: EditableChainItem[];
  temperature: string;
  max_tokens: string;
  timeout_seconds: string;
};

export type { EditableChainItem };
