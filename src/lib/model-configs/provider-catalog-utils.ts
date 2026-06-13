import type { GatewayProviderCapability } from "@/lib/runtime-providers/types";

export function normalizeProvider(value: unknown): string {
  const provider = String(value || "").trim().toLowerCase();
  if (!provider) return "unknown";
  if (provider === "nvidia_nim") return "nvidia";
  return provider;
}

export function providerDisplayName(value: string): string {
  if (value === "ollama_cloud") return "Ollama Cloud";
  if (value === "openrouter") return "OpenRouter";
  if (value === "nvidia") return "NVIDIA NIM";
  if (value === "groq") return "Groq";
  if (value === "unknown") return "Unknown";
  return value;
}

export function providerBadgeVariant(provider: string): "success" | "live" | "ai" | "warning" | "inactive" {
  if (provider === "groq") return "live";
  if (provider === "openrouter") return "ai";
  if (provider === "nvidia") return "warning";
  if (provider === "ollama_cloud") return "success";
  return "inactive";
}

export function findProviderCapability(
  catalog: GatewayProviderCapability[],
  providerId: string
): GatewayProviderCapability | undefined {
  const normalized = providerId.trim().toLowerCase();
  if (!normalized) return undefined;
  return catalog.find((item) => String(item.provider_id || "").trim().toLowerCase() === normalized);
}

export function providerChainWarnings(catalog: GatewayProviderCapability[], providerId: string): string[] {
  const match = findProviderCapability(catalog, providerId);
  const warnings: string[] = [];
  if (!match && providerId.trim()) {
    warnings.push("Provider ID is not in the current Gateway catalog. Manual entry is allowed; Gateway validates on save.");
  }
  if (match?.enabled === false) {
    warnings.push("Provider is disabled in Gateway runtime state.");
  }
  if (String(match?.secret_status || "").toLowerCase() === "missing") {
    warnings.push("Provider secret is missing on Gateway.");
  }
  if (String(match?.secret_status || "").toLowerCase() === "managed") {
    warnings.push("Built-in provider uses managed credentials. Configure the API key in Settings → Providers.");
  }
  if (String(match?.credential_source || "").toLowerCase() === "missing") {
    warnings.push("Built-in provider credential source is missing. Add credentials on Gateway or in Console.");
  }
  if (
    match?.source === "builtin" &&
    String(match?.secret_status || "").toLowerCase() === "none" &&
    String(match?.credential_source || "").toLowerCase() !== "env"
  ) {
    warnings.push("Built-in provider does not require an API key.");
  }
  return warnings;
}

export const OLLAMA_CLOUD_MODEL_EXAMPLES = [
  "gemma3:12b",
  "nemotron-3-nano:30b",
  "gpt-oss:20b",
  "gpt-oss:120b",
  "minimax-m3",
  "kimi-k2.6"
] as const;
