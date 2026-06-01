import { NextResponse } from "next/server";

import type { GatewayResult } from "@/lib/gateway/types";

type ConsoleProxyErrorCode =
  | "unauthorized"
  | "credentials_not_configured"
  | "invalid_gateway_api_key"
  | "internal_admin_not_configured"
  | "internal_admin_invalid"
  | "diagnostics_disabled"
  | "model_config_not_found"
  | "invalid_model_config"
  | "conversation_not_found"
  | "message_not_found"
  | "invalid_memory_control_request"
  | "semantic_recall_unavailable"
  | "gateway_unreachable"
  | "gateway_error"
  | "not_found"
  | "unknown_error";

function normalizeGatewayErrorCode(code: string): ConsoleProxyErrorCode {
  const lowered = code.trim().toLowerCase();
  if (lowered === "credentials_not_configured") {
    return "credentials_not_configured";
  }
  if (lowered === "unauthorized") {
    return "unauthorized";
  }
  if (lowered === "internal_admin_invalid") {
    return "internal_admin_invalid";
  }
  if (lowered === "internal_admin_disabled") {
    return "internal_admin_not_configured";
  }
  if (lowered === "diagnostics_disabled") {
    return "diagnostics_disabled";
  }
  if (lowered === "model_config_not_found") {
    return "model_config_not_found";
  }
  if (lowered === "invalid_model_config") {
    return "invalid_model_config";
  }
  if (lowered === "conversation_not_found") {
    return "conversation_not_found";
  }
  if (lowered === "message_not_found") {
    return "message_not_found";
  }
  if (lowered === "invalid_memory_control_request") {
    return "invalid_memory_control_request";
  }
  if (lowered === "semantic_recall_unavailable") {
    return "semantic_recall_unavailable";
  }
  if (lowered === "invalid_api_key" || lowered === "missing_api_key") {
    return "invalid_gateway_api_key";
  }
  if (lowered === "gateway_unreachable") {
    return "gateway_unreachable";
  }
  if (lowered === "not_found") {
    return "not_found";
  }
  if (lowered === "gateway_request_failed") {
    return "gateway_error";
  }
  return "unknown_error";
}

function fallbackMessage(code: ConsoleProxyErrorCode): string {
  switch (code) {
    case "credentials_not_configured":
      return "Gateway credentials are not configured.";
    case "unauthorized":
      return "Authentication required.";
    case "invalid_gateway_api_key":
      return "Gateway API key is invalid or expired.";
    case "internal_admin_not_configured":
      return "Internal admin access is not configured.";
    case "internal_admin_invalid":
      return "Internal admin token is invalid.";
    case "diagnostics_disabled":
      return "Diagnostics are disabled on Gateway.";
    case "model_config_not_found":
      return "Model config was not found.";
    case "invalid_model_config":
      return "Model config override is invalid.";
    case "conversation_not_found":
      return "Conversation was not found.";
    case "message_not_found":
      return "Message was not found.";
    case "invalid_memory_control_request":
      return "Memory control update is invalid.";
    case "semantic_recall_unavailable":
      return "Semantic recall is unavailable on Gateway.";
    case "gateway_unreachable":
      return "Gateway is unavailable or unreachable from Nesty Console.";
    case "not_found":
      return "Requested resource was not found.";
    case "gateway_error":
      return "Gateway request failed.";
    default:
      return "Unknown gateway error.";
  }
}

export function gatewayResultToResponse<T>(result: GatewayResult<T>) {
  if (result.ok) {
    return NextResponse.json(result.data, { status: result.status });
  }

  const code = normalizeGatewayErrorCode(result.error.code || "");
  const message = String(result.error.message || fallbackMessage(code));
  const status = result.status >= 400 ? result.status : 500;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        type: "console_error",
        ...(result.error.details ? { details: result.error.details } : {})
      }
    },
    { status }
  );
}

export function internalAdminNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: {
        code: "internal_admin_not_configured",
        message: "Internal admin access is not configured. Add the admin token in Settings -> Gateway Credentials.",
        type: "console_error"
      }
    },
    { status: 400 }
  );
}
