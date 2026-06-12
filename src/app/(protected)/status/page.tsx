"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { StatusCard } from "@/components/status-card";
import { RequestIdTag } from "@/components/ui/request-id-tag";
import { StatusPill } from "@/components/ui/status-pill";
import { formatRateLimitHint, rateLimitFallbackMessage } from "@/lib/gateway/provider-error-parsers";
import type { GatewayHealthResponse, GatewayReadyResponse } from "@/lib/gateway/types";

type StatusError = {
  code?: string;
  message?: string;
  details?: {
    request_id?: string;
    retry_after_seconds?: number;
    rate_limit_reset_seconds?: number;
    rate_limit_reset_at?: string;
  };
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
        const errorPayload = healthPayload.error || readyPayload.error;
        setError({
          code: errorPayload?.code || "gateway_request_failed",
          message: errorPayload?.message || "Gateway request failed.",
          ...(errorPayload?.details && typeof errorPayload.details === "object"
            ? { details: errorPayload.details as StatusError["details"] }
            : {})
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
      error?.code === "invalid_gateway_api_key" ||
      error?.code === "api_key_revoked" ||
      error?.code === "credentials_not_configured" ||
      error?.code === "missing_api_key",
    [error]
  );
  const rateLimitHint = useMemo(() => {
    if (error?.code !== "gateway_rate_limited") {
      return undefined;
    }
    return formatRateLimitHint(error.details) || rateLimitFallbackMessage();
  }, [error]);

  return (
    <MotionPage>
      <PageHeader
        title="Gateway Status"
        description="Live health and readiness signals from the service and readiness paths."
        actions={
          <>
            <StatusPill tone={healthy ? "success" : "warning"}>{healthy ? "operational" : "attention"}</StatusPill>
            <Button
              type="button"
              onClick={() => void refresh(true)}
              variant="secondary"
              className="min-h-11"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

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
          {rateLimitHint ? <p className="mt-2 text-xs text-neural-text-secondary">{rateLimitHint}</p> : null}
          <RequestIdTag requestId={error.details?.request_id} />
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

      <Panel accent={healthy ? "green" : "amber"} className="p-6">
        <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
          Overall Signal
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neural-text-primary">
          {healthy ? "Healthy" : "Check gateway state"}
        </p>
      </Panel>
    </MotionPage>
  );
}
