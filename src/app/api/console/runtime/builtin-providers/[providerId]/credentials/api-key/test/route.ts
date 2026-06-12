import { testBuiltinProviderApiKey } from "@/lib/builtin-providers/server";
import { gatewayResultToResponse, runtimeSuccessResponse, withRuntimeAdmin } from "@/lib/runtime-providers/route-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { providerId } = await context.params;
  let body: { model?: string; message?: string } = {};
  try {
    const parsed = (await request.json()) as { model?: unknown; message?: unknown };
    if (typeof parsed.model === "string" && parsed.model.trim()) {
      body.model = parsed.model.trim();
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      body.message = parsed.message.trim();
    }
  } catch {
    body = {};
  }
  return withRuntimeAdmin(async ({ credentials }) => {
    const result = await testBuiltinProviderApiKey(providerId, body, credentials);
    if (!result.ok) {
      return gatewayResultToResponse(result);
    }
    return runtimeSuccessResponse(result.data, result.status);
  });
}
