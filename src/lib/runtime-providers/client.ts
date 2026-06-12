import type {
  RuntimeOpenAIProviderCreateBody,
  RuntimeOpenAIProviderUpdateBody,
  RuntimeProviderDetailResponse,
  RuntimeProviderMutationResponse,
  RuntimeProvidersListResponse,
  RuntimeProviderTestResponse,
  RuntimeStatusResponse
} from "@/lib/runtime-providers/types";

type ConsoleErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
    details?: Record<string, unknown>;
  };
};

async function parseJson<T>(response: Response): Promise<T | ConsoleErrorEnvelope> {
  try {
    return (await response.json()) as T;
  } catch {
    return {};
  }
}

function throwFromEnvelope(payload: ConsoleErrorEnvelope, status: number): never {
  const error = payload.error || {};
  const err = new Error(error.message || "Runtime provider request failed.");
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).code = error.code;
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).details = error.details;
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).status = status;
  throw err;
}

async function runtimeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });
  const payload = await parseJson<T | ConsoleErrorEnvelope>(response);
  if (!response.ok) {
    throwFromEnvelope(payload as ConsoleErrorEnvelope, response.status);
  }
  return payload as T;
}

export async function fetchRuntimeProviders(): Promise<RuntimeProvidersListResponse> {
  return runtimeFetch<RuntimeProvidersListResponse>("/api/console/runtime/providers");
}

export async function fetchRuntimeProvider(providerId: string): Promise<RuntimeProviderDetailResponse> {
  return runtimeFetch<RuntimeProviderDetailResponse>(
    `/api/console/runtime/providers/${encodeURIComponent(providerId)}`
  );
}

export async function createRuntimeOpenAIProvider(
  body: RuntimeOpenAIProviderCreateBody
): Promise<RuntimeProviderMutationResponse> {
  return runtimeFetch<RuntimeProviderMutationResponse>("/api/console/runtime/providers/openai-compatible", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateRuntimeProvider(
  providerId: string,
  body: RuntimeOpenAIProviderUpdateBody
): Promise<RuntimeProviderMutationResponse> {
  return runtimeFetch<RuntimeProviderMutationResponse>(
    `/api/console/runtime/providers/${encodeURIComponent(providerId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    }
  );
}

export async function deleteRuntimeProvider(providerId: string): Promise<RuntimeProviderMutationResponse> {
  return runtimeFetch<RuntimeProviderMutationResponse>(
    `/api/console/runtime/providers/${encodeURIComponent(providerId)}`,
    {
      method: "DELETE"
    }
  );
}

export async function testRuntimeProvider(providerId: string): Promise<RuntimeProviderTestResponse> {
  return runtimeFetch<RuntimeProviderTestResponse>(
    `/api/console/runtime/providers/${encodeURIComponent(providerId)}/test`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
}

export async function enableRuntimeProvider(providerId: string): Promise<RuntimeProviderMutationResponse> {
  return runtimeFetch<RuntimeProviderMutationResponse>(
    `/api/console/runtime/providers/${encodeURIComponent(providerId)}/enable`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
}

export async function disableRuntimeProvider(providerId: string): Promise<RuntimeProviderMutationResponse> {
  return runtimeFetch<RuntimeProviderMutationResponse>(
    `/api/console/runtime/providers/${encodeURIComponent(providerId)}/disable`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
}

export async function fetchRuntimeStatus(): Promise<RuntimeStatusResponse> {
  return runtimeFetch<RuntimeStatusResponse>("/api/console/runtime/status");
}
