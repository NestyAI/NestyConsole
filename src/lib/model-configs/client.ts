import type {
  GatewayModelConfig,
  GatewayModelConfigDetailResponse,
  GatewayModelConfigListResponse,
  GatewayProviderChainItem
} from "@/lib/gateway/types";

export type ModelConfigConsoleError = {
  code: string;
  message: string;
};

type RequestResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ModelConfigConsoleError;
    };

export type ModelConfigListItem = {
  modelAlias: string;
  displayName: string;
  configSource: string;
  providerChain: GatewayProviderChainItem[];
  raw: GatewayModelConfig;
};

export type ModelConfigDetailView = {
  modelAlias: string;
  configSource: string;
  defaultConfig: Record<string, unknown> | null;
  overrideConfig: Record<string, unknown> | null;
  effectiveConfig: Record<string, unknown> | null;
  providerChain: GatewayProviderChainItem[];
  orchestrationRoles: Record<string, unknown>;
  displayName?: string;
  notes?: string;
  raw: GatewayModelConfigDetailResponse;
};

export type ModelConfigPatchInput = {
  provider_chain?: GatewayProviderChainItem[];
  orchestration_roles?: Record<string, unknown>;
  display_name?: string;
  notes?: string;
};

const SECRET_LIKE_PATTERN = /(key|token|secret|password|auth|credential)/i;

function normalizeError(payload: unknown, fallback: string): ModelConfigConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<RequestResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store"
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "gateway_unreachable",
        message: "Gateway is unavailable or unreachable from Nesty Console."
      }
    };
  }

  const payload = await safeJson(response);
  if (!response.ok) {
    return {
      ok: false,
      error: normalizeError(payload, "Model config request failed.")
    };
  }

  return {
    ok: true,
    data: (payload || {}) as T
  };
}

function toModelAlias(raw: GatewayModelConfig): string {
  return String(raw.model_alias || raw.model_id || raw.id || "").trim();
}

function toProviderChain(raw: GatewayModelConfig): GatewayProviderChainItem[] {
  const source =
    raw.provider_chain ||
    ((raw.effective_config as Record<string, unknown> | null)?.provider_chain as GatewayProviderChainItem[] | undefined);
  return Array.isArray(source) ? source : [];
}

function toDisplayName(raw: GatewayModelConfig): string {
  return String(raw.display_name || toModelAlias(raw) || "Untitled model alias").trim();
}

function toConfigSource(raw: GatewayModelConfig): string {
  return String(raw.config_source || "unknown").trim() || "unknown";
}

function extractList(payload: GatewayModelConfigListResponse): GatewayModelConfig[] {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.model_configs)) {
    return payload.model_configs;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_LIKE_PATTERN.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = redactUnknown(entry);
    }
  }
  return output;
}

export function redactSensitiveModelConfig(value: unknown): unknown {
  return redactUnknown(value);
}

export async function listModelConfigs(): Promise<RequestResult<ModelConfigListItem[]>> {
  const result = await requestJson<GatewayModelConfigListResponse>("/api/internal/model-configs");
  if (!result.ok) {
    return result;
  }
  const items = extractList(result.data)
    .map((raw) => {
      const modelAlias = toModelAlias(raw);
      if (!modelAlias) {
        return null;
      }
      return {
        modelAlias,
        displayName: toDisplayName(raw),
        configSource: toConfigSource(raw),
        providerChain: toProviderChain(raw),
        raw
      } satisfies ModelConfigListItem;
    })
    .filter((row): row is ModelConfigListItem => Boolean(row));
  return {
    ok: true,
    data: items
  };
}

export async function getModelConfig(modelAlias: string): Promise<RequestResult<ModelConfigDetailView>> {
  const alias = modelAlias.trim();
  if (!alias) {
    return {
      ok: false,
      error: {
        code: "invalid_model_config",
        message: "Model alias is required."
      }
    };
  }
  const result = await requestJson<GatewayModelConfigDetailResponse>(
    `/api/internal/model-configs/${encodeURIComponent(alias)}`
  );
  if (!result.ok) {
    return result;
  }

  const raw = result.data;
  const aliasResolved = String(raw.model_alias || raw.model_id || raw.id || alias).trim() || alias;
  const effectiveConfig =
    (raw.effective_config as Record<string, unknown> | null) ||
    ((raw.default_config as Record<string, unknown> | null) ?? null);
  const providerChain = Array.isArray(raw.provider_chain)
    ? raw.provider_chain
    : Array.isArray(effectiveConfig?.provider_chain)
      ? (effectiveConfig.provider_chain as GatewayProviderChainItem[])
      : [];
  const orchestrationRoles = (
    (effectiveConfig?.orchestration_roles as Record<string, unknown> | undefined) ||
    (raw.orchestration_roles as Record<string, unknown> | undefined) ||
    {}
  );

  return {
    ok: true,
    data: {
      modelAlias: aliasResolved,
      configSource: String(raw.config_source || "unknown"),
      defaultConfig: (raw.default_config as Record<string, unknown> | null) || null,
      overrideConfig: (raw.override_config as Record<string, unknown> | null) || null,
      effectiveConfig,
      providerChain,
      orchestrationRoles,
      displayName: typeof raw.display_name === "string" ? raw.display_name : undefined,
      notes: typeof raw.notes === "string" ? raw.notes : undefined,
      raw
    }
  };
}

export async function updateModelConfig(
  modelAlias: string,
  patch: ModelConfigPatchInput
): Promise<RequestResult<GatewayModelConfigDetailResponse>> {
  const alias = modelAlias.trim();
  if (!alias) {
    return {
      ok: false,
      error: {
        code: "invalid_model_config",
        message: "Model alias is required."
      }
    };
  }
  return requestJson<GatewayModelConfigDetailResponse>(
    `/api/internal/model-configs/${encodeURIComponent(alias)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patch)
    }
  );
}

export async function resetModelConfig(modelAlias: string): Promise<RequestResult<GatewayModelConfigDetailResponse>> {
  const alias = modelAlias.trim();
  if (!alias) {
    return {
      ok: false,
      error: {
        code: "invalid_model_config",
        message: "Model alias is required."
      }
    };
  }
  return requestJson<GatewayModelConfigDetailResponse>(
    `/api/internal/model-configs/${encodeURIComponent(alias)}/reset`,
    {
      method: "POST"
    }
  );
}
