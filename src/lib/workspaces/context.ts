import type { Workspace } from "@/lib/workspaces/workspaces";

export const WORKSPACE_CONTEXT_CHAR_CAP = 4000;

const TRUNCATION_SUFFIX = "\n\n[Workspace context truncated at 4000 characters.]";

export type WorkspaceContextResult = {
  text: string;
  truncated: boolean;
};

export type WorkspaceContextMeta = WorkspaceContextResult & {
  charCount: number;
  hasSystemPrompt: boolean;
  pinnedNotesCount: number;
  memoryTagsCount: number;
};

export function buildWorkspaceContext(workspace: Workspace): WorkspaceContextResult {
  const parts: string[] = [];

  parts.push(`[Workspace: ${workspace.name}]`);

  const systemPrompt = workspace.system_prompt?.trim();
  if (systemPrompt) {
    parts.push(`System instruction:\n${systemPrompt}`);
  }

  const pinnedNotes = (workspace.pinned_notes ?? []).filter(
    (note) => note.pinned && note.content.trim()
  );
  if (pinnedNotes.length > 0) {
    parts.push("Pinned notes:");
    for (const note of pinnedNotes) {
      const title = note.title?.trim() ? `${note.title.trim()}: ` : "";
      parts.push(`- ${title}${note.content.trim()}`);
    }
  }

  const tags = (workspace.memory_tags ?? []).filter((tag) => tag.trim());
  if (tags.length > 0) {
    parts.push(`Memory tags: ${tags.join(", ")}`);
  }

  let text = parts.join("\n\n");
  let truncated = false;

  if (text.length > WORKSPACE_CONTEXT_CHAR_CAP) {
    const maxBody = WORKSPACE_CONTEXT_CHAR_CAP - TRUNCATION_SUFFIX.length;
    text = text.slice(0, Math.max(0, maxBody)) + TRUNCATION_SUFFIX;
    truncated = true;
  }

  return { text, truncated };
}

export function getWorkspaceContextMeta(workspace: Workspace): WorkspaceContextMeta {
  const { text, truncated } = buildWorkspaceContext(workspace);
  const pinnedNotesCount = (workspace.pinned_notes ?? []).filter(
    (note) => note.pinned && note.content.trim()
  ).length;
  const memoryTagsCount = (workspace.memory_tags ?? []).filter((tag) => tag.trim()).length;

  return {
    text,
    truncated,
    charCount: text.length,
    hasSystemPrompt: Boolean(workspace.system_prompt?.trim()),
    pinnedNotesCount,
    memoryTagsCount
  };
}
