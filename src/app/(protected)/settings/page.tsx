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

      <article className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
        <h2 className="text-sm font-semibold text-emerald-100">Diagnostics Dashboard</h2>
        <p className="mt-1 text-sm text-emerald-50/90">
          Provider health and reliability require internal admin token access. Configure token first, then open diagnostics.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/diagnostics"
            className="inline-flex rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/25"
          >
            Open Diagnostics
          </Link>
          <Link href="/settings/gateway" className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
            Configure Gateway Credentials
          </Link>
        </div>
      </article>

      <article className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4">
        <h2 className="text-sm font-semibold text-violet-100">Runtime Model Config Admin</h2>
        <p className="mt-1 text-sm text-violet-50/90">
          Runtime provider chain overrides require internal admin token access.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/model-configs"
            className="inline-flex rounded-lg border border-violet-300/40 bg-violet-400/15 px-3 py-2 text-sm text-violet-100 transition hover:bg-violet-400/25"
          >
            Open Model Configs
          </Link>
          <Link href="/settings/gateway" className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
            Configure Internal Admin Token
          </Link>
        </div>
      </article>

      <article className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
        <h2 className="text-sm font-semibold text-fuchsia-100">Memory & Conversation Management</h2>
        <p className="mt-1 text-sm text-fuchsia-50/90">
          Search/export/summarize conversations and manage message memory controls through protected server routes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/memory"
            className="inline-flex rounded-lg border border-fuchsia-300/40 bg-fuchsia-400/15 px-3 py-2 text-sm text-fuchsia-100 transition hover:bg-fuchsia-400/25"
          >
            Open Memory
          </Link>
          <Link href="/settings/gateway" className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
            Configure Gateway Credentials
          </Link>
        </div>
      </article>
    </section>
  );
}
