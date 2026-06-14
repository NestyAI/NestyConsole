import type { GatewayProviderChainItem } from "@/lib/gateway/types";

const SECRET_LIKE_PATTERN = /(key|token|secret|password|auth|credential)/i;

let chainItemIdCounter = 0;

function nextChainItemId(): string {
  chainItemIdCounter += 1;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `chain-item-${Date.now()}-${chainItemIdCounter}`;
}

export type EditableChainItem = {
  /** Stable React list key — never sent to Gateway */
  clientId: string;
  provider: string;
  model: string;
  enabled?: boolean;
  timeout_seconds?: string;
  max_tokens?: string;
  temperature?: string;
  base_url?: string;
  label?: string;
  name?: string;
};

export function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value.trim());
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

export function createEmptyChainItem(): EditableChainItem {
  return {
    clientId: nextChainItemId(),
    provider: "",
    model: "",
    enabled: true
  };
}

export function toEditableItem(item: GatewayProviderChainItem): EditableChainItem {
  return {
    clientId: nextChainItemId(),
    provider: String(item.provider || ""),
    model: String(item.model || ""),
    enabled: item.enabled !== false,
    timeout_seconds: item.timeout_seconds !== undefined ? String(item.timeout_seconds) : undefined,
    max_tokens: item.max_tokens !== undefined ? String(item.max_tokens) : undefined,
    temperature: item.temperature !== undefined ? String(item.temperature) : undefined,
    base_url: item.base_url ? String(item.base_url) : undefined,
    label: item.label ? String(item.label) : undefined,
    name: item.name ? String(item.name) : undefined
  };
}

export function sanitizeChainItems(items: EditableChainItem[]): GatewayProviderChainItem[] | null {
  const output: GatewayProviderChainItem[] = [];
  for (const item of items) {
    const provider = item.provider.trim();
    const model = item.model.trim();
    if (!provider || !model) {
      return null;
    }
    if (SECRET_LIKE_PATTERN.test(provider) || SECRET_LIKE_PATTERN.test(model)) {
      return null;
    }
    const next: GatewayProviderChainItem = {
      provider,
      model,
      enabled: item.enabled !== false
    };
    const timeout = parseOptionalNumber(item.timeout_seconds);
    if (timeout !== undefined) {
      next.timeout_seconds = timeout;
    }
    const maxTokens = parseOptionalNumber(item.max_tokens);
    if (maxTokens !== undefined) {
      next.max_tokens = maxTokens;
    }
    const temperature = parseOptionalNumber(item.temperature);
    if (temperature !== undefined) {
      next.temperature = temperature;
    }
    const baseUrl = item.base_url?.trim();
    if (baseUrl) {
      next.base_url = baseUrl;
    }
    const label = item.label?.trim();
    if (label) {
      next.label = label;
    }
    const name = item.name?.trim();
    if (name) {
      next.name = name;
    }
    output.push(next);
  }
  return output;
}

export function providerChainSummary(chain: GatewayProviderChainItem[]): string {
  if (!chain.length) {
    return "No provider chain";
  }
  return chain.map((item) => `${String(item.provider || "-")}:${String(item.model || "-")}`).join(" -> ");
}
