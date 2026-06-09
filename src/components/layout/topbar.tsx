import { cookies } from "next/headers";
import Image from "next/image";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { getServerEnvStatus } from "@/lib/env";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function Topbar() {
  const env = getServerEnvStatus();
  const envLabel = env.nodeEnv === "production" ? "PROD" : env.nodeEnv.toUpperCase();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await parseSessionToken(token);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[rgba(8,13,22,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <Image src="/NestyAI_Logo.svg" alt="Nesty" width={20} height={20} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-sm font-semibold text-neural-text-primary">{env.appName}</p>
              <Badge variant="live" withDot>
                Console
              </Badge>
            </div>
            <p className="truncate text-xs text-neural-text-secondary">Protected operator console - {envLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="ai" className="hidden sm:inline-flex">
            {envLabel}
          </Badge>
          {session ? (
            <span className="hidden max-w-[180px] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-neural-text-primary sm:inline-flex">
              {session.username}
            </span>
          ) : null}
          <LogoutButton className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-display text-[11px] uppercase tracking-[0.08em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:bg-white/[0.08] hover:text-neural-cyan disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </header>
  );
}
