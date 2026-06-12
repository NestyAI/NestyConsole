const SECRET_FIELD_PATTERN = /^(api[_-]?key|secret|token|password|authorization)$/i;

export function stripSecretFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripSecretFields(item)) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_FIELD_PATTERN.test(key)) {
      continue;
    }
    output[key] = stripSecretFields(nested);
  }
  return output as T;
}
