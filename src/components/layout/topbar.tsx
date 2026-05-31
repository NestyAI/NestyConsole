import { getServerEnvStatus } from "@/lib/env";

export function Topbar() {
  const env = getServerEnvStatus();
  const envLabel = env.nodeEnv === "production" ? "PROD" : env.nodeEnv.toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-surface-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div>
          <p className="text-sm font-semibold text-white">{env.appName}</p>
          <p className="text-xs text-slate-400">Gateway control panel for NestyAI</p>
        </div>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {envLabel}
        </span>
      </div>
    </header>
  );
}
