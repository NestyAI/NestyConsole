"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Activity, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { ErrorBanner } from "@/components/ui/error-banner";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";

type LoginError = {
  code?: string;
  message?: string;
};

const controlPoints = [
  {
    icon: ShieldCheck,
    title: "Protected relay",
    text: "Gateway credentials stay behind the Console server boundary."
  },
  {
    icon: Activity,
    title: "Operational clarity",
    text: "Diagnostics, memory, providers, and status share one command surface."
  },
  {
    icon: KeyRound,
    title: "Single-admin control",
    text: "A focused self-host workflow without exposing browser-side secrets."
  }
];

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: LoginError };
      if (!response.ok || !payload.ok) {
        setError(payload.error || { code: "login_failed", message: "Login failed." });
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError({
        code: "network_error",
        message: "Login request failed. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-accent titanium-edge min-w-0 w-full max-w-6xl overflow-hidden rounded-[2rem] shadow-[0_36px_100px_rgb(0_0_0/0.45)]">
      <div className="grid min-w-0 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative min-w-0 border-b border-white/[0.08] p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-12">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <Image src="/NestyAI_Full.svg" alt="Nesty Console" width={240} height={48} className="h-auto w-[180px] max-w-full sm:w-[240px]" priority />
            <StatusPill tone="live">Secure access</StatusPill>
          </div>

          <div className="mt-10 min-w-0 max-w-xl sm:mt-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neural-cyan">Titanium command deck</p>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.055em] text-neural-text-primary sm:text-5xl">
              Operate your gateway with confidence.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-sm leading-7 text-neural-text-secondary sm:text-base sm:leading-8">
              A focused control surface for provider health, runtime configuration, secure access, conversations, and memory.
            </p>
          </div>

          <div className="mt-10 grid gap-3">
            {controlPoints.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="glass-raised flex min-w-0 items-start gap-4 rounded-2xl p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neural-cyan/20 bg-neural-cyan/[0.07] text-neural-cyan">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neural-text-primary">{item.title}</p>
                    <p className="mt-1 text-pretty text-sm leading-6 text-neural-text-secondary">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex min-w-0 items-center p-6 sm:p-9 lg:p-12">
          <div className="w-full">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.05] text-neural-cyan shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-neural-text-primary">Admin sign in</h2>
            <p className="mt-2 text-sm leading-6 text-neural-text-secondary">
              Use the credentials configured for this Console environment.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5" aria-busy={submitting}>
              <FormField label="Username" htmlFor="username" required>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="font-mono"
                  required
                />
              </FormField>

              <FormField label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="font-mono"
                  required
                />
              </FormField>

              {error ? (
                <ErrorBanner code={error.code || "login_error"} message={error.message || "Invalid login."} />
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-neural-text-secondary">
                  Authentication is verified server-side and stored in a signed HTTP-only session.
                </div>
              )}

              <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3">
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {submitting ? "Signing in" : "Sign in"}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
