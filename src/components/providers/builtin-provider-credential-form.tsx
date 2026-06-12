"use client";

import { FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SecretStatusBadge } from "@/components/ui/secret-status-badge";
import type { BuiltinProviderCapability } from "@/lib/builtin-providers/types";

export type BuiltinCredentialFormState = {
  apiKey: string;
};

export const EMPTY_BUILTIN_CREDENTIAL_FORM: BuiltinCredentialFormState = {
  apiKey: ""
};

type BuiltinProviderCredentialFormProps = {
  provider: BuiltinProviderCapability;
  form: BuiltinCredentialFormState;
  onChange: (next: BuiltinCredentialFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onRotate?: (event: FormEvent) => void;
  onDeleteManaged?: () => void;
  disabled?: boolean;
  saving?: boolean;
  rotating?: boolean;
  deleting?: boolean;
};

function credentialSourceLabel(source: string | undefined): string {
  const normalized = String(source || "missing").trim().toLowerCase();
  if (normalized === "managed_store") return "Managed store";
  if (normalized === "secret_file") return "Secret file";
  if (normalized === "env") return "Environment";
  return normalized || "Unknown";
}

export function BuiltinProviderCredentialForm({
  provider,
  form,
  onChange,
  onSubmit,
  onRotate,
  onDeleteManaged,
  disabled,
  saving,
  rotating,
  deleting
}: BuiltinProviderCredentialFormProps) {
  const providerType =
    String(provider.provider_type || "").trim().toLowerCase() === "native"
      ? "Native adapter"
      : "OpenAI-compatible";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-neural-text-secondary">
        <p>
          Provider API keys are stored by Gateway. Console never shows saved secrets after save.
        </p>
        <p className="mt-2">
          If managed credentials are disabled on Gateway, environment credentials remain active.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neural-text-muted">Provider type</p>
          <p className="mt-1 text-sm text-neural-text-primary">{providerType}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neural-text-muted">Credential source</p>
          <p className="mt-1 text-sm text-neural-text-primary">
            {credentialSourceLabel(provider.credential_source)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neural-text-muted">Secret status</p>
          <div className="mt-1">
            <SecretStatusBadge status={provider.secret_status} />
          </div>
        </div>
        {provider.api_key_env_name ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neural-text-muted">Env variable</p>
            <p className="mt-1 font-mono text-xs text-neural-text-primary">{provider.api_key_env_name}</p>
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="API key" hint="Password field only. Never prefilled. Cleared after save.">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.apiKey}
            disabled={disabled || saving || rotating}
            onChange={(event) => onChange({ apiKey: event.target.value })}
            placeholder="Paste provider API key"
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={disabled || saving || !form.apiKey.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save API key"}
          </Button>
          {onRotate ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || rotating || !form.apiKey.trim()}
              onClick={onRotate}
            >
              {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rotate key"}
            </Button>
          ) : null}
          {onDeleteManaged ? (
            <Button type="button" variant="danger" disabled={disabled || deleting} onClick={onDeleteManaged}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete managed key"}
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
