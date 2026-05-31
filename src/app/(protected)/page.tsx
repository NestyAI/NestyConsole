import Link from "next/link";
import { ArrowRight } from "lucide-react";

const cards = [
  {
    href: "/chat",
    title: "NestyChat Web MVP",
    description: "Protected chat UI with server-side proxy requests to NestyAI."
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
    description: "Diagnostics, model admin, and memory tools in upcoming versions."
  }
];

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Nesty Console</h1>
        <p className="mt-2 text-slate-300">Gateway control panel for NestyAI.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const isDisabled = card.href === "#";
          const className =
            "group block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-300/30 hover:bg-white/10";

          if (isDisabled) {
            return (
              <div key={card.title} className={className}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-white">{card.title}</h2>
                    <p className="mt-2 text-sm text-slate-300">{card.description}</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link key={card.title} href={card.href} className={className}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-white">{card.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">{card.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-cyan-200 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
