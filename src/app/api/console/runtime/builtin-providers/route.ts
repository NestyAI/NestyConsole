import { listBuiltinProviders } from "@/lib/builtin-providers/server";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await listBuiltinProviders(credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}
