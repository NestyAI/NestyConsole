import { cookies } from "next/headers";
import Link from "next/link";

import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getServerEnvStatus } from "@/lib/env";

type ConfigRowProps = {
  label: string;
  enabled: boolean;
};

function ConfigRow({ label, enabled }: ConfigRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-200">{label}</span>
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${
          enabled ? "bg-emerald-400/20 text-emerald-200" : "bg-slate-600/30 text-slate-300"
        }`}
      >
        {enabled ? "yes" : "no"}
      </span>
    </div>
  );
}

export default async function SettingsPage() {
  const env = getServerEnvStatus();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await parseSessionToken(token);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-300">Local console configuration status (safe view, no secret values).</p>
      </div>

      <div className="grid gap-3">
        <ConfigRow label="Gateway URL configured" enabled={env.gatewayUrlConfigured} />
        <ConfigRow label="API key configured" enabled={env.apiKeyConfigured} />
        <ConfigRow label="Internal admin enabled" enabled={env.internalAdminEnabled} />
        <ConfigRow label="Internal admin token configured" enabled={env.internalAdminTokenConfigured} />
      </div>

      <article className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-white">Authentication Status</h2>
        <div className="mt-3 grid gap-3">
          <ConfigRow label="Logged in session present" enabled={Boolean(session)} />
          <ConfigRow label="Admin username configured" enabled={env.adminUsernameConfigured} />
          <ConfigRow label="Admin password configured" enabled={env.adminPasswordConfigured} />
          <ConfigRow label="Session secret configured" enabled={env.sessionSecretConfigured} />
          <ConfigRow label="Auth runtime ready" enabled={env.adminAuthConfigured} />
        </div>
        {session ? <p className="mt-3 text-xs text-slate-300">Current admin: {session.username}</p> : null}
      </article>

      <article className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
        <h2 className="text-sm font-semibold text-cyan-100">Gateway Credentials Manager</h2>
        <p className="mt-1 text-sm text-cyan-50/90">
          Manage Gateway URL, API key, and internal admin token with server-side encrypted storage.
        </p>
        <Link
          href="/settings/gateway"
          className="mt-3 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/25"
        >
          Open Gateway Credentials
        </Link>
      </article>
    </section>
  );
}
