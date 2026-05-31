"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900/80 p-6 shadow-2xl backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg border border-cyan-300/40 bg-cyan-400/10 p-2">
          <LockKeyhole className="h-5 w-5 text-cyan-200" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Admin Login</h1>
          <p className="text-xs text-slate-400">Nesty Console secure access</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm text-slate-300">
            Username
          </label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-surface-950/80 px-3 py-2 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-surface-950/80 px-3 py-2 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
}
