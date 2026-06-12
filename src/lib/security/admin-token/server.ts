import "server-only";

import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import { gatewayFetch } from "@/lib/gateway/client";
import type { GatewayResult } from "@/lib/gateway/types";
import { stripSecretFields } from "@/lib/runtime-providers/sanitize";
import type { AdminTokenRotateResponse, AdminTokenStatusResponse } from "@/lib/security/admin-token/types";

const SECURITY_BASE = "/internal/console/security";

function sanitizeResult<T>(result: GatewayResult<T>): GatewayResult<T> {
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    data: stripSecretFields(result.data)
  };
}

export async function fetchAdminTokenStatus(
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<AdminTokenStatusResponse>> {
  const result = await gatewayFetch<AdminTokenStatusResponse>(
    `${SECURITY_BASE}/admin-token/status`,
    {},
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}

export async function rotateAdminToken(
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<AdminTokenRotateResponse>> {
  const result = await gatewayFetch<AdminTokenRotateResponse>(
    `${SECURITY_BASE}/admin-token/rotate`,
    {
      method: "POST",
      body: JSON.stringify({})
    },
    { credentials, internalAdmin: true, consoleInternal: true }
  );
  return sanitizeResult(result);
}
