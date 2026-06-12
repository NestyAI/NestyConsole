"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Array<[string, string]> = [
  ["/settings/providers", "Settings / Runtime providers"],
  ["/settings/gateway", "Settings / Gateway credentials"],
  ["/model-configs", "Configure / Model configs"],
  ["/api-keys", "Configure / API keys"],
  ["/diagnostics", "Observe / Diagnostics"],
  ["/workspaces", "Operate / Workspaces"],
  ["/memory", "Observe / Memory"],
  ["/status", "Observe / Status"],
  ["/models", "Observe / Models"],
  ["/settings", "Configure / Settings"],
  ["/chat", "Operate / Chat"],
  ["/", "Operate / Dashboard"]
];

export function TopbarRoute() {
  const pathname = usePathname();
  const label =
    ROUTE_LABELS.find(([route]) => (route === "/" ? pathname === "/" : pathname.startsWith(route)))?.[1] ||
    "Console";
  return <span className="truncate text-xs text-neural-text-secondary">{label}</span>;
}
