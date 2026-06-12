export type GatewayPolicyErrorCode =
  | "safety_violation"
  | "secret_exfiltration_blocked"
  | "malicious_cyber_request"
  | "unsafe_output_blocked"
  | "prompt_injection_detected";

export type ConsolePolicyErrorCode =
  | "gateway_policy_violation"
  | "gateway_secret_exfiltration_blocked"
  | "gateway_malicious_cyber_request"
  | "gateway_unsafe_output_blocked"
  | "gateway_prompt_injection_detected";

const UPSTREAM_TO_CONSOLE: Record<GatewayPolicyErrorCode, ConsolePolicyErrorCode> = {
  safety_violation: "gateway_policy_violation",
  secret_exfiltration_blocked: "gateway_secret_exfiltration_blocked",
  malicious_cyber_request: "gateway_malicious_cyber_request",
  unsafe_output_blocked: "gateway_unsafe_output_blocked",
  prompt_injection_detected: "gateway_prompt_injection_detected"
};

export function mapPolicyUpstreamCode(upstreamCode: string): ConsolePolicyErrorCode | null {
  const lowered = upstreamCode.trim().toLowerCase() as GatewayPolicyErrorCode;
  return UPSTREAM_TO_CONSOLE[lowered] || null;
}

export function isPolicyUpstreamType(upstreamType: string | null | undefined): boolean {
  return String(upstreamType || "").trim().toLowerCase() === "policy_error";
}

export function policyMessageForCode(
  code: ConsolePolicyErrorCode | GatewayPolicyErrorCode,
  reasonCode?: string | null
): string {
  const normalized = code.startsWith("gateway_")
    ? code
    : mapPolicyUpstreamCode(code) || "gateway_policy_violation";

  switch (normalized) {
    case "gateway_policy_violation":
      return "Gateway blocked this request for safety. Try rephrasing toward a safe or defensive use case.";
    case "gateway_secret_exfiltration_blocked":
      return "Gateway blocked a request to reveal secrets or internal/private context.";
    case "gateway_malicious_cyber_request":
      return "Gateway blocked a harmful cyber request. Defensive security questions are still supported.";
    case "gateway_unsafe_output_blocked":
      return "Gateway blocked unsafe generated content before returning it.";
    case "gateway_prompt_injection_detected":
      return "Gateway detected prompt-injection content in untrusted context and sanitized or blocked it.";
    default:
      if (reasonCode) {
        return "Gateway blocked this request for policy reasons.";
      }
      return "Gateway blocked this request for policy reasons.";
  }
}
