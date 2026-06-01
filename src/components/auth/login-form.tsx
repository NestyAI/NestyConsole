"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, LockKeyhole } from "lucide-react";

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
    <div className="neural-panel w-full max-w-md rounded-2xl p-6 backdrop-blur">
      <div className="mb-5 flex justify-center">
        <Image src="/NestyAI_Full.svg" alt="Nesty Console" width={220} height={44} className="h-auto w-[220px]" />
      </div>
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg border border-neural-cyan/40 bg-neural-cyan/10 p-2">
          <LockKeyhole className="h-5 w-5 text-neural-cyan" />
        </div>
        <div>
          <h1 className="font-display text-xl uppercase tracking-[0.08em] text-neural-text-primary">Admin Login</h1>
          <p className="text-xs text-neural-text-secondary">Nesty Console secure access</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="font-display text-xs uppercase tracking-[0.06em] text-neural-text-secondary">
            Username
          </label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-neural-text-muted/30 bg-neural-input px-3 py-2 font-mono text-sm text-neural-text-primary outline-none ring-neural-cyan/40 focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="font-display text-xs uppercase tracking-[0.06em] text-neural-text-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-neural-text-muted/30 bg-neural-input px-3 py-2 font-mono text-sm text-neural-text-primary outline-none ring-neural-cyan/40 focus:ring"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            <p className="font-medium">{error.code || "login_error"}</p>
            <p>{error.message || "Invalid login."}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-2 font-display text-xs uppercase tracking-[0.08em] text-neural-cyan transition hover:bg-neural-cyan/24 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
}
