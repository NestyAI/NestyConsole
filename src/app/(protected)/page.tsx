import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";

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
      <div>
        <div className="mb-3">
          <Image src="/NestyAI_Full.svg" alt="Nesty Console" width={300} height={58} className="h-auto w-[280px]" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl uppercase tracking-[0.08em] text-neural-text-primary">Nesty Console</h1>
          <Badge variant="live" withDot>
            Neural Noir
          </Badge>
        </div>
        <p className="mt-2 text-sm text-neural-text-secondary">Mission-control surface for NestyAI Gateway operations.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Control Surface" value="8" hint="Primary operator modules" accent="cyan" />
        <StatCard label="Security Model" value="Server-side" hint="No browser key exposure" accent="green" />
        <StatCard label="Mode" value="Single Admin" hint="Self-host operations" accent="amber" />
        <StatCard label="Theme" value="Neural Noir" hint="High-density dark console" accent="violet" />
      </div>

      <Panel accent="cyan">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-xs uppercase tracking-[0.08em] text-neural-text-secondary">Quick Actions</p>
          <Link href="/status" className="rounded-md border border-neural-cyan/30 bg-neural-cyan/10 px-3 py-1.5 font-display text-xs uppercase tracking-[0.07em] text-neural-cyan hover:bg-neural-cyan/20">
            Check Gateway Status
          </Link>
          <Link href="/chat" className="rounded-md border border-neural-text-muted/30 bg-neural-overlay/50 px-3 py-1.5 font-display text-xs uppercase tracking-[0.07em] text-neural-text-primary hover:border-neural-cyan/40">
            Open Chat Ops
          </Link>
          <Link href="/memory" className="rounded-md border border-neural-violet/30 bg-neural-violet/12 px-3 py-1.5 font-display text-xs uppercase tracking-[0.07em] text-violet-200 hover:bg-neural-violet/20">
            Inspect Memory
          </Link>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const isDisabled = card.href === "#";
          const className =
            "group neural-panel block rounded-xl p-5 transition hover:border-neural-cyan/35 hover:shadow-neural-glow";

          if (isDisabled) {
            return (
              <div key={card.title} className={className}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg uppercase tracking-[0.06em] text-neural-text-primary">{card.title}</h2>
                    <p className="mt-2 text-sm text-neural-text-secondary">{card.description}</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link key={card.title} href={card.href} className={className}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg uppercase tracking-[0.06em] text-neural-text-primary">{card.title}</h2>
                  <p className="mt-2 text-sm text-neural-text-secondary">{card.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-neural-cyan transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
