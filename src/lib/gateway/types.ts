export type GatewayHealthResponse = {
  status?: string;
  service?: string;
  version?: string;
  api_version?: string;
};

export type GatewayReadyResponse = {
  status?: string;
  service?: string;
  version?: string;
  api_version?: string;
  database?: string;
};

export type GatewayModel = {
  id: string;
  object?: string;
  owned_by?: string;
  description?: string;
  config_source?: string;
  notes?: string;
};

export type GatewayModelsResponse = {
  object?: string;
  data: GatewayModel[];
};

export type GatewayErrorEnvelope = {
  error: {
    code: string;
    message: string;
    type: "gateway_error";
    details?: Record<string, unknown>;
  };
};

export type GatewayResult<T> =
  | {
      ok: true;
      status: number;
      data: T;
    }
  | {
      ok: false;
      status: number;
      error: GatewayErrorEnvelope["error"];
    };

export type GatewayErrorCode =
  | "credentials_not_configured"
  | "invalid_api_key"
  | "gateway_unreachable"
  | "internal_admin_invalid"
  | "unknown_error"
  | "gateway_request_failed";
