import { Badge, type BadgeVariant } from "@/components/ui/badge";

type SecretStatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  stored: "success",
  env: "success",
  env_ref: "success",
  configured: "success",
  none: "inactive",
  missing: "warning"
};

const STATUS_LABEL: Record<string, string> = {
  stored: "Secret stored",
  env: "Environment secret",
  env_ref: "Environment secret",
  configured: "Secret configured",
  none: "No secret required",
  missing: "Secret missing"
};

export function SecretStatusBadge({ status, className }: SecretStatusBadgeProps) {
  const normalized = String(status || "missing").trim().toLowerCase();
  return (
    <Badge variant={STATUS_VARIANT[normalized] || "inactive"} withDot className={className}>
      {STATUS_LABEL[normalized] || normalized}
    </Badge>
  );
}
