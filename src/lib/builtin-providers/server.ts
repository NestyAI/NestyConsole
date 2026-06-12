import "server-only";

import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import { gatewayFetch } from "@/lib/gateway/client";
import type { GatewayResult } from "@/lib/gateway/types";
import { stripSecretFields } from "@/lib/runtime-providers/sanitize";
import type {
  BuiltinApiKeyBody,
  BuiltinApiKeyTestBody,
  BuiltinCredentialMutationResponse,
  BuiltinCredentialsListResponse,
  BuiltinProviderDetailResponse,
  BuiltinProvidersListResponse,
  BuiltinProviderTestResponse
} from "@/lib/builtin-providers/types";

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

export async function listBuiltinProviders(
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinProvidersListResponse>> {
  const result = await gatewayFetch<BuiltinProvidersListResponse>(
    `${RUNTIME_BASE}/builtin-providers`,
    {},
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function getBuiltinProvider(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinProviderDetailResponse>> {
  const result = await gatewayFetch<BuiltinProviderDetailResponse>(
    `${RUNTIME_BASE}/builtin-providers/${encodeURIComponent(providerId)}`,
    {},
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function getBuiltinProviderCredentials(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinCredentialsListResponse>> {
  const result = await gatewayFetch<BuiltinCredentialsListResponse>(
    `${RUNTIME_BASE}/builtin-providers/${encodeURIComponent(providerId)}/credentials`,
    {},
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function updateBuiltinProviderApiKey(
  providerId: string,
  body: BuiltinApiKeyBody,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinCredentialMutationResponse>> {
  const result = await gatewayFetch<BuiltinCredentialMutationResponse>(
    `${RUNTIME_BASE}/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key`,
    {
      method: "PUT",
      body: JSON.stringify(body)
    },
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function deleteBuiltinProviderApiKey(
  providerId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinCredentialMutationResponse>> {
  const result = await gatewayFetch<BuiltinCredentialMutationResponse>(
    `${RUNTIME_BASE}/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key`,
    {
      method: "DELETE"
    },
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function rotateBuiltinProviderApiKey(
  providerId: string,
  body: BuiltinApiKeyBody,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinCredentialMutationResponse>> {
  const result = await gatewayFetch<BuiltinCredentialMutationResponse>(
    `${RUNTIME_BASE}/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key/rotate`,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function testBuiltinProviderApiKey(
  providerId: string,
  body: BuiltinApiKeyTestBody,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<BuiltinProviderTestResponse>> {
  const result = await gatewayFetch<BuiltinProviderTestResponse>(
    `${RUNTIME_BASE}/builtin-providers/${encodeURIComponent(providerId)}/credentials/api-key/test`,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}
