import {
  type Workspace,
  getWorkspaces,
  makeWorkspaceId,
  makeWorkspaceNoteId,
  normalizeWorkspace,
  saveWorkspaces,
  stripSecretLikeKeys
} from "@/lib/workspaces/workspaces";

export type ImportWorkspacesResult = {
  added: number;
  skippedInvalid: number;
  regeneratedIds: number;
  error?: string;
};

export function exportWorkspacesJson(): string {
  return JSON.stringify(getWorkspaces(), null, 2);
}

function parseImportPayload(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.workspaces)) {
    return record.workspaces;
  }
  if (typeof record.name === "string" || typeof record.id === "string") {
    return [parsed];
  }
  return [];
}

function resolveImportCollisions(
  workspace: Workspace,
  existingWorkspaceIds: Set<string>,
  existingNoteIds: Set<string>
): { workspace: Workspace; regeneratedIds: number } {
  let regeneratedIds = 0;
  let next = workspace;

  if (existingWorkspaceIds.has(next.id)) {
    next = { ...next, id: makeWorkspaceId() };
    regeneratedIds += 1;
  }
  existingWorkspaceIds.add(next.id);

  const notes = (next.pinned_notes ?? []).map((note) => {
    if (existingNoteIds.has(note.id)) {
      regeneratedIds += 1;
      const freshId = makeWorkspaceNoteId();
      existingNoteIds.add(freshId);
      return { ...note, id: freshId };
    }
    existingNoteIds.add(note.id);
    return note;
  });

  return {
    workspace: { ...next, pinned_notes: notes },
    regeneratedIds
  };
}

export function importWorkspacesFromJson(rawJson: string): ImportWorkspacesResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      added: 0,
      skippedInvalid: 0,
      regeneratedIds: 0,
      error: "Invalid JSON. No workspaces were imported."
    };
  }

  const candidates = parseImportPayload(parsed);
  const existing = getWorkspaces();
  const existingWorkspaceIds = new Set(existing.map((workspace) => workspace.id));
  const existingNoteIds = new Set(
    existing.flatMap((workspace) => (workspace.pinned_notes ?? []).map((note) => note.id))
  );

  const imported: Workspace[] = [];
  let skippedInvalid = 0;
  let regeneratedIds = 0;

  for (const candidate of candidates) {
    const sanitized = stripSecretLikeKeys(candidate);
    const normalized = normalizeWorkspace(sanitized);
    if (!normalized) {
      skippedInvalid += 1;
      continue;
    }

    const resolved = resolveImportCollisions(normalized, existingWorkspaceIds, existingNoteIds);
    imported.push(resolved.workspace);
    regeneratedIds += resolved.regeneratedIds;
  }

  if (imported.length === 0) {
    return {
      added: 0,
      skippedInvalid,
      regeneratedIds: 0,
      error: "No valid workspaces found. No changes were saved."
    };
  }

  const merged = [...existing, ...imported];
  if (!saveWorkspaces(merged)) {
    return {
      added: 0,
      skippedInvalid,
      regeneratedIds: 0,
      error: "Failed to save imported workspaces."
    };
  }

  return {
    added: imported.length,
    skippedInvalid,
    regeneratedIds
  };
}
