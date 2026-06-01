"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { LoadingBlock } from "@/components/ui/loading-block";
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Models</h1>
          <p className="text-sm text-slate-300">Active model aliases exposed by NestyAI Gateway.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
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
          <article key={model.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-white">{model.id}</h2>
              <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-xs text-cyan-200">
                {model.config_source || "default"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{model.description || "No description provided."}</p>
            {model.notes ? <p className="mt-2 text-xs text-slate-400">Notes: {model.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
