"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, HardDrive, KeyRound, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Waypoints } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/memory", label: "Memory", icon: HardDrive },
  { href: "/diagnostics", label: "Diagnostics", icon: Activity },
  { href: "/status", label: "Status", icon: ShieldCheck },
  { href: "/models", label: "Models", icon: Waypoints },
  { href: "/model-configs", label: "Model Configs", icon: Waypoints },
  { href: "/settings/gateway", label: "Gateway Creds", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-white/[0.08] bg-[rgba(8,13,22,0.62)] px-3 py-4 backdrop-blur-xl md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-[284px] md:border-b-0 md:border-r md:px-4 md:py-5">
      <div className="mb-4 hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:block">
        <Image
          src="/NestyAI_Full.svg"
          alt="Nesty Console"
          width={180}
          height={36}
          className="h-auto w-[180px]"
          priority
        />
        <p className="mt-3 text-xs text-neural-text-secondary">
          Single-operator workspace for gateway control, memory review, diagnostics, and model config.
        </p>
      </div>
      <div className="mb-3 hidden items-center justify-between md:flex">
        <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Workspace</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-neural-text-secondary">
          <StatusDot tone="live" />
          Connected
        </span>
      </div>
      <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href === "/settings" && pathname.startsWith("/settings/")) ||
            (item.href === "/settings/gateway" && pathname === "/settings/gateway");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2.5 font-display text-[11px] uppercase tracking-[0.08em] transition",
                active
                  ? "border-neural-cyan/40 bg-neural-cyan/12 text-neural-cyan shadow-neural-glow"
                  : "border-white/10 bg-white/[0.03] text-neural-text-secondary hover:border-white/20 hover:bg-white/[0.05] hover:text-neural-text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 md:mt-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Session</p>
              <p className="mt-1 text-sm text-neural-text-primary">Protected access</p>
            </div>
            <StatusDot tone="live" />
          </div>
          <LogoutButton className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:bg-white/[0.08] hover:text-neural-cyan disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </aside>
  );
}
