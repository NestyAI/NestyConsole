import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusDot } from "@/components/ui/status-dot";
import { TerminalBlock } from "@/components/ui/terminal-block";

const cards = [
  {
    href: "/chat",
    title: "NestyChat Web",
    description: "Protected chat UI with server-side proxy requests and conversation continuity."
  },
  {
    href: "/memory",
    title: "Memory",
    description: "Conversation search, summaries, export, and per-message memory controls."
  },
  {
    href: "/diagnostics",
    title: "Diagnostics",
    description: "Provider health, reliability scoring, and latest internal diagnostics checks."
  },
  {
    href: "/status",
    title: "Gateway Status",
    description: "Health, readiness, and runtime availability."
  },
  {
    href: "/models",
    title: "Models",
    description: "Inspect active model aliases from NestyAI."
  },
  {
    href: "/model-configs",
    title: "Model Configs",
    description: "View effective runtime config and edit safe provider chain overrides."
  },
  {
    href: "/api-keys",
    title: "API Keys",
    description: "Manage Gateway keys. Create and revoke client access tokens."
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Verify local environment configuration safely."
  },
  {
    href: "/settings/gateway",
    title: "Gateway Credentials",
    description: "Update encrypted gateway URL/API key/internal admin token."
  },
  {
    href: "#",
    title: "Future",
    description: "Memory tools and broader provider marketplace workflows in upcoming versions."
  }
];

export default function HomePage() {
  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Panel accent="cyan" className="p-6 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="live" withDot>
              Operations
            </Badge>
            <Badge variant="ai">Neural Dark</Badge>
            <Badge variant="inactive">Single Admin</Badge>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Image src="/NestyAI_Full.svg" alt="Nesty Console" width={300} height={58} className="h-auto w-[260px]" />
              <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.06em] text-neural-text-primary sm:text-5xl lg:text-6xl">
                Nesty Console
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-neural-text-secondary">
                Mission control for gateway operations, memory review, model governance, and diagnostics. Built for a
                single operator who needs speed without losing clarity.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/status"
                  className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
                >
                  Check gateway
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Open chat ops
                </Link>
                <Link
                  href="/memory"
                  className="inline-flex items-center gap-2 rounded-2xl border border-neural-violet/35 bg-neural-violet/14 px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-violet-200 transition hover:bg-neural-violet/22"
                >
                  Inspect memory
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:min-w-[280px]">
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Command posture</p>
              <div className="mt-4 space-y-3">
                {[
                  ["Gateway relay", "Ready"],
                  ["Memory index", "Live"],
                  ["Diagnostics", "Monitoring"]
                ].map(([label, state]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusDot tone="live" />
                      <span className="text-sm text-neural-text-primary">{label}</span>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-neural-text-secondary">{state}</span>
                  </div>
                ))}
              </div>

              <TerminalBlock className="mt-4 border-white/10 text-[11px] text-neural-text-code">
                {`> session: active
> gateway: ready
> memory: indexed
> diagnostics: nominal`}
              </TerminalBlock>
            </div>
          </div>
        </Panel>

        <Panel accent="violet" className="p-6 sm:p-7 lg:p-8">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Quick Notes</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
            The whole console now reads as one system.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neural-text-secondary">
            The shell, login screen, and shared card primitives all share the same quieter radius, softer glow, and more
            deliberate typography.
          </p>

          <div className="mt-6 grid gap-3">
            {[
              "Sharper hierarchy on key surfaces",
              "Cleaner glass-like panels without overdoing the glow",
              "More breathable spacing on shared primitives"
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-neural-text-secondary">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Control Surface" value="9" hint="Primary operator modules" accent="cyan" />
        <StatCard label="Security Model" value="Server-side" hint="No browser key exposure" accent="green" />
        <StatCard label="Mode" value="Single Admin" hint="Self-host operations" accent="amber" />
        <StatCard label="Theme" value="Neural Dark" hint="High-density dark console" accent="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel accent="cyan" className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Primary Modules</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
                Everything you need is one click away.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-neural-text-secondary">
              The grid stays compact, but each module has enough breathing room to feel deliberate rather than crowded.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const isDisabled = card.href === "#";
              const className =
                "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-neural-cyan/35 hover:bg-white/[0.05] hover:shadow-neural-glow";

              if (isDisabled) {
                return (
                  <div key={card.title} className={className}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-base font-semibold tracking-[-0.03em] text-neural-text-primary">
                          {card.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{card.description}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link key={card.title} href={card.href} className={className}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-base font-semibold tracking-[-0.03em] text-neural-text-primary">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{card.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-neural-cyan transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel accent="amber" className="p-6">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Operator Flow</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
            A cleaner daily runbook.
          </h2>
          <div className="mt-5 space-y-3">
            {[
              "Start with Status to verify readiness.",
              "Use Chat for direct gateway conversations.",
              "Check Memory before summarizing or exporting.",
              "Keep Diagnostics open when you need to watch providers."
            ].map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neural-amber/25 bg-neural-amber/10 font-mono text-[11px] text-neural-amber">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-neural-text-secondary">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
