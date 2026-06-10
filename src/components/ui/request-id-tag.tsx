import { TokenTag } from "@/components/ui/token-tag";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

function sanitizeRequestId(raw: string | undefined | null): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const candidate = raw.trim();
  if (!candidate || candidate.length > 64) {
    return undefined;
  }
  if (!SAFE_REQUEST_ID.test(candidate)) {
    return undefined;
  }
  return candidate;
}

type RequestIdTagProps = {
  requestId: string | undefined | null;
  className?: string;
};

export function RequestIdTag({ requestId, className }: RequestIdTagProps) {
  const safeId = sanitizeRequestId(requestId);
  if (!safeId) {
    return null;
  }

  return (
    <p className={`mt-2 text-xs text-neural-text-secondary ${className || ""}`.trim()}>
      Request ID: <TokenTag>{safeId}</TokenTag>
    </p>
  );
}
