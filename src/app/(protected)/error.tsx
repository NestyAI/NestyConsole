"use client";

import { RotateCcw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { TokenTag } from "@/components/ui/token-tag";

export default function ProtectedError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Panel tier="accent" accent="red" className="mx-auto max-w-3xl p-7 sm:p-9">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-neural-red/25 bg-neural-red/10 text-neural-red">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-neural-text-primary">
        This console view could not be loaded.
      </h1>
      <p className="mt-3 max-w-2xl text-pretty text-sm leading-7 text-neural-text-secondary">
        The error details were intentionally hidden. Retry the view, then use the digest below for server-side log correlation if the issue continues.
      </p>
      {error.digest ? (
        <div className="mt-5">
          <TokenTag>{error.digest}</TokenTag>
        </div>
      ) : null}
      <Button variant="primary" onClick={reset} className="mt-7">
        <RotateCcw className="size-4" aria-hidden="true" />
        Retry view
      </Button>
    </Panel>
  );
}
