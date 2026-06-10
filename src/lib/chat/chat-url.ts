export type ChatUrlParams = {
  workspaceId?: string | null;
  conversationId?: string | null;
  useWorkspaceContext?: boolean;
};

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
