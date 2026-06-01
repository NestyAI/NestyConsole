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
    <header className="sticky top-0 z-20 border-b border-neural-text-muted/20 bg-neural-elevated/92 backdrop-blur">
      <div className="mx-auto flex h-[60px] w-full max-w-[1800px] items-center justify-between px-4 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/NestyAI_Logo.svg" alt="Nesty" width={18} height={18} className="h-[18px] w-[18px]" />
            <p className="font-display text-sm uppercase tracking-[0.1em] text-neural-text-primary">{env.appName}</p>
          </div>
          <p className="text-xs text-neural-text-secondary">Neural Noir operations console</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="live" withDot>
            Console
          </Badge>
          <Badge variant="ai">{envLabel}</Badge>
          {session ? (
            <span className="rounded-full border border-neural-text-muted/25 bg-neural-panel/70 px-3 py-1 font-mono text-xs text-neural-text-primary">
              {session.username}
            </span>
          ) : null}
          <LogoutButton className="inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/25 bg-neural-panel/70 px-3 py-2 font-display text-xs uppercase tracking-[0.08em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:text-neural-cyan disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </header>
  );
}
