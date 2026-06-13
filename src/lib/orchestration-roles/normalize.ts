import {
  sanitizeChainItems,
  toEditableItem,
  type EditableChainItem
} from "@/lib/model-configs/chain-utils";
import type { GatewayProviderChainItem } from "@/lib/gateway/types";

import {
  OPTIONAL_ORCHESTRATION_ROLE_IDS,
  REQUIRED_ORCHESTRATION_ROLE_IDS,
  SUPPORTED_ORCHESTRATION_ROLE_IDS,
  type EditableOrchestrationRole,
  type OrchestrationConfigView,
  type OrchestrationRoleConfig,
  type OrchestrationRoleId,
  type OrchestrationRoleTemplate
} from "./types";

const SECRET_LIKE_KEY = /(prompt|message|content|reasoning|answer|secret|token|password|api[_-]?key|authorization|credential|env)/i;
const SECRET_LIKE_VALUE = /^(sk-|gsk_|xoxb-|Bearer\s)/i;

const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;
const MAX_TOKENS_MIN = 128;
const MAX_TOKENS_MAX = 8192;
const TIMEOUT_SECONDS_MIN = 1;
const TIMEOUT_SECONDS_MAX = 120;

const ALLOWLIST_VIEW_KEYS = new Set([
  "model_id",
  "orchestration_enabled",
  "orchestration_mode",
  "supported_role_ids",
  "required_role_ids",
  "default_role_config",
  "effective_roles",
  "override_roles",
  "validation_warnings",
  "request_id"
]);

const ALLOWLIST_ROLE_KEYS = new Set(["enabled", "provider_chain", "temperature", "max_tokens", "timeout_seconds"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function sanitizeProviderChain(value: unknown): GatewayProviderChainItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const editable: EditableChainItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    editable.push(toEditableItem(item as GatewayProviderChainItem));
  }
  return sanitizeChainItems(editable) || [];
}

function sanitizeRoleConfig(value: unknown): OrchestrationRoleConfig {
  if (!isRecord(value)) {
    return {};
  }
  const output: OrchestrationRoleConfig = {};
  for (const key of ALLOWLIST_ROLE_KEYS) {
    if (!(key in value)) {
      continue;
    }
    if (SECRET_LIKE_KEY.test(key)) {
      continue;
    }
    if (key === "provider_chain") {
      output.provider_chain = sanitizeProviderChain(value[key]);
      continue;
    }
    if (key === "enabled") {
      output.enabled = value[key] !== false;
      continue;
    }
    const numeric = parseNumber(value[key]);
    if (numeric !== undefined) {
      if (key === "temperature") {
        output.temperature = numeric;
      } else if (key === "max_tokens") {
        output.max_tokens = Math.trunc(numeric);
      } else if (key === "timeout_seconds") {
        output.timeout_seconds = numeric;
      }
    }
  }
  return output;
}

function sanitizeRolesMap(value: unknown): Record<string, OrchestrationRoleConfig> {
  if (!isRecord(value)) {
    return {};
  }
  const output: Record<string, OrchestrationRoleConfig> = {};
  for (const roleId of SUPPORTED_ORCHESTRATION_ROLE_IDS) {
    if (!(roleId in value)) {
      continue;
    }
    output[roleId] = sanitizeRoleConfig(value[roleId]);
  }
  return output;
}

function sanitizeRoleTemplate(value: unknown): OrchestrationRoleTemplate {
  if (!isRecord(value)) {
    return {};
  }
  const output: OrchestrationRoleTemplate = {};
  if ("enabled" in value) {
    output.enabled = value.enabled !== false;
  }
  if ("provider_chain" in value) {
    output.provider_chain = sanitizeProviderChain(value.provider_chain);
  }
  if ("temperature" in value && value.temperature !== null) {
    const numeric = parseNumber(value.temperature);
    if (numeric !== undefined) {
      output.temperature = numeric;
    }
  } else if (value.temperature === null) {
    output.temperature = null;
  }
  if ("max_tokens" in value) {
    const numeric = parseNumber(value.max_tokens);
    if (numeric !== undefined) {
      output.max_tokens = Math.trunc(numeric);
    }
  }
  if ("timeout_seconds" in value && value.timeout_seconds !== null) {
    const numeric = parseNumber(value.timeout_seconds);
    if (numeric !== undefined) {
      output.timeout_seconds = numeric;
    }
  } else if (value.timeout_seconds === null) {
    output.timeout_seconds = null;
  }
  return output;
}

function sanitizeStringList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

export function containsSecretLikePayload(value: unknown): boolean {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length >= 24 && SECRET_LIKE_VALUE.test(trimmed)) {
      return true;
    }
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikePayload(item));
  }
  if (!isRecord(value)) {
    return false;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_LIKE_KEY.test(key)) {
      return true;
    }
    if (containsSecretLikePayload(nested)) {
      return true;
    }
  }
  return false;
}

export function parseOrchestrationView(payload: unknown): OrchestrationConfigView | null {
  if (!isRecord(payload)) {
    return null;
  }

  const source = isRecord(payload.data) ? payload.data : payload;
  const modelId = String(source.model_id || "").trim();
  if (!modelId) {
    return null;
  }

  for (const key of Object.keys(source)) {
    if (!ALLOWLIST_VIEW_KEYS.has(key) && !["ok", "config_area", "changed_fields"].includes(key)) {
      continue;
    }
  }

  const defaultRoleConfigRaw = isRecord(source.default_role_config) ? source.default_role_config : {};
  const defaultRoleConfig: Record<string, OrchestrationRoleTemplate> = {};
  for (const roleId of SUPPORTED_ORCHESTRATION_ROLE_IDS) {
    if (roleId in defaultRoleConfigRaw) {
      defaultRoleConfig[roleId] = sanitizeRoleTemplate(defaultRoleConfigRaw[roleId]);
    }
  }

  const validationWarnings = Array.isArray(source.validation_warnings)
    ? source.validation_warnings.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    model_id: modelId,
    orchestration_enabled: Boolean(source.orchestration_enabled),
    orchestration_mode: String(source.orchestration_mode || "single"),
    supported_role_ids: sanitizeStringList(source.supported_role_ids, SUPPORTED_ORCHESTRATION_ROLE_IDS),
    required_role_ids: sanitizeStringList(source.required_role_ids, REQUIRED_ORCHESTRATION_ROLE_IDS),
    default_role_config: defaultRoleConfig,
    effective_roles: sanitizeRolesMap(source.effective_roles),
    override_roles: sanitizeRolesMap(source.override_roles),
    validation_warnings: validationWarnings,
    request_id: source.request_id ? String(source.request_id) : undefined
  };
}

export function roleConfigToEditable(role: OrchestrationRoleConfig | undefined): EditableOrchestrationRole {
  const chain = Array.isArray(role?.provider_chain) ? role.provider_chain : [];
  return {
    enabled: role?.enabled !== false,
    providerChain: chain.map((item) => toEditableItem(item)),
    temperature: role?.temperature !== undefined ? String(role.temperature) : "",
    max_tokens: role?.max_tokens !== undefined ? String(role.max_tokens) : "",
    timeout_seconds: role?.timeout_seconds !== undefined ? String(role.timeout_seconds) : ""
  };
}

export function editableRoleToConfig(role: EditableOrchestrationRole, roleId: OrchestrationRoleId): OrchestrationRoleConfig | null {
  const provider_chain = sanitizeChainItems(role.providerChain);
  if (role.providerChain.length > 0 && !provider_chain) {
    return null;
  }

  const config: OrchestrationRoleConfig = {
    enabled: REQUIRED_ORCHESTRATION_ROLE_IDS.includes(roleId as (typeof REQUIRED_ORCHESTRATION_ROLE_IDS)[number])
      ? true
      : role.enabled
  };

  if (provider_chain && provider_chain.length > 0) {
    config.provider_chain = provider_chain;
  } else if (role.providerChain.length === 0) {
    config.provider_chain = [];
  }

  const temperature = role.temperature.trim() ? Number(role.temperature.trim()) : undefined;
  if (temperature !== undefined) {
    if (!Number.isFinite(temperature)) {
      return null;
    }
    config.temperature = temperature;
  }

  const maxTokens = role.max_tokens.trim() ? Number(role.max_tokens.trim()) : undefined;
  if (maxTokens !== undefined) {
    if (!Number.isFinite(maxTokens)) {
      return null;
    }
    config.max_tokens = Math.trunc(maxTokens);
  }

  const timeoutSeconds = role.timeout_seconds.trim() ? Number(role.timeout_seconds.trim()) : undefined;
  if (timeoutSeconds !== undefined) {
    if (!Number.isFinite(timeoutSeconds)) {
      return null;
    }
    config.timeout_seconds = timeoutSeconds;
  }

  return config;
}

export function validateRoleConfigBounds(roleId: string, config: OrchestrationRoleConfig): string | null {
  if (config.temperature !== undefined) {
    if (config.temperature < TEMPERATURE_MIN || config.temperature > TEMPERATURE_MAX) {
      return `Role '${roleId}' temperature must be between ${TEMPERATURE_MIN} and ${TEMPERATURE_MAX}.`;
    }
  }
  if (config.max_tokens !== undefined) {
    if (config.max_tokens < MAX_TOKENS_MIN || config.max_tokens > MAX_TOKENS_MAX) {
      return `Role '${roleId}' max_tokens must be between ${MAX_TOKENS_MIN} and ${MAX_TOKENS_MAX}.`;
    }
  }
  if (config.timeout_seconds !== undefined) {
    if (config.timeout_seconds < TIMEOUT_SECONDS_MIN || config.timeout_seconds > TIMEOUT_SECONDS_MAX) {
      return `Role '${roleId}' timeout_seconds must be between ${TIMEOUT_SECONDS_MIN} and ${TIMEOUT_SECONDS_MAX}.`;
    }
  }
  return null;
}

export function buildRolesPatch(
  baseline: Record<string, OrchestrationRoleConfig>,
  draft: Record<string, EditableOrchestrationRole>
): { roles: Record<string, OrchestrationRoleConfig> } | { error: string } {
  const roles: Record<string, OrchestrationRoleConfig> = {};

  for (const roleId of SUPPORTED_ORCHESTRATION_ROLE_IDS) {
    const next = editableRoleToConfig(draft[roleId], roleId);
    if (!next) {
      return { error: `Role '${roleId}' has invalid numeric or provider chain values.` };
    }
    const boundsError = validateRoleConfigBounds(roleId, next);
    if (boundsError) {
      return { error: boundsError };
    }
    if (containsSecretLikePayload(next)) {
      return { error: `Role '${roleId}' patch contains secret-like values.` };
    }

    const previous = baseline[roleId] || {};
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      roles[roleId] = next;
    }
  }

  if (Object.keys(roles).length === 0) {
    return { error: "No orchestration role changes to save." };
  }

  return { roles };
}

export function isOptionalRole(roleId: string): boolean {
  return (OPTIONAL_ORCHESTRATION_ROLE_IDS as readonly string[]).includes(roleId);
}

export function isRequiredRole(roleId: string): boolean {
  return (REQUIRED_ORCHESTRATION_ROLE_IDS as readonly string[]).includes(roleId);
}

export function draftFromEffectiveRoles(view: OrchestrationConfigView): Record<string, EditableOrchestrationRole> {
  const draft: Record<string, EditableOrchestrationRole> = {};
  for (const roleId of SUPPORTED_ORCHESTRATION_ROLE_IDS) {
    draft[roleId] = roleConfigToEditable(view.effective_roles[roleId]);
  }
  return draft;
}

export function draftFromDefaultTemplate(view: OrchestrationConfigView, roleId: OrchestrationRoleId): EditableOrchestrationRole {
  const template = view.default_role_config[roleId] || {};
  return roleConfigToEditable({
    enabled: isRequiredRole(roleId) ? true : template.enabled !== false,
    provider_chain: template.provider_chain || [],
    temperature: template.temperature ?? undefined,
    max_tokens: template.max_tokens,
    timeout_seconds: template.timeout_seconds ?? undefined
  });
}
