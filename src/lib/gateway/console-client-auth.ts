import "server-only";

export function getConsoleClientAuthHeaders(): Record<string, string> {
  const secret = process.env.NESTY_CONSOLE_CLIENT_SECRET?.trim();
  if (!secret) {
    return {};
  }
  const id = process.env.NESTY_CONSOLE_CLIENT_ID?.trim() || "default-console";
  return {
    "X-Nesty-Console-ID": id,
    "X-Nesty-Console-Secret": secret
  };
}

export function isConsoleRuntimePath(path: string): boolean {
  return path.startsWith("/internal/console/runtime");
}
