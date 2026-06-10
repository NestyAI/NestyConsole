export type ChatUrlParams = {
  workspaceId?: string | null;
  conversationId?: string | null;
  useWorkspaceContext?: boolean;
};

/** Builds `/chat` href with params in stable order: workspace, conversation, useWorkspaceContext. Empty values are omitted; values are URL-encoded via URLSearchParams. */
export function buildChatHref(params: ChatUrlParams = {}): string {
  const search = new URLSearchParams();
  const workspaceId = params.workspaceId?.trim();
  const conversationId = params.conversationId?.trim();

  if (workspaceId) {
    search.set("workspace", workspaceId);
  }
  if (conversationId) {
    search.set("conversation", conversationId);
  }
  if (params.useWorkspaceContext) {
    search.set("useWorkspaceContext", "1");
  }

  const query = search.toString();
  return query ? `/chat?${query}` : "/chat";
}

/** Resolves an absolute chat URL in the browser; falls back to the relative href when origin is unavailable. */
export function buildAbsoluteChatHref(params: ChatUrlParams = {}): string {
  const relative = buildChatHref(params);
  if (typeof window === "undefined") {
    return relative;
  }
  const origin = window.location?.origin?.trim();
  return origin ? `${origin}${relative}` : relative;
}

async function writeTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) {
    return false;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    if (typeof document === "undefined") {
      return false;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Copies a chat href to the clipboard using an absolute URL when possible. */
export async function copyChatHref(params: ChatUrlParams = {}): Promise<boolean> {
  return writeTextToClipboard(buildAbsoluteChatHref(params));
}
