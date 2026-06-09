import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { TokenTag } from "@/components/ui/token-tag";

type StatusCardProps = {
  label: string;
  value: string;
  healthy?: boolean;
  details?: string;
};

export function StatusCard({ label, value, healthy = false, details }: StatusCardProps) {
  return (
    <Panel accent={healthy ? "green" : "amber"} className="min-h-[152px]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">{label}</h3>
        <Badge variant={healthy ? "success" : "warning"}>{healthy ? "healthy" : "issue"}</Badge>
      </div>
      <p className="text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">{value}</p>
      {details ? (
        <div className="mt-3">
          <TokenTag>{details}</TokenTag>
        </div>
      ) : null}
    </Panel>
  );
}
