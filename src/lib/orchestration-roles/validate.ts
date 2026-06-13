import type { GatewayProviderChainItem } from "@/lib/gateway/types";

import {
  buildRolesPatch,
  containsSecretLikePayload,
  validateRoleConfigBounds
} from "./normalize";
import type { OrchestrationPatchBody, OrchestrationRoleConfig } from "./types";
import { SUPPORTED_ORCHESTRATION_ROLE_IDS } from "./types";

export type OrchestrationPatchValidationResult =
  | { ok: true; body: OrchestrationPatchBody }
  | { ok: false; message: string };

export function validateOrchestrationPatchBody(payload: unknown): OrchestrationPatchValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Orchestration patch body must be a JSON object." };
  }

  const body = payload as Record<string, unknown>;
  if (!body.roles || typeof body.roles !== "object" || Array.isArray(body.roles)) {
    return { ok: false, message: "Orchestration patch must include a roles object." };
  }

  if (containsSecretLikePayload(body)) {
    return { ok: false, message: "Orchestration patch contains disallowed secret-like fields." };
  }

  const rolesRaw = body.roles as Record<string, unknown>;
  const roles: Record<string, OrchestrationRoleConfig> = {};

  for (const [roleId, roleValue] of Object.entries(rolesRaw)) {
    if (!(SUPPORTED_ORCHESTRATION_ROLE_IDS as readonly string[]).includes(roleId)) {
      return { ok: false, message: `Unsupported orchestration role '${roleId}'.` };
    }
    if (!roleValue || typeof roleValue !== "object" || Array.isArray(roleValue)) {
      return { ok: false, message: `Role '${roleId}' must be an object.` };
    }

    const roleCfg = roleValue as Record<string, unknown>;
    const normalized: OrchestrationRoleConfig = {};

    if ("enabled" in roleCfg) {
      if (roleId === "planner" || roleId === "finalizer") {
        normalized.enabled = true;
      } else {
        normalized.enabled = roleCfg.enabled !== false;
      }
    }

    if ("provider_chain" in roleCfg) {
      if (!Array.isArray(roleCfg.provider_chain)) {
        return { ok: false, message: `Role '${roleId}' provider_chain must be an array.` };
      }
      normalized.provider_chain = [];
      for (const item of roleCfg.provider_chain) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return { ok: false, message: `Role '${roleId}' provider_chain entries must be objects.` };
        }
        const entry = item as Record<string, unknown>;
        const provider = String(entry.provider || "").trim();
        const model = String(entry.model || "").trim();
        if (!provider || !model) {
          return { ok: false, message: `Role '${roleId}' provider_chain entries require provider and model.` };
        }
        const chainItem: GatewayProviderChainItem = {
          provider,
          model,
          enabled: entry.enabled !== false
        };
        const timeout = Number(entry.timeout_seconds);
        if (Number.isFinite(timeout)) {
          chainItem.timeout_seconds = timeout;
        }
        const maxTokens = Number(entry.max_tokens);
        if (Number.isFinite(maxTokens)) {
          chainItem.max_tokens = Math.trunc(maxTokens);
        }
        const temperature = Number(entry.temperature);
        if (Number.isFinite(temperature)) {
          chainItem.temperature = temperature;
        }
        normalized.provider_chain!.push(chainItem);
      }
    }

    if ("temperature" in roleCfg && roleCfg.temperature !== undefined && roleCfg.temperature !== null) {
      const temperature = Number(roleCfg.temperature);
      if (!Number.isFinite(temperature)) {
        return { ok: false, message: `Role '${roleId}' temperature must be numeric.` };
      }
      normalized.temperature = temperature;
    }

    if ("max_tokens" in roleCfg && roleCfg.max_tokens !== undefined && roleCfg.max_tokens !== null) {
      const maxTokens = Number(roleCfg.max_tokens);
      if (!Number.isFinite(maxTokens)) {
        return { ok: false, message: `Role '${roleId}' max_tokens must be numeric.` };
      }
      normalized.max_tokens = Math.trunc(maxTokens);
    }

    if ("timeout_seconds" in roleCfg && roleCfg.timeout_seconds !== undefined && roleCfg.timeout_seconds !== null) {
      const timeoutSeconds = Number(roleCfg.timeout_seconds);
      if (!Number.isFinite(timeoutSeconds)) {
        return { ok: false, message: `Role '${roleId}' timeout_seconds must be numeric.` };
      }
      normalized.timeout_seconds = timeoutSeconds;
    }

    const boundsError = validateRoleConfigBounds(roleId, normalized);
    if (boundsError) {
      return { ok: false, message: boundsError };
    }

    roles[roleId] = normalized;
  }

  if (Object.keys(roles).length === 0) {
    return { ok: false, message: "Orchestration patch must include at least one role entry." };
  }

  return {
    ok: true,
    body: {
      roles,
      changed_by_label: "nesty-console"
    }
  };
}

export { buildRolesPatch, containsSecretLikePayload };
