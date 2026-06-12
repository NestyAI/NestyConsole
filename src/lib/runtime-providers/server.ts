import "server-only";

import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import { gatewayFetch } from "@/lib/gateway/client";
import type { GatewayResult } from "@/lib/gateway/types";
import { stripSecretFields } from "@/lib/runtime-providers/sanitize";
import type {
  RuntimeOpenAIProviderCreateBody,
  RuntimeOpenAIProviderUpdateBody,
  RuntimeProviderDetailResponse,
  RuntimeProviderMutationResponse,
  RuntimeProvidersListResponse,
  RuntimeProviderTestResponse,
  RuntimeStatusResponse
} from "@/lib/runtime-providers/types";

const RUNTIME_BASE = "/internal/console/runtime";

function sanitizeResult<T>(result: GatewayResult<T>): GatewayResult<T> {
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    data: stripSecretFields(result.data)
  };
}

export async function listRuntimeProviders(
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProvidersListResponse>> {
  const result = await gatewayFetch<RuntimeProvidersListResponse>(
    `${RUNTIME_BASE}/providers`,
    {},
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function getRuntimeProvider(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderDetailResponse>> {
  const result = await gatewayFetch<RuntimeProviderDetailResponse>(
    `${RUNTIME_BASE}/providers/${encodeURIComponent(providerId)}`,
    {},
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function createRuntimeOpenAIProvider(
  body: RuntimeOpenAIProviderCreateBody,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderMutationResponse>> {
  const result = await gatewayFetch<RuntimeProviderMutationResponse>(
    `${RUNTIME_BASE}/providers/openai-compatible`,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function updateRuntimeProvider(
  providerId: string,
  body: RuntimeOpenAIProviderUpdateBody,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderMutationResponse>> {
  const result = await gatewayFetch<RuntimeProviderMutationResponse>(
    `${RUNTIME_BASE}/providers/${encodeURIComponent(providerId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function deleteRuntimeProvider(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderMutationResponse>> {
  const result = await gatewayFetch<RuntimeProviderMutationResponse>(
    `${RUNTIME_BASE}/providers/${encodeURIComponent(providerId)}`,
    {
      method: "DELETE"
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function testRuntimeProvider(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderTestResponse>> {
  const result = await gatewayFetch<RuntimeProviderTestResponse>(
    `${RUNTIME_BASE}/providers/${encodeURIComponent(providerId)}/test`,
    {
      method: "POST",
      body: JSON.stringify({})
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function enableRuntimeProvider(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderMutationResponse>> {
  const result = await gatewayFetch<RuntimeProviderMutationResponse>(
    `${RUNTIME_BASE}/providers/${encodeURIComponent(providerId)}/enable`,
    {
      method: "POST",
      body: JSON.stringify({})
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function disableRuntimeProvider(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeProviderMutationResponse>> {
  const result = await gatewayFetch<RuntimeProviderMutationResponse>(
    `${RUNTIME_BASE}/providers/${encodeURIComponent(providerId)}/disable`,
    {
      method: "POST",
      body: JSON.stringify({})
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}

export async function getRuntimeStatus(
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<RuntimeStatusResponse>> {
  const result = await gatewayFetch<RuntimeStatusResponse>(
    `${RUNTIME_BASE}/status`,
    {},
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  return sanitizeResult(result);
}
