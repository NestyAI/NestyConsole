import { Badge, type BadgeVariant } from "@/components/ui/badge";

type ProviderBadgeProps = {
  provider: string | null | undefined;
  source?: "builtin" | "runtime" | string;
  className?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  nvidia: "NVIDIA",
  nvidia_nim: "NVIDIA",
  ollama_cloud: "Ollama Cloud",
  deepseek: "DeepSeek"
};

export function ProviderBadge({ provider, source, className }: ProviderBadgeProps) {
  const normalized = String(provider || "unknown").trim().toLowerCase();
  const variant: BadgeVariant = source === "runtime" ? "live" : normalized === "unknown" ? "inactive" : "ai";
  return (
    <Badge variant={variant} className={className}>
      {PROVIDER_LABELS[normalized] || provider || "Unknown provider"}
    </Badge>
  );
}
