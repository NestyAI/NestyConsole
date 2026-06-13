import type { OrchestrationConfigView, OrchestrationConsoleError, OrchestrationFetchResult, OrchestrationPatchBody } from "./types";

function normalizeError(payload: unknown, fallback: string): OrchestrationConsoleError {
  const data = payload as { error?: { code?: unknown; message?: unknown } } | null;
  return {
    code: String(data?.error?.code || "unknown_error"),
    message: String(data?.error?.message || fallback)
  };
}

export async function fetchOrchestrationConfig(modelId: string): Promise<OrchestrationFetchResult> {
  const safeModelId = modelId.trim();
  if (!safeModelId) {
    return {
      ok: false,
      error: { code: "invalid_model_config", message: "Model ID is required." }
    };
  }

  try {
    const response = await fetch(
      `/api/console/runtime/model-configs/${encodeURIComponent(safeModelId)}/orchestration`,
      { cache: "no-store" }
    );
    const payload = (await response.json()) as { ok?: boolean; data?: OrchestrationConfigView; error?: unknown };
    if (!response.ok || !payload.ok || !payload.data) {
      return {
        ok: false,
        error: normalizeError(payload, "Failed to load orchestration role config.")
      };
    }
    return { ok: true, data: payload.data };
  } catch {
    return {
      ok: false,
      error: { code: "gateway_unreachable", message: "Failed to load orchestration role config." }
    };
  }
}

export async function patchOrchestrationConfig(
  modelId: string,
  body: OrchestrationPatchBody
): Promise<OrchestrationFetchResult> {
  const safeModelId = modelId.trim();
  if (!safeModelId) {
    return {
      ok: false,
      error: { code: "invalid_model_config", message: "Model ID is required." }
    };
  }

  try {
    const response = await fetch(
      `/api/console/runtime/model-configs/${encodeURIComponent(safeModelId)}/orchestration`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const payload = (await response.json()) as { ok?: boolean; data?: OrchestrationConfigView; error?: unknown };
    if (!response.ok || !payload.ok || !payload.data) {
      return {
        ok: false,
        error: normalizeError(payload, "Failed to save orchestration role config.")
      };
    }
    return { ok: true, data: payload.data };
  } catch {
    return {
      ok: false,
      error: { code: "gateway_unreachable", message: "Failed to save orchestration role config." }
    };
  }
}
