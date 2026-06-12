"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Boxes,
  Folder,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Waypoints
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Operate",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/workspaces", label: "Workspaces", icon: Folder }
    ]
  },
  {
    label: "Observe",
    items: [
      { href: "/diagnostics", label: "Diagnostics", icon: Activity },
      { href: "/status", label: "Status", icon: ShieldCheck },
      { href: "/models", label: "Models", icon: Bot },
      { href: "/memory", label: "Memory", icon: HardDrive }
    ]
  },
  {
    label: "Configure",
    items: [
      { href: "/model-configs", label: "Model Configs", icon: Waypoints },
      { href: "/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-base titanium-edge w-full rounded-3xl p-3 xl:sticky xl:top-[6.75rem] xl:h-[calc(100dvh-8.25rem)] xl:self-start xl:p-4">
      <div className="hidden h-full flex-col xl:flex">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <Image
            src="/NestyAI_Full.svg"
            alt="Nesty Console"
            width={190}
            height={38}
            className="h-auto w-[190px]"
            priority
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-neural-text-secondary">AI gateway command deck</p>
            <StatusPill tone="live">Secure</StatusPill>
          </div>
        </div>

        <nav className="neural-scroll mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neural-text-muted">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl border px-3 text-sm font-medium transition-[transform,border-color,background-color,color] duration-150 active:translate-y-px",
                        active
                          ? "border-neural-cyan/25 bg-neural-cyan/[0.09] text-cyan-50"
                          : "border-transparent text-neural-text-secondary hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-neural-text-primary"
                      )}
                    >
                      {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-neural-cyan" aria-hidden="true" /> : null}
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0",
                          active ? "text-neural-cyan" : "text-neural-text-muted group-hover:text-neural-text-primary"
                        )}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-neural-text-primary">Protected session</p>
              <p className="mt-0.5 text-[11px] text-neural-text-muted">Server-signed access</p>
            </div>
            <Boxes className="size-4 text-neural-cyan" aria-hidden="true" />
          </div>
          <LogoutButton className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.045] px-3 text-sm font-medium text-neural-text-primary transition hover:border-white/[0.18] hover:bg-white/[0.075] disabled:opacity-60" />
        </div>
      </div>

      <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5 xl:hidden" aria-label="Primary navigation">
        {navGroups.flatMap((group) => group.items).map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors",
                active
                  ? "border-neural-cyan/25 bg-neural-cyan/[0.09] text-cyan-50"
                  : "border-transparent text-neural-text-secondary hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-neural-text-primary"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
