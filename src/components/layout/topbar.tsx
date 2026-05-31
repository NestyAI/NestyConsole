import { cookies } from "next/headers";

import { LogoutButton } from "@/components/auth/logout-button";
import { getServerEnvStatus } from "@/lib/env";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function Topbar() {
  const env = getServerEnvStatus();
  const envLabel = env.nodeEnv === "production" ? "PROD" : env.nodeEnv.toUpperCase();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await parseSessionToken(token);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-surface-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div>
          <p className="text-sm font-semibold text-white">{env.appName}</p>
          <p className="text-xs text-slate-400">Gateway control panel for NestyAI</p>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
              {session.username}
            </span>
          ) : null}
          <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            {envLabel}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
