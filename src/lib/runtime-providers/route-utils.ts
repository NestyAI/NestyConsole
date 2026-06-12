import { NextResponse } from "next/server";

import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";
import { stripSecretFields } from "@/lib/runtime-providers/sanitize";

export const dynamic = "force-dynamic";

export async function withRuntimeAdmin(
  handler: (credentials: Awaited<ReturnType<typeof ensureInternalAdminAccess>> & { ok: true }) => Promise<
    ReturnType<typeof gatewayResultToResponse> | NextResponse
  >
) {
  const access = await ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }
  return handler(access);
}

export function runtimeSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json(stripSecretFields(data), { status });
}

export { gatewayResultToResponse };
