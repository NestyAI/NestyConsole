export type GatewayArchivedFilter = "active" | "archived" | "all";

export function normalizeGatewayArchivedFilter(
  value?: boolean | GatewayArchivedFilter | string | null
): GatewayArchivedFilter | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value ? "archived" : "active";
  }

  const lowered = String(value).trim().toLowerCase();
  if (!lowered) {
    return undefined;
  }
  if (lowered === "active" || lowered === "archived" || lowered === "all") {
    return lowered;
  }
  if (["1", "true", "yes", "on"].includes(lowered)) {
    return "archived";
  }
  if (["0", "false", "no", "off"].includes(lowered)) {
    return "active";
  }
  return undefined;
}

export function parseArchivedFilterParam(value: string | null): GatewayArchivedFilter | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  return normalizeGatewayArchivedFilter(value);
}
