import type {
  ProviderHealthCheck,
  ProviderHealthLatestResponse,
  ProviderHealthListResponse,
  ProviderHealthSummary,
  ProviderReliabilityRecord
} from "@/lib/gateway/types";

export type DiagnosticsConsoleError = {
  code: string;
  message: string;
};

type DiagnosticsRequestResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: DiagnosticsConsoleError;
    };

export type ProviderHealthSummaryView = {
  summary: ProviderHealthSummary;
  reliability: ProviderReliabilityRecord[];
  latestByTarget: ProviderHealthCheck[];
  reliabilityEnabled: boolean;
};

export type ProviderHealthLatestView = {
  data: ProviderHealthCheck[];
  summary?: ProviderHealthSummary;
};

export type ProviderHealthListView = {
  data: ProviderHealthCheck[];
  pagination?: {
    limit?: number;
    offset?: number;
    count?: number;
    has_more?: boolean;
  };
};

export type RunProviderHealthCheckInput = {
  model_alias?: string;
  include_roles?: boolean;
  message?: string;
  dry_run?: boolean;
};

function normalizeError(payload: unknown, fallback: string): DiagnosticsConsoleError {
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<DiagnosticsRequestResult<T>> {
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
      error: normalizeError(payload, "Diagnostics request failed.")
    };
  }
  return {
    ok: true,
    data: (payload || {}) as T
  };
}

export async function getProviderHealthSummary(params: {
  since_seconds?: number;
  provider?: string;
  model_alias?: string;
} = {}): Promise<DiagnosticsRequestResult<ProviderHealthSummaryView>> {
  const query = new URLSearchParams();
  if (typeof params.since_seconds === "number") {
    query.set("since_seconds", String(params.since_seconds));
  }
  if (params.provider?.trim()) {
    query.set("provider", params.provider.trim());
  }
  if (params.model_alias?.trim()) {
    query.set("model_alias", params.model_alias.trim());
  }
  const url = query.toString()
    ? `/api/internal/diagnostics/provider-health/summary?${query.toString()}`
    : "/api/internal/diagnostics/provider-health/summary";

  const result = await requestJson<{
    summary?: ProviderHealthSummary;
    reliability?: ProviderReliabilityRecord[];
    latest_by_target?: ProviderHealthCheck[];
    reliability_enabled?: boolean;
  }>(url);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    data: {
      summary: result.data.summary || {},
      reliability: Array.isArray(result.data.reliability) ? result.data.reliability : [],
      latestByTarget: Array.isArray(result.data.latest_by_target) ? result.data.latest_by_target : [],
      reliabilityEnabled: result.data.reliability_enabled !== false
    }
  };
}

export async function getLatestProviderHealth(params: {
  since_seconds?: number;
  provider?: string;
  model_alias?: string;
} = {}): Promise<DiagnosticsRequestResult<ProviderHealthLatestView>> {
  const query = new URLSearchParams();
  if (typeof params.since_seconds === "number") {
    query.set("since_seconds", String(params.since_seconds));
  }
  if (params.provider?.trim()) {
    query.set("provider", params.provider.trim());
  }
  if (params.model_alias?.trim()) {
    query.set("model_alias", params.model_alias.trim());
  }
  const url = query.toString()
    ? `/api/internal/diagnostics/provider-health/latest?${query.toString()}`
    : "/api/internal/diagnostics/provider-health/latest";
  const result = await requestJson<ProviderHealthLatestResponse>(url);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    data: {
      data: Array.isArray(result.data.data) ? result.data.data : [],
      summary: result.data.summary
    }
  };
}

export async function listProviderHealth(params: {
  since_seconds?: number;
  status?: string;
  provider?: string;
  model_alias?: string;
  limit?: number;
} = {}): Promise<DiagnosticsRequestResult<ProviderHealthListView>> {
  const query = new URLSearchParams();
  if (typeof params.since_seconds === "number") {
    query.set("since_seconds", String(params.since_seconds));
  }
  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }
  if (params.provider?.trim()) {
    query.set("provider", params.provider.trim());
  }
  if (params.model_alias?.trim()) {
    query.set("model_alias", params.model_alias.trim());
  }
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  const url = query.toString()
    ? `/api/internal/diagnostics/provider-health?${query.toString()}`
    : "/api/internal/diagnostics/provider-health";
  const result = await requestJson<ProviderHealthListResponse>(url);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    data: {
      data: Array.isArray(result.data.data) ? result.data.data : [],
      pagination: result.data.pagination
    }
  };
}

export async function runProviderHealthCheck(
  input: RunProviderHealthCheckInput = {}
): Promise<DiagnosticsRequestResult<Record<string, unknown>>> {
  return requestJson<Record<string, unknown>>("/api/internal/diagnostics/provider-health/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
}
