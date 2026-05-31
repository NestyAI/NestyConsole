"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Waypoints } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/status", label: "Status", icon: ShieldCheck },
  { href: "/models", label: "Models", icon: Waypoints },
  { href: "/settings/gateway", label: "Gateway Creds", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-white/10 bg-surface-900/70 p-4 backdrop-blur md:w-64 md:border-b-0 md:border-r">
      <div className="mb-6 hidden text-sm font-medium text-slate-300 md:block">Navigation</div>
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
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                active
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 md:mt-8">
        <LogoutButton className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60" />
      </div>
    </aside>
  );
}
