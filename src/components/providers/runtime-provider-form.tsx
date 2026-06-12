"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import type {
  RuntimeOpenAIProviderCreateBody,
  RuntimeOpenAIProviderUpdateBody
} from "@/lib/runtime-providers/types";

export type ProviderFormState = {
  provider_id: string;
  display_name: string;
  base_url: string;
  chat_completions_path: string;
  models_path: string;
  api_key_mode: "env" | "secret_file" | "none";
  api_key_env_name: string;
  api_key: string;
  default_timeout_seconds: string;
  supports_streaming: boolean;
  supports_json_mode: boolean;
  supports_tools: boolean;
  supports_reasoning_effort: boolean;
  health_check_model: string;
  enabled: boolean;
};

export const EMPTY_PROVIDER_FORM: ProviderFormState = {
  provider_id: "",
  display_name: "",
  base_url: "",
  chat_completions_path: "/v1/chat/completions",
  models_path: "",
  api_key_mode: "env",
  api_key_env_name: "",
  api_key: "",
  default_timeout_seconds: "60",
  supports_streaming: true,
  supports_json_mode: true,
  supports_tools: true,
  supports_reasoning_effort: false,
  health_check_model: "",
  enabled: true
};

export function formStateFromDetail(
  provider: Record<string, unknown>,
  providerId: string
): ProviderFormState {
  return {
    provider_id: providerId,
    display_name: String(provider.display_name || providerId),
    base_url: String(provider.base_url || ""),
    chat_completions_path: String(provider.chat_completions_path || "/v1/chat/completions"),
    models_path: String(provider.models_path || ""),
    api_key_mode: (String(provider.api_key_mode || "env") as ProviderFormState["api_key_mode"]) || "env",
    api_key_env_name: String(provider.api_key_env_name || ""),
    api_key: "",
    default_timeout_seconds: String(provider.default_timeout_seconds ?? 60),
    supports_streaming: provider.supports_streaming !== false,
    supports_json_mode: provider.supports_json_mode !== false,
    supports_tools: provider.supports_tools !== false,
    supports_reasoning_effort: provider.supports_reasoning_effort === true,
    health_check_model: String(provider.health_check_model || ""),
    enabled: provider.enabled !== false
  };
}

function sharedPayloadFields(form: ProviderFormState): Omit<
  RuntimeOpenAIProviderCreateBody,
  "provider_id" | "api_key" | "api_key_env_name"
> & {
  api_key_env_name?: string | null;
  api_key?: string | null;
} {
  const payload: ReturnType<typeof sharedPayloadFields> = {
    display_name: form.display_name.trim(),
    base_url: form.base_url.trim(),
    chat_completions_path: form.chat_completions_path.trim() || "/v1/chat/completions",
    models_path: form.models_path.trim() || null,
    api_key_mode: form.api_key_mode,
    default_timeout_seconds: Number(form.default_timeout_seconds) || 60,
    supports_streaming: form.supports_streaming,
    supports_json_mode: form.supports_json_mode,
    supports_tools: form.supports_tools,
    supports_reasoning_effort: form.supports_reasoning_effort,
    health_check_model: form.health_check_model.trim() || null,
    enabled: form.enabled
  };

  if (form.api_key_mode === "env") {
    payload.api_key_env_name = form.api_key_env_name.trim() || null;
  } else {
    payload.api_key_env_name = null;
  }

  if (form.api_key_mode === "secret_file" && form.api_key.trim()) {
    payload.api_key = form.api_key.trim();
  }

  return payload;
}

export function buildCreatePayload(form: ProviderFormState): RuntimeOpenAIProviderCreateBody {
  const shared = sharedPayloadFields(form);
  return {
    provider_id: form.provider_id.trim(),
    ...shared
  };
}

export function buildUpdatePayload(form: ProviderFormState): RuntimeOpenAIProviderUpdateBody {
  return sharedPayloadFields(form);
}

type RuntimeProviderFormProps = {
  mode: "create" | "edit";
  form: ProviderFormState;
  onChange: (updater: (prev: ProviderFormState) => ProviderFormState) => void;
  disabled?: boolean;
};

function CapabilityToggle({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neural-text-secondary">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-white/20 bg-white/[0.04]"
      />
      {label}
    </label>
  );
}

export function RuntimeProviderForm({ mode, form, onChange, disabled }: RuntimeProviderFormProps) {
  const showEnvName = form.api_key_mode === "env";
  const showApiKey = form.api_key_mode === "secret_file";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {mode === "create" ? (
        <FormField label="provider_id" htmlFor="provider_id" required className="md:col-span-2">
          <Input
            id="provider_id"
            required
            disabled={disabled}
            value={form.provider_id}
            onChange={(event) => onChange((prev) => ({ ...prev, provider_id: event.target.value }))}
            placeholder="my-openai-proxy"
            className="font-mono text-xs"
          />
        </FormField>
      ) : null}

      <FormField label="display_name" htmlFor="display_name" required>
        <Input
          id="display_name"
          required
          disabled={disabled}
          value={form.display_name}
          onChange={(event) => onChange((prev) => ({ ...prev, display_name: event.target.value }))}
        />
      </FormField>

      <FormField label="default_timeout_seconds" htmlFor="default_timeout_seconds">
        <Input
          id="default_timeout_seconds"
          disabled={disabled}
          value={form.default_timeout_seconds}
          onChange={(event) => onChange((prev) => ({ ...prev, default_timeout_seconds: event.target.value }))}
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="base_url" htmlFor="base_url" required className="md:col-span-2">
        <Input
          id="base_url"
          required
          disabled={disabled}
          value={form.base_url}
          onChange={(event) => onChange((prev) => ({ ...prev, base_url: event.target.value }))}
          placeholder="https://api.example.com"
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="chat_completions_path" htmlFor="chat_completions_path">
        <Input
          id="chat_completions_path"
          disabled={disabled}
          value={form.chat_completions_path}
          onChange={(event) => onChange((prev) => ({ ...prev, chat_completions_path: event.target.value }))}
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="models_path" htmlFor="models_path" hint="Optional OpenAI-compatible models listing path.">
        <Input
          id="models_path"
          disabled={disabled}
          value={form.models_path}
          onChange={(event) => onChange((prev) => ({ ...prev, models_path: event.target.value }))}
          placeholder="/v1/models"
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="api_key_mode" htmlFor="api_key_mode">
        <Select
          id="api_key_mode"
          disabled={disabled}
          value={form.api_key_mode}
          onChange={(event) => {
            const nextMode = event.target.value as ProviderFormState["api_key_mode"];
            onChange((prev) => ({
              ...prev,
              api_key_mode: nextMode,
              api_key: "",
              api_key_env_name: nextMode === "env" ? prev.api_key_env_name : ""
            }));
          }}
          className="font-mono text-xs"
        >
          <option value="env">env</option>
          <option value="secret_file">secret_file</option>
          <option value="none">none</option>
        </Select>
      </FormField>

      {showEnvName ? (
        <FormField label="api_key_env_name" htmlFor="api_key_env_name">
          <Input
            id="api_key_env_name"
            disabled={disabled}
            value={form.api_key_env_name}
            onChange={(event) => onChange((prev) => ({ ...prev, api_key_env_name: event.target.value }))}
            placeholder="MY_PROVIDER_API_KEY"
            className="font-mono text-xs"
          />
        </FormField>
      ) : null}

      {showApiKey ? (
        <FormField
          label={mode === "edit" ? "Replace api_key" : "api_key"}
          htmlFor="api_key"
          hint="Transient in browser only. Never echoed by Console."
          className="md:col-span-2"
        >
          <Input
            id="api_key"
            type="password"
            disabled={disabled}
            value={form.api_key}
            onChange={(event) => onChange((prev) => ({ ...prev, api_key: event.target.value }))}
            placeholder={mode === "edit" ? "Leave blank to keep existing secret" : undefined}
            className="font-mono text-xs"
            autoComplete="off"
          />
        </FormField>
      ) : null}

      <FormField label="health_check_model" htmlFor="health_check_model">
        <Input
          id="health_check_model"
          disabled={disabled}
          value={form.health_check_model}
          onChange={(event) => onChange((prev) => ({ ...prev, health_check_model: event.target.value }))}
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="enabled" htmlFor="enabled">
        <Select
          id="enabled"
          disabled={disabled}
          value={form.enabled ? "true" : "false"}
          onChange={(event) => onChange((prev) => ({ ...prev, enabled: event.target.value === "true" }))}
          className="font-mono text-xs"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      </FormField>

      <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
        <CapabilityToggle
          label="supports_streaming"
          checked={form.supports_streaming}
          disabled={disabled}
          onChange={(checked) => onChange((prev) => ({ ...prev, supports_streaming: checked }))}
        />
        <CapabilityToggle
          label="supports_json_mode"
          checked={form.supports_json_mode}
          disabled={disabled}
          onChange={(checked) => onChange((prev) => ({ ...prev, supports_json_mode: checked }))}
        />
        <CapabilityToggle
          label="supports_tools"
          checked={form.supports_tools}
          disabled={disabled}
          onChange={(checked) => onChange((prev) => ({ ...prev, supports_tools: checked }))}
        />
        <CapabilityToggle
          label="supports_reasoning_effort"
          checked={form.supports_reasoning_effort}
          disabled={disabled}
          onChange={(checked) => onChange((prev) => ({ ...prev, supports_reasoning_effort: checked }))}
        />
      </div>
    </div>
  );
}
