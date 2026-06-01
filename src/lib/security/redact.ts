const SECRET_KEY_PATTERN = /(key|token|secret|password|auth|credential|bearer|cookie|session)/i;

export function isSecretLikeKey(key: string): boolean {
  const value = key.trim();
  if (!value) {
    return false;
  }
  return SECRET_KEY_PATTERN.test(value);
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (isSecretLikeKey(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = redactSecrets(entry);
    }
  }
  return output;
}

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(redactSecrets(value), null, 2);
  } catch {
    return "{}";
  }
}
