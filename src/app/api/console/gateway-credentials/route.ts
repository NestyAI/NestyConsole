import { NextResponse } from "next/server";

import {
  clearStoredGatewayCredentials,
  CredentialsManagerError,
  getGatewayCredentialsView,
  saveGatewayCredentials
} from "@/lib/console/credentials";
import type { GatewayCredentialsUpdateInput } from "@/lib/console/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const view = await getGatewayCredentialsView();
  return NextResponse.json({ ok: true, data: view });
}

export async function POST(request: Request) {
  let body: GatewayCredentialsUpdateInput;
  try {
    body = (await request.json()) as GatewayCredentialsUpdateInput;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request_body",
          message: "Request body must be valid JSON.",
          type: "gateway_error"
        }
      },
      { status: 400 }
    );
  }

  try {
    const saved = await saveGatewayCredentials({
      gateway_url: body.gateway_url,
      gateway_api_key: body.gateway_api_key,
      internal_admin_token: body.internal_admin_token,
      internal_admin_enabled: typeof body.internal_admin_enabled === "boolean" ? body.internal_admin_enabled : undefined
    });
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    if (error instanceof CredentialsManagerError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            type: "gateway_error"
          }
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "unknown_error",
          message: "Failed to save gateway credentials.",
          type: "gateway_error"
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const view = await clearStoredGatewayCredentials();
    return NextResponse.json({ ok: true, data: view });
  } catch (error) {
    if (error instanceof CredentialsManagerError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            type: "gateway_error"
          }
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "unknown_error",
          message: "Failed to clear stored gateway credentials.",
          type: "gateway_error"
        }
      },
      { status: 500 }
    );
  }
}
