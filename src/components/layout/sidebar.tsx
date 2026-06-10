"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, Folder, HardDrive, KeyRound, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Waypoints } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/workspaces", label: "Workspaces", icon: Folder },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/diagnostics", label: "Diagnostics", icon: Activity },
  { href: "/model-configs", label: "Model Configs", icon: Waypoints },
  { href: "/memory", label: "Memory", icon: HardDrive },
  { href: "/status", label: "Status", icon: ShieldCheck },
  { href: "/models", label: "Models", icon: Waypoints },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-white/10 bg-neural-shell/95 px-3 py-4 md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-[260px] md:border-b-0 md:border-r md:px-3 md:py-5">
      <div className="mb-4 hidden rounded-xl border border-white/10 bg-neural-elevated/50 p-3 md:block">
        <Image
          src="/NestyAI_Full.svg"
          alt="Nesty Console"
          width={180}
          height={36}
          className="h-auto w-[180px]"
          priority
        />
        <p className="mt-3 text-xs leading-relaxed text-neural-text-secondary">
          Gateway control, memory review, diagnostics, and model configuration.
        </p>
      </div>
      <div className="mb-3 hidden items-center justify-between md:flex">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-neural-text-muted">Navigation</p>
        <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-neural-elevated/60 px-2 py-1 text-[11px] text-neural-text-secondary">
          <StatusDot tone="live" />
          Online
        </span>
      </div>
      <nav className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
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
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                active
                  ? "border-neural-cyan/25 bg-neural-cyan/[0.08] text-neural-cyan"
                  : "border-transparent text-neural-text-secondary hover:border-white/10 hover:bg-neural-elevated/60 hover:text-neural-text-primary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 md:mt-6">
        <div className="rounded-xl border border-white/10 bg-neural-elevated/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neural-text-muted">Session</p>
              <p className="mt-1 text-sm text-neural-text-primary">Protected</p>
            </div>
            <StatusDot tone="live" />
          </div>
          <LogoutButton className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-neural-elevated/80 px-3 py-2 text-sm font-medium text-neural-text-primary transition hover:border-white/20 hover:bg-neural-overlay/60 disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </aside>
  );
}
