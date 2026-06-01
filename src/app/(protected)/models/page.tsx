"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <section className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.08em] text-neural-text-primary">Models</h1>
          <p className="text-sm text-neural-text-secondary">Active model aliases exposed by NestyAI Gateway.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-neural-cyan/35 bg-neural-cyan/12 px-3 py-2 font-display text-xs uppercase tracking-[0.06em] text-neural-cyan transition hover:bg-neural-cyan/22"
        >
          <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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

      <div className="grid gap-3">
        {state.loading ? <LoadingBlock label="Loading models..." /> : null}

        {!state.loading && state.items.length === 0 && !state.error ? (
          <EmptyState title="No models returned." description="Gateway did not return active aliases yet." />
        ) : null}

        {state.items.map((model) => (
          <Panel key={model.id} accent="cyan">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TokenTag>{model.id}</TokenTag>
              <Badge variant="live">{model.config_source || "default"}</Badge>
            </div>
            <p className="mt-2 text-sm text-neural-text-secondary">{model.description || "No description provided."}</p>
            {model.notes ? <p className="mt-2 font-mono text-xs text-neural-text-muted">Notes: {model.notes}</p> : null}
          </Panel>
        ))}
      </div>
    </section>
  );
}
