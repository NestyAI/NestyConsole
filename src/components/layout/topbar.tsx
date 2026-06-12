import { cookies } from "next/headers";
import Image from "next/image";
import { ServerCog, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { TopbarRoute } from "@/components/layout/topbar-route";
import { StatusPill } from "@/components/ui/status-pill";
import { getServerEnvStatus } from "@/lib/env";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function Topbar() {
  const env = getServerEnvStatus();
  const envLabel = env.nodeEnv === "production" ? "PROD" : env.nodeEnv.toUpperCase();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await parseSessionToken(token);

  return (
    <header className="glass-overlay titanium-edge sticky top-3 z-topbar rounded-3xl">
      <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.045] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
            <Image src="/NestyAI_Logo.svg" alt="" width={22} height={22} className="size-[22px]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-neural-text-primary">{env.appName}</p>
              <span className="hidden h-3 w-px bg-white/[0.12] sm:block" aria-hidden="true" />
              <TopbarRoute />
            </div>
            <p className="mt-1 hidden text-xs text-neural-text-muted sm:block">Protected operator environment</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill tone={env.gatewayUrlConfigured ? "success" : "warning"} className="hidden md:inline-flex">
            {env.gatewayUrlConfigured ? "Gateway configured" : "Gateway setup needed"}
          </StatusPill>
          <span className="hidden items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-neural-text-secondary sm:inline-flex">
            <ServerCog className="size-4 text-neural-cyan" aria-hidden="true" />
            {envLabel}
          </span>
          {session ? (
            <span className="hidden max-w-[180px] items-center gap-2 truncate rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-neural-text-primary lg:inline-flex">
              <UserRound className="size-4 text-neural-text-muted" aria-hidden="true" />
              {session.username}
            </span>
          ) : null}
          <LogoutButton className="hidden min-h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.045] px-3 text-sm font-medium text-neural-text-primary transition hover:border-white/[0.18] hover:bg-white/[0.075] disabled:opacity-60 xl:inline-flex" />
        </div>
      </div>
    </header>
  );
}
