import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Braces,
  KeyRound,
  MemoryStick,
  MessageSquareText,
  Radar,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Waypoints
} from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { GlassCard } from "@/components/ui/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getServerEnvStatus } from "@/lib/env";

const modules = [
  {
    href: "/chat",
    title: "NestyChat",
    description: "Work with the gateway through the protected streaming chat surface.",
    icon: MessageSquareText,
    group: "Operate"
  },
  {
    href: "/workspaces",
    title: "Workspaces",
    description: "Organize project context, preferred presets, notes, and conversations.",
    icon: Waypoints,
    group: "Operate"
  },
  {
    href: "/memory",
    title: "Memory",
    description: "Search, summarize, export, and control retained conversation context.",
    icon: MemoryStick,
    group: "Operate"
  },
  {
    href: "/status",
    title: "Gateway Status",
    description: "Inspect live health, readiness, API version, and database availability.",
    icon: Activity,
    group: "Observe"
  },
  {
    href: "/diagnostics",
    title: "Diagnostics",
    description: "Review provider health, reliability scores, and recent internal checks.",
    icon: Radar,
    group: "Observe"
  },
  {
    href: "/models",
    title: "Models",
    description: "Inspect the active model aliases currently published by the gateway.",
    icon: Bot,
    group: "Configure"
  },
  {
    href: "/model-configs",
    title: "Model Configs",
    description: "Govern effective runtime config and safe provider-chain overrides.",
    icon: SlidersHorizontal,
    group: "Configure"
  },
  {
    href: "/api-keys",
    title: "API Keys",
    description: "Create, inspect, update, and revoke gateway client credentials.",
    icon: KeyRound,
    group: "Configure"
  },
  {
    href: "/settings",
    title: "System Settings",
    description: "Verify runtime posture and enter higher-trust administration surfaces.",
    icon: Settings2,
    group: "Configure"
  }
] as const;

export default function HomePage() {
  const env = getServerEnvStatus();
  const gatewayConfigured = env.gatewayUrlConfigured && env.apiKeyConfigured;
  const adminConfigured = env.internalAdminEnabled && env.internalAdminTokenConfigured;

  return (
    <MotionPage>
      <section className="glass-accent titanium-edge relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={gatewayConfigured ? "success" : "warning"}>
                {gatewayConfigured ? "Gateway configured" : "Gateway setup required"}
              </StatusPill>
              <StatusPill tone={env.adminAuthConfigured ? "live" : "warning"}>
                {env.adminAuthConfigured ? "Admin protected" : "Auth incomplete"}
              </StatusPill>
              <StatusPill tone="inactive">{env.nodeEnv}</StatusPill>
            </div>

            <p className="mt-8 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-neural-cyan">
              NestyAI Operations
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-neural-text-primary sm:text-5xl lg:text-6xl">
              Gateway command deck
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neural-text-secondary sm:text-lg">
              One focused surface for gateway operations, model governance, provider health, memory, and protected
              administration.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/status"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2.5 text-sm font-semibold text-neural-cyan transition-colors hover:bg-neural-cyan/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan"
              >
                Open live status
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chat"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm font-semibold text-neural-text-primary transition-colors hover:border-white/20 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan"
              >
                Start a conversation
              </Link>
            </div>
          </div>

          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-neural-text-muted">
                  Command posture
                </p>
                <p className="mt-2 text-lg font-semibold text-neural-text-primary">Server-side readiness</p>
              </div>
              <ShieldCheck className="h-7 w-7 text-neural-cyan" aria-hidden="true" />
            </div>

            <div className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {[
                ["Gateway relay", gatewayConfigured, "URL + API key"],
                ["Console auth", env.adminAuthConfigured, "Admin session"],
                ["Internal admin", adminConfigured, "Privileged routes"]
              ].map(([label, ready, detail]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-neural-text-primary">{label}</p>
                    <p className="mt-0.5 text-xs text-neural-text-muted">{detail}</p>
                  </div>
                  <StatusPill tone={ready ? "success" : "warning"}>{ready ? "configured" : "attention"}</StatusPill>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-neural-text-muted">
              Configuration posture only. Use Gateway Status for live service health and readiness.
            </p>
          </GlassCard>
        </div>
      </section>

      <section aria-labelledby="posture-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-neural-text-muted">
              Runtime posture
            </p>
            <h2 id="posture-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
              Configuration at a glance
            </h2>
          </div>
          <Link href="/settings" className="text-sm font-medium text-neural-cyan hover:text-neural-cyan/80">
            Review all settings
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Gateway relay"
            value={gatewayConfigured ? "Configured" : "Incomplete"}
            hint="Server URL and client credential"
            accent={gatewayConfigured ? "green" : "amber"}
            icon={<Braces className="h-5 w-5" />}
          />
          <StatCard
            label="Console access"
            value={env.adminAuthConfigured ? "Protected" : "Incomplete"}
            hint="Admin password and session secret"
            accent={env.adminAuthConfigured ? "cyan" : "amber"}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <StatCard
            label="Internal admin"
            value={adminConfigured ? "Available" : "Restricted"}
            hint="Diagnostics and config controls"
            accent={adminConfigured ? "green" : "violet"}
            icon={<KeyRound className="h-5 w-5" />}
          />
          <StatCard
            label="Control surface"
            value="9 modules"
            hint="Operate, observe, and configure"
            accent="cyan"
            icon={<SlidersHorizontal className="h-5 w-5" />}
          />
        </div>
      </section>

      <section aria-labelledby="modules-heading">
        <div className="mb-5 max-w-2xl">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-neural-text-muted">
            Control surface
          </p>
          <h2 id="modules-heading" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-neural-text-primary">
            Move through the system with intent
          </h2>
          <p className="mt-3 text-sm leading-6 text-neural-text-secondary">
            Large operator panels keep the console spacious while each destination remains immediately scannable.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan">
                <GlassCard interactive className="h-full p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neural-cyan/20 bg-neural-cyan/[0.08] text-neural-cyan">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-neural-text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neural-cyan" />
                  </div>
                  <p className="mt-7 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-neural-text-muted">
                    {module.group}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-neural-text-primary">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neural-text-secondary">{module.description}</p>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </section>
    </MotionPage>
  );
}
