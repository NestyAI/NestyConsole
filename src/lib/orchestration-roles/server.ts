import "server-only";

import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import { gatewayFetch } from "@/lib/gateway/client";
import type { GatewayResult } from "@/lib/gateway/types";
import { stripSecretFields } from "@/lib/runtime-providers/sanitize";

import { parseOrchestrationView } from "./normalize";
import type { OrchestrationConfigView, OrchestrationPatchBody } from "./types";

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

export async function getOrchestrationConfig(
  modelId: string,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<OrchestrationConfigView>> {
  const result = await gatewayFetch<unknown>(
    `${RUNTIME_BASE}/model-configs/${encodeURIComponent(modelId)}/orchestration`,
    {},
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  const sanitized = sanitizeResult(result);
  if (!sanitized.ok) {
    return sanitized;
  }
  const parsed = parseOrchestrationView(sanitized.data);
  if (!parsed) {
    return {
      ok: false,
      status: 502,
      error: {
        code: "gateway_error",
        message: "Gateway returned an invalid orchestration config payload.",
        type: "gateway_error"
      }
    };
  }
  return {
    ok: true,
    status: sanitized.status,
    data: parsed
  };
}

export async function patchOrchestrationConfig(
  modelId: string,
  body: OrchestrationPatchBody,
  credentials: EffectiveGatewayCredentials
): Promise<GatewayResult<OrchestrationConfigView>> {
  const result = await gatewayFetch<unknown>(
    `${RUNTIME_BASE}/model-configs/${encodeURIComponent(modelId)}/orchestration`,
    {
      method: "PATCH",
      body: JSON.stringify({
        roles: body.roles,
        changed_by_label: body.changed_by_label || "nesty-console"
      })
    },
    { credentials, internalAdmin: true, consoleRuntime: true }
  );
  const sanitized = sanitizeResult(result);
  if (!sanitized.ok) {
    return sanitized;
  }
  const parsed = parseOrchestrationView(sanitized.data);
  if (!parsed) {
    return {
      ok: false,
      status: 502,
      error: {
        code: "gateway_error",
        message: "Gateway returned an invalid orchestration config payload.",
        type: "gateway_error"
      }
    };
  }
  return {
    ok: true,
    status: sanitized.status,
    data: parsed
  };
}
