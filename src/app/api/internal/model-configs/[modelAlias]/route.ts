import { NextResponse } from "next/server";

import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type {
  GatewayModelConfigDetailResponse,
  GatewayModelConfigPatchRequest,
  GatewayProviderChainItem
} from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    modelAlias: string;
  }>;
};

const SECRET_LIKE_PATTERN = /(key|token|secret|password|auth|credential)/i;
const SAFE_CHAIN_KEYS = new Set([
  "provider",
  "model",
  "base_url",
  "timeout_seconds",
  "max_tokens",
  "temperature",
  "enabled",
  "label",
  "name"
]);

function hasSecretLikeKey(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => hasSecretLikeKey(item));
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET_LIKE_PATTERN.test(key)) {
      return true;
    }
    if (hasSecretLikeKey(value)) {
      return true;
    }
  }
  return false;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeProviderChainItem(raw: unknown): GatewayProviderChainItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (!SAFE_CHAIN_KEYS.has(key)) {
      return null;
    }
    if (SECRET_LIKE_PATTERN.test(key)) {
      return null;
    }
  }

  const provider = cleanText(obj.provider);
  const model = cleanText(obj.model);
  if (!provider || !model) {
    return null;
  }

  const chainItem: GatewayProviderChainItem = {
    provider,
    model
  };

  const baseUrl = cleanText(obj.base_url);
  if (baseUrl) {
    chainItem.base_url = baseUrl;
  }
  const label = cleanText(obj.label);
  if (label) {
    chainItem.label = label;
  }
  const name = cleanText(obj.name);
  if (name) {
    chainItem.name = name;
  }

  if (typeof obj.enabled === "boolean") {
    chainItem.enabled = obj.enabled;
  }

  const timeout = toOptionalNumber(obj.timeout_seconds);
  if (timeout !== null) {
    chainItem.timeout_seconds = timeout;
  }
  const maxTokens = toOptionalNumber(obj.max_tokens);
  if (maxTokens !== null) {
    chainItem.max_tokens = maxTokens;
  }
  const temperature = toOptionalNumber(obj.temperature);
  if (temperature !== null) {
    chainItem.temperature = temperature;
  }
  return chainItem;
}

function normalizeProviderChain(value: unknown): GatewayProviderChainItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.map((item) => normalizeProviderChainItem(item)).filter((item): item is GatewayProviderChainItem => Boolean(item));
  if (items.length !== value.length) {
    return null;
  }
  return items;
}

function normalizeOrchestrationRoles(value: unknown): Record<string, { provider_chain: GatewayProviderChainItem[] }> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const rawRoles = value as Record<string, unknown>;
  const normalized: Record<string, { provider_chain: GatewayProviderChainItem[] }> = {};

  for (const [roleName, roleConfig] of Object.entries(rawRoles)) {
    const safeRole = cleanText(roleName);
    if (!safeRole || SECRET_LIKE_PATTERN.test(safeRole)) {
      return null;
    }
    if (!roleConfig || typeof roleConfig !== "object" || Array.isArray(roleConfig)) {
      return null;
    }
    const roleObj = roleConfig as Record<string, unknown>;
    if (!("provider_chain" in roleObj)) {
      return null;
    }
    const providerChain = normalizeProviderChain(roleObj.provider_chain);
    if (!providerChain) {
      return null;
    }
    normalized[safeRole] = {
      provider_chain: providerChain
    };
  }
  return normalized;
}

function normalizePatchBody(input: unknown): GatewayModelConfigPatchRequest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  if (hasSecretLikeKey(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const override: Record<string, unknown> = {};

  if ("provider_chain" in raw) {
    const chain = normalizeProviderChain(raw.provider_chain);
    if (!chain) {
      return null;
    }
    override.provider_chain = chain;
  }

  if ("orchestration_roles" in raw) {
    const roles = normalizeOrchestrationRoles(raw.orchestration_roles);
    if (!roles) {
      return null;
    }
    override.orchestration_roles = roles;
  }

  if ("display_name" in raw) {
    const displayName = cleanText(raw.display_name);
    if (!displayName) {
      return null;
    }
    override.display_name = displayName;
  }

  if ("notes" in raw) {
    const notes = cleanText(raw.notes);
    if (!notes) {
      return null;
    }
    override.notes = notes;
  }

  if (Object.keys(override).length === 0) {
    return null;
  }

  return {
    override,
    changed_by_label: "nesty-console"
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const access = ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const { modelAlias } = await context.params;
  const alias = modelAlias.trim();
  if (!alias) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_model_config",
          message: "Model alias is required.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await gatewayFetch<GatewayModelConfigDetailResponse>(
    `/internal/model-configs/${encodeURIComponent(alias)}`,
    {},
    { credentials: access.credentials, internalAdmin: true }
  );
  return gatewayResultToResponse(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const { modelAlias } = await context.params;
  const alias = modelAlias.trim();
  if (!alias) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_model_config",
          message: "Model alias is required.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_model_config",
          message: "Invalid model config patch body.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const payload = normalizePatchBody(body);
  if (!payload) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_model_config",
          message:
            "Only safe model config fields are allowed: provider_chain, orchestration_roles, display_name, notes.",
          type: "console_error"
        }
      },
      { status: 400 }
    );
  }

  const result = await gatewayFetch<GatewayModelConfigDetailResponse>(
    `/internal/model-configs/${encodeURIComponent(alias)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    { credentials: access.credentials, internalAdmin: true }
  );
  return gatewayResultToResponse(result);
}
