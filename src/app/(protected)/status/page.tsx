"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { StatusCard } from "@/components/status-card";
import type { GatewayHealthResponse, GatewayReadyResponse } from "@/lib/gateway/types";

type StatusError = {
  code?: string;
  message?: string;
};

export default function StatusPage() {
  const [health, setHealth] = useState<GatewayHealthResponse | null>(null);
  const [ready, setReady] = useState<GatewayReadyResponse | null>(null);
  const [error, setError] = useState<StatusError | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const [healthRes, readyRes] = await Promise.all([
        fetch("/api/gateway/health", { cache: "no-store" }),
        fetch("/api/gateway/ready", { cache: "no-store" })
      ]);

      const healthPayload = (await healthRes.json()) as GatewayHealthResponse & { error?: StatusError };
      const readyPayload = (await readyRes.json()) as GatewayReadyResponse & { error?: StatusError };

      if (!healthRes.ok || !readyRes.ok) {
        setError({
          code: healthPayload.error?.code || readyPayload.error?.code || "gateway_request_failed",
          message: healthPayload.error?.message || readyPayload.error?.message || "Gateway request failed."
        });
        setHealth(null);
        setReady(null);
        return;
      }

      setHealth(healthPayload);
      setReady(readyPayload);
    } catch {
      setError({
        code: "gateway_unreachable",
        message: "Gateway is unavailable or unreachable from Nesty Console."
      });
      setHealth(null);
      setReady(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await refresh(false);
    };
    void run();
  }, [refresh]);

  const healthy = useMemo(
    () => health?.status?.toLowerCase() === "ok" && ready?.status?.toLowerCase() === "ready",
    [health, ready]
  );
  const credentialError = useMemo(
    () =>
      error?.code === "invalid_api_key" ||
      error?.code === "credentials_not_configured" ||
      error?.code === "missing_api_key",
    [error]
  );

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl uppercase tracking-[0.08em] text-neural-text-primary">Gateway Status</h1>
            <Badge variant={healthy ? "success" : "warning"} withDot>
              {healthy ? "operational" : "attention"}
            </Badge>
          </div>
          <p className="text-sm text-neural-text-secondary">Live gateway health and readiness overview.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-neural-cyan/35 bg-neural-cyan/12 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-cyan transition hover:bg-neural-cyan/22"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <ErrorBanner code={error.code || "gateway_error"} message={error.message || "Unexpected gateway error."}>
          {credentialError ? (
            <p>
              Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from
              Gateway startup logs and update it at{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
        </ErrorBanner>
      ) : null}

      {loading ? <LoadingBlock label="Loading gateway health and readiness..." /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <StatusCard
          label="Health"
          value={health?.status || (loading ? "Loading..." : "Unavailable")}
          healthy={health?.status?.toLowerCase() === "ok"}
          details={`service=${health?.service || "-"} version=${health?.version || "-"}`}
        />
        <StatusCard
          label="Readiness"
          value={ready?.status || (loading ? "Loading..." : "Unavailable")}
          healthy={ready?.status?.toLowerCase() === "ready"}
          details={`api_version=${ready?.api_version || "-"} database=${ready?.database || "-"}`}
        />
      </div>

      <Panel accent={healthy ? "green" : "amber"}>
        <p className="font-display text-xs uppercase tracking-[0.08em] text-neural-text-secondary">
          Overall Signal
        </p>
        <p className="mt-1 text-sm text-neural-text-primary">{healthy ? "Healthy" : "Check gateway state"}</p>
      </Panel>
    </section>
  );
}
