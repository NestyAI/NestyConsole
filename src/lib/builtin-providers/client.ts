import type {
  BuiltinApiKeyBody,
  BuiltinApiKeyTestBody,
  BuiltinCredentialMutationResponse,
  BuiltinCredentialsListResponse,
  BuiltinProviderDetailResponse,
  BuiltinProvidersListResponse,
  BuiltinProviderTestResponse
} from "@/lib/builtin-providers/types";

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
  const err = new Error(error.message || "Built-in provider request failed.");
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).code = error.code;
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).details = error.details;
  (err as Error & { code?: string; details?: Record<string, unknown>; status?: number }).status = status;
  throw err;
}

async function builtinFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchBuiltinProviders(): Promise<BuiltinProvidersListResponse> {
  return builtinFetch<BuiltinProvidersListResponse>("/api/console/runtime/builtin-providers");
}

export async function fetchBuiltinProvider(providerId: string): Promise<BuiltinProviderDetailResponse> {
  return builtinFetch<BuiltinProviderDetailResponse>(
    `/api/console/runtime/builtin-providers/${encodeURIComponent(providerId)}`
  );
}

export async function fetchBuiltinProviderCredentials(
  providerId: string
): Promise<BuiltinCredentialsListResponse> {
  return builtinFetch<BuiltinCredentialsListResponse>(
    `/api/console/runtime/builtin-providers/${encodeURIComponent(providerId)}/credentials`
  );
}

export async function updateBuiltinProviderApiKey(
  providerId: string,
  body: BuiltinApiKeyBody
): Promise<BuiltinCredentialMutationResponse> {
  return builtinFetch<BuiltinCredentialMutationResponse>(
    `/api/console/runtime/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key`,
    {
      method: "PUT",
      body: JSON.stringify(body)
    }
  );
}

export async function deleteBuiltinProviderApiKey(
  providerId: string
): Promise<BuiltinCredentialMutationResponse> {
  return builtinFetch<BuiltinCredentialMutationResponse>(
    `/api/console/runtime/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key`,
    {
      method: "DELETE"
    }
  );
}

export async function rotateBuiltinProviderApiKey(
  providerId: string,
  body: BuiltinApiKeyBody
): Promise<BuiltinCredentialMutationResponse> {
  return builtinFetch<BuiltinCredentialMutationResponse>(
    `/api/console/runtime/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key/rotate`,
    {
      method: "POST",
      body: JSON.stringify(body)
    }
  );
}

export async function testBuiltinProviderApiKey(
  providerId: string,
  body: BuiltinApiKeyTestBody = {}
): Promise<BuiltinProviderTestResponse> {
  return builtinFetch<BuiltinProviderTestResponse>(
    `/api/console/runtime/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key/test`,
    {
      method: "POST",
      body: JSON.stringify(body)
    }
  );
}
