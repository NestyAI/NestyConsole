"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/status-dot";
import { SECTION_LABEL_CLASS } from "@/lib/design/tokens";

type LoginError = {
  code?: string;
  message?: string;
};

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
    <div className="neural-panel w-full max-w-5xl overflow-hidden rounded-xl">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <section className="border-b border-white/[0.08] p-6 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center justify-between gap-3">
            <Image src="/NestyAI_Full.svg" alt="Nesty Console" width={220} height={44} className="h-auto w-[220px]" />
            <Badge variant="live" withDot className="shrink-0">
              Secure
            </Badge>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-neural-elevated/80">
              <LockKeyhole className="h-5 w-5 text-neural-cyan" />
            </div>
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Admin Access</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-neural-text-primary">Command center login</h1>
            </div>
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-neural-text-secondary">
            Sign in to manage gateway credentials, inspect live memory, review diagnostics, and steer the console without
            exposing browser-side keys.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              {
                title: "Gateway relay",
                text: "Authenticated server-side access path for operational work."
              },
              {
                title: "Memory tools",
                text: "Inspect conversations, summaries, exports, and per-message memory controls."
              },
              {
                title: "Diagnostics",
                text: "Track provider health, readiness, and the latest internal checks."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <StatusDot tone="live" />
                  <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">{item.title}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-7 lg:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className={SECTION_LABEL_CLASS}>
                Username
              </label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className={SECTION_LABEL_CLASS}>
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="font-mono"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-neural-red/35 bg-neural-red/10 px-4 py-3 text-sm text-rose-100">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em]">{error.code || "login_error"}</p>
                <p className="mt-1 leading-relaxed">{error.message || "Invalid login."}</p>
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-neural-text-secondary">
                Use the credentials configured for your local console environment.
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting} className="w-full py-2.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
