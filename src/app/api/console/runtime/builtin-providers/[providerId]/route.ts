import { getBuiltinProvider } from "@/lib/builtin-providers/server";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { providerId } = await context.params;
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await getBuiltinProvider(providerId, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}
