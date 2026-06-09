import { cookies } from "next/headers";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getServerEnvStatus } from "@/lib/env";

type ConfigRowProps = {
  label: string;
  enabled: boolean;
};

function ConfigRow({ label, enabled }: ConfigRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-neural-text-secondary">{label}</span>
      <span
        className={[
          "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em]",
          enabled
            ? "border-neural-green/30 bg-neural-green/10 text-neural-green"
            : "border-white/10 bg-white/[0.04] text-neural-text-secondary"
        ].join(" ")}
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

  const authReady = Boolean(env.adminAuthConfigured);
  const gatewayReady = Boolean(env.gatewayUrlConfigured && env.apiKeyConfigured);
  const memoryReady = Boolean(env.internalAdminEnabled && env.internalAdminTokenConfigured);

  return (
    <section className="space-y-6 animate-fade-in-up">
      <Panel accent="cyan" className="p-6 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={gatewayReady ? "success" : "warning"} withDot>
            gateway
          </Badge>
          <Badge variant={authReady ? "success" : "warning"} withDot>
            auth
          </Badge>
          <Badge variant={memoryReady ? "success" : "warning"} withDot>
            diagnostics
          </Badge>
          <Badge variant="inactive">safe view</Badge>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">System Settings</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-neural-text-primary sm:text-5xl">
              Configuration without secret exposure.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neural-text-secondary">
              This page shows the console runtime state, server-side credential readiness, and the paths to the higher
              risk admin surfaces. No secret values are rendered in the browser.
            </p>
          </div>

          <div className="grid gap-2 text-sm text-neural-text-secondary">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Session</span>
              <span className="font-mono text-xs text-neural-text-primary">{session ? session.username : "signed out"}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Environment</span>
              <span className="font-mono text-xs text-neural-text-primary">{env.nodeEnv.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gateway ready"
          value={gatewayReady ? "Yes" : "No"}
          hint="URL and API key configured"
          accent={gatewayReady ? "green" : "amber"}
        />
        <StatCard
          label="Auth ready"
          value={authReady ? "Yes" : "No"}
          hint="Admin session runtime configured"
          accent={authReady ? "green" : "amber"}
        />
        <StatCard
          label="Admin access"
          value={env.internalAdminEnabled ? "Enabled" : "Off"}
          hint="Required for diagnostics and configs"
          accent={env.internalAdminEnabled ? "green" : "violet"}
        />
        <StatCard
          label="Session"
          value={session ? "Active" : "Signed out"}
          hint={session ? session.username : "Login required for protected routes"}
          accent={session ? "cyan" : "amber"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel accent="violet" className="p-6">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Runtime Status</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">Local console configuration</h2>

          <div className="mt-5 grid gap-3">
            <ConfigRow label="Gateway URL configured" enabled={env.gatewayUrlConfigured} />
            <ConfigRow label="API key configured" enabled={env.apiKeyConfigured} />
            <ConfigRow label="Internal admin enabled" enabled={env.internalAdminEnabled} />
            <ConfigRow label="Internal admin token configured" enabled={env.internalAdminTokenConfigured} />
          </div>
        </Panel>

        <Panel accent="amber" className="p-6">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Authentication</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">Access readiness</h2>

          <div className="mt-5 grid gap-3">
            <ConfigRow label="Logged in session present" enabled={Boolean(session)} />
            <ConfigRow label="Admin username configured" enabled={env.adminUsernameConfigured} />
            <ConfigRow label="Admin password configured" enabled={env.adminPasswordConfigured} />
            <ConfigRow label="Session secret configured" enabled={env.sessionSecretConfigured} />
            <ConfigRow label="Auth runtime ready" enabled={env.adminAuthConfigured} />
          </div>

          {session ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neural-text-secondary">
              Current admin: <span className="font-mono text-neural-text-primary">{session.username}</span>
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel accent="cyan" className="p-6">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Admin Surfaces</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
            Jump to the controlled zones.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neural-text-secondary">
            These are the higher-trust routes where you manage credentials, inspect diagnostics, and tune the runtime
            config.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/settings/gateway"
              className="rounded-2xl border border-neural-cyan/35 bg-neural-cyan/12 p-4 transition hover:bg-neural-cyan/20"
            >
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan">Gateway Credentials</p>
              <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">
                Manage URL, API key, and internal admin token in server-side encrypted storage.
              </p>
            </Link>

            <Link
              href="/api-keys"
              className="rounded-2xl border border-neural-green/35 bg-neural-green/12 p-4 transition hover:bg-neural-green/20"
            >
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-green">API Keys</p>
              <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">
                Create, revoke, and manage environment-specific Gateway API keys.
              </p>
            </Link>

            <Link
              href="/diagnostics"
              className="rounded-2xl border border-neural-amber/35 bg-neural-amber/12 p-4 transition hover:bg-neural-amber/20"
            >
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-amber">Diagnostics</p>
              <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">
                Review provider health, reliability scores, and the latest checks.
              </p>
            </Link>

            <Link
              href="/model-configs"
              className="rounded-2xl border border-neural-violet/35 bg-neural-violet/12 p-4 transition hover:bg-neural-violet/20"
            >
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-violet-200">Model Configs</p>
              <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">
                Inspect and edit safe provider chain overrides.
              </p>
            </Link>

            <Link
              href="/memory"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] sm:col-span-2"
            >
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">Memory</p>
              <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">
                Search, export, summarize, and manage conversation memory controls.
              </p>
            </Link>
          </div>
        </Panel>

        <Panel accent="green" className="p-6">
          <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Safety Notes</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
            What this page intentionally does not show.
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              "No secret values are rendered in the browser.",
              "Only safe readiness flags and sources are visible here.",
              "Credential updates stay on the protected server routes.",
              "Diagnostics and memory admin still require the right token state."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-neural-text-secondary">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
