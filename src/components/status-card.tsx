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
    <Panel accent={healthy ? "green" : "amber"}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-secondary">{label}</h3>
        <Badge variant={healthy ? "success" : "warning"}>{healthy ? "healthy" : "issue"}</Badge>
      </div>
      <p className="font-mono text-xl text-neural-text-primary">{value}</p>
      {details ? (
        <div className="mt-2">
          <TokenTag>{details}</TokenTag>
        </div>
      ) : null}
    </Panel>
  );
}
