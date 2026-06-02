import { NextResponse } from "next/server";

import { resolveEffectiveGatewayCredentials } from "@/lib/console/credentials";
import type { EffectiveGatewayCredentials } from "@/lib/console/types";
import { internalAdminNotConfiguredResponse } from "@/lib/gateway/route-errors";

type InternalAdminAccessResult =
  | {
      ok: true;
      credentials: EffectiveGatewayCredentials;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function ensureInternalAdminAccess(): Promise<InternalAdminAccessResult> {
  const effective = await resolveEffectiveGatewayCredentials();

  if (!effective.gatewayUrl) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "credentials_not_configured",
            message: "Gateway credentials are not configured. Update Settings -> Gateway Credentials.",
            type: "console_error"
          }
        },
        { status: 400 }
      )
    };
  }

  if (!effective.internalAdminEnabled || !effective.internalAdminToken) {
    return {
      ok: false,
      response: internalAdminNotConfiguredResponse()
    };
  }

  return {
    ok: true,
    credentials: effective
  };
}
