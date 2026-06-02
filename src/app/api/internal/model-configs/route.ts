import { gatewayFetch } from "@/lib/gateway/client";
import { gatewayResultToResponse } from "@/lib/gateway/route-errors";
import type { GatewayModelConfigListResponse } from "@/lib/gateway/types";
import { ensureInternalAdminAccess } from "@/lib/internal-admin/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await ensureInternalAdminAccess();
  if (!access.ok) {
    return access.response;
  }

  const result = await gatewayFetch<GatewayModelConfigListResponse>(
    "/internal/model-configs",
    {},
    { credentials: access.credentials, internalAdmin: true }
  );
  return gatewayResultToResponse(result);
}
