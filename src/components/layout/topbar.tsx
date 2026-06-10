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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-neural-shell/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-neural-elevated/80">
            <Image src="/NestyAI_Logo.svg" alt="Nesty" width={20} height={20} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-neural-text-primary">{env.appName}</p>
              <Badge variant="inactive">Console</Badge>
            </div>
            <p className="truncate text-xs text-neural-text-muted">Protected operator console · {envLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="inactive" className="hidden sm:inline-flex">
            {envLabel}
          </Badge>
          {session ? (
            <span className="hidden max-w-[180px] truncate rounded-md border border-white/10 bg-neural-elevated/60 px-2.5 py-1 font-mono text-xs text-neural-text-primary sm:inline-flex">
              {session.username}
            </span>
          ) : null}
          <LogoutButton className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-neural-elevated/60 px-3 py-2 text-sm font-medium text-neural-text-primary transition hover:border-white/20 hover:bg-neural-overlay/50 disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </header>
  );
}
