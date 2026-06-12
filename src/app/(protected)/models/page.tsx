"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
import { Panel } from "@/components/ui/panel";
import { TokenTag } from "@/components/ui/token-tag";
import type { GatewayModel, GatewayModelsResponse } from "@/lib/gateway/types";

type ModelsState = {
  items: GatewayModel[];
  loading: boolean;
  error: { code?: string; message: string } | null;
};

export default function ModelsPage() {
  const [state, setState] = useState<ModelsState>({
    items: [],
    loading: true,
    error: null
  });

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }
    try {
      const response = await fetch("/api/gateway/models", { cache: "no-store" });
      const payload = (await response.json()) as GatewayModelsResponse & {
        error?: { code?: string; message?: string };
      };

      if (!response.ok) {
        setState({
          items: [],
          loading: false,
          error: {
            code: payload.error?.code,
            message: payload.error?.message || "Unable to load models from gateway."
          }
        });
        return;
      }

      setState({
        items: Array.isArray(payload.data) ? payload.data : [],
        loading: false,
        error: null
      });
    } catch {
      setState({
        items: [],
        loading: false,
        error: {
          code: "gateway_unreachable",
          message: "Gateway is unavailable or unreachable from Nesty Console."
        }
      });
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await refresh(false);
    };
    void run();
  }, [refresh]);

  return (
    <MotionPage>
      <PageHeader
        title="Models"
        description={
          <>
            Active aliases published by NestyAI Gateway. External <code className="font-mono text-xs">/v1/models</code>{" "}
            responses may be filtered by an API key&apos;s allowlist.
          </>
        }
        actions={
          <Button
            type="button"
            onClick={() => void refresh(true)}
            variant="secondary"
            className="min-h-11"
          >
            <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {state.error ? (
        <ErrorBanner code={state.error.code || "gateway_error"} message={state.error.message}>
          {state.error.code === "invalid_api_key" ||
          state.error.code === "credentials_not_configured" ||
          state.error.code === "missing_api_key" ? (
            <p>
              Gateway API key is invalid or expired. Update credentials in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
        </ErrorBanner>
      ) : null}

      <div className="grid gap-4">
        {state.loading ? <LoadingBlock label="Loading models..." /> : null}

        {!state.loading && state.items.length === 0 && !state.error ? (
          <EmptyState title="No models returned." description="Gateway did not return active aliases yet." />
        ) : null}

        {state.items.map((model) => (
          <Panel key={model.id} tier="raised" accent="cyan" className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TokenTag>{model.id}</TokenTag>
              <Badge variant="live">{model.config_source || "default"}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neural-text-secondary">{model.description || "No description provided."}</p>
            {model.notes ? <p className="mt-3 font-mono text-xs text-neural-text-muted">Notes: {model.notes}</p> : null}
          </Panel>
        ))}
      </div>
    </MotionPage>
  );
}
