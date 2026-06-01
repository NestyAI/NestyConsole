"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, HardDrive, KeyRound, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Waypoints } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
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
    <aside className="w-full border-b border-neural-text-muted/20 bg-neural-elevated/90 px-3 pb-4 pt-3 backdrop-blur md:w-[220px] md:border-b-0 md:border-r">
      <div className="mb-4 hidden h-[60px] items-center rounded-lg border border-neural-cyan/25 bg-neural-panel/80 px-3 md:flex">
        <Image
          src="/NestyAI_Full.svg"
          alt="Nesty Console"
          width={170}
          height={34}
          className="h-auto w-[170px]"
          priority
        />
      </div>
      <div className="mb-3 hidden font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-secondary md:block">
        Navigation
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
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-display text-xs uppercase tracking-[0.06em] transition",
                active
                  ? "border-neural-cyan/45 border-l-[3px] bg-neural-cyan/12 text-neural-cyan shadow-neural-glow"
                  : "border-neural-text-muted/20 bg-neural-panel/40 text-neural-text-secondary hover:border-neural-text-muted/45 hover:text-neural-text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 md:mt-8">
        <LogoutButton className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neural-text-muted/25 bg-neural-panel/60 px-3 py-2 font-display text-xs uppercase tracking-[0.08em] text-neural-text-primary transition hover:border-neural-cyan/45 hover:text-neural-cyan disabled:cursor-not-allowed disabled:opacity-60" />
      </div>
    </aside>
  );
}
