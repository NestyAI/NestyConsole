export type WorkspaceColor = "cyan" | "violet" | "green" | "amber" | "red" | "neutral";

export type WorkspaceNote = {
  id: string;
  title?: string;
  content: string;
  tags?: string[];
  pinned?: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceLinkedConversation = {
  id: string;
  label?: string;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  color?: WorkspaceColor;
  preferred_preset_id?: string;
  preferred_model?: string;
  preferred_search?: "auto" | "on" | "off";
  preferred_tools?: "auto" | "off";
  preferred_store?: boolean;
  preferred_semantic_recall?: "auto" | "on" | "off";
  system_prompt?: string;
  pinned_notes?: WorkspaceNote[];
  linked_conversation_ids?: string[];
  linked_conversations?: WorkspaceLinkedConversation[];
  memory_tags?: string[];
  created_at: string;
  updated_at: string;
};

const SECRET_LIKE_KEY_PATTERN =
  /^(.*)(key|token|secret|password|credential|auth|cookie|session|bearer)(.*)$/i;

export function makeWorkspaceId(): string {
  return `workspace-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

const STARTER_TEMPLATES: Array<Omit<Workspace, "id" | "created_at" | "updated_at">> = [
  {
    name: "NestyAI Gateway",
    description: "Backend proxy logic, routing rules, and diagnostics settings",
    color: "cyan",
    preferred_model: "nesty-pro-1.0",
    preferred_search: "auto",
    preferred_tools: "auto",
    preferred_store: true,
    preferred_semantic_recall: "auto",
    system_prompt: "You are an expert on the NestyAI Gateway backend architecture. Focus on backend proxy design and latency performance.",
    memory_tags: ["gateway", "proxy", "backend"],
    linked_conversation_ids: [],
    pinned_notes: [
      {
        id: "note-template-gateway-1",
        title: "Repository Overview",
        content: "NestyAI Gateway v1.2.4 supports advanced Pro orchestration, retrieval-augmented generation (RAG), and fallback routing.",
        pinned: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },
  {
    name: "Nesty Console",
    description: "Next.js App Router frontend dashboard configurations",
    color: "violet",
    preferred_model: "nesty-combined-1.0",
    preferred_search: "auto",
    preferred_tools: "auto",
    preferred_store: true,
    preferred_semantic_recall: "auto",
    system_prompt: "You are a Next.js App Router and Tailwind CSS expert. Help build clean interfaces following the Neural Noir design guidelines.",
    memory_tags: ["console", "nextjs", "frontend"],
    linked_conversation_ids: [],
    pinned_notes: [
      {
        id: "note-template-console-1",
        title: "Neural Noir Style Guide",
        content: "Fonts: Chakra Petch for titles, JetBrains Mono for code. Active states: electric cyan. Memory states: violet. Accents: green/amber/red.",
        pinned: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },
  {
    name: "KotNest",
    description: "Kotlin integrations and library development notes",
    color: "green",
    preferred_model: "nesty-combined-1.0",
    preferred_search: "auto",
    preferred_tools: "auto",
    preferred_store: true,
    preferred_semantic_recall: "auto",
    system_prompt: "You are an expert Kotlin engineer. Focus on clean architecture, idiomatic Kotlin coroutines, and API integrations.",
    memory_tags: ["kotnest", "kotlin", "android"],
    linked_conversation_ids: [],
    pinned_notes: []
  },
  {
    name: "Minecraft SMP",
    description: "Server rules, task lists, whitelist members, and plugins guide",
    color: "amber",
    preferred_model: "nesty-flash-1.0",
    preferred_search: "off",
    preferred_tools: "off",
    preferred_store: true,
    preferred_semantic_recall: "off",
    system_prompt: "You are a Minecraft server administrator. Keep plugin suggestions lightweight, and favor vanilla mechanics.",
    memory_tags: ["minecraft", "smp", "gaming"],
    linked_conversation_ids: [],
    pinned_notes: []
  },
  {
    name: "Design Assets",
    description: "Asset link listings, typography tokens, and style settings",
    color: "red",
    preferred_model: "nesty-combined-1.0",
    preferred_search: "auto",
    preferred_tools: "off",
    preferred_store: true,
    preferred_semantic_recall: "auto",
    system_prompt: "You are an experienced UI/UX designer. Guide visual layout decisions and CSS variables for maximum aesthetic balance.",
    memory_tags: ["design", "svg", "assets"],
    linked_conversation_ids: [],
    pinned_notes: []
  },
  {
    name: "Study",
    description: "Academic assignments, research references, and draft templates",
    color: "neutral",
    preferred_model: "nesty-pro-1.0",
    preferred_search: "auto",
    preferred_tools: "auto",
    preferred_store: true,
    preferred_semantic_recall: "auto",
    system_prompt: "You are a professional academic research assistant. Provide well-cited draft templates and clear outline summaries.",
    memory_tags: ["university", "study", "notes"],
    linked_conversation_ids: [],
    pinned_notes: []
  }
];

export type WorkspaceTemplate = Omit<Workspace, "id" | "created_at" | "updated_at">;

export function makeWorkspaceNoteId(): string {
  return `note-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function stripSecretLikeKeys(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return raw.map((item) => stripSecretLikeKeys(item));
  }
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const source = raw as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (SECRET_LIKE_KEY_PATTERN.test(key)) {
      continue;
    }
    cleaned[key] = stripSecretLikeKeys(value);
  }
  return cleaned;
}

export function normalizeWorkspaceLinkedConversation(raw: unknown): WorkspaceLinkedConversation | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : "";
  if (!id) {
    return null;
  }
  const label = typeof record.label === "string" ? record.label.trim() : undefined;
  const created_at = typeof record.created_at === "string" ? record.created_at : new Date().toISOString();
  const updated_at = typeof record.updated_at === "string" ? record.updated_at : new Date().toISOString();
  return { id, label: label || undefined, created_at, updated_at };
}

function mergeWorkspaceLinkedConversations(
  linkedConversations: WorkspaceLinkedConversation[],
  linkedConversationIds: string[]
): WorkspaceLinkedConversation[] {
  const byId = new Map<string, WorkspaceLinkedConversation>();
  const now = new Date().toISOString();

  for (const entry of linkedConversations) {
    if (!entry.id.trim()) {
      continue;
    }
    byId.set(entry.id, entry);
  }

  for (const conversationId of linkedConversationIds) {
    const trimmed = conversationId.trim();
    if (!trimmed || byId.has(trimmed)) {
      continue;
    }
    byId.set(trimmed, {
      id: trimmed,
      created_at: now,
      updated_at: now
    });
  }

  return Array.from(byId.values());
}

function syncLinkedConversationFields(workspace: Workspace): Workspace {
  const rich = (workspace.linked_conversations ?? [])
    .map((entry) => normalizeWorkspaceLinkedConversation(entry))
    .filter((entry): entry is WorkspaceLinkedConversation => entry !== null);
  const legacyIds = (workspace.linked_conversation_ids ?? [])
    .map((id) => id.trim())
    .filter(Boolean);

  const linked_conversations = mergeWorkspaceLinkedConversations(rich, legacyIds);
  const linked_conversation_ids = linked_conversations.map((entry) => entry.id);

  return {
    ...workspace,
    linked_conversations,
    linked_conversation_ids
  };
}

export function getWorkspaceLinkedConversations(workspace: Workspace): WorkspaceLinkedConversation[] {
  return syncLinkedConversationFields(workspace).linked_conversations ?? [];
}

export function workspaceHasLinkedConversation(workspace: Workspace, conversationId: string): boolean {
  const trimmed = conversationId.trim();
  if (!trimmed) {
    return false;
  }
  return getWorkspaceLinkedConversations(workspace).some((entry) => entry.id === trimmed);
}

export function addWorkspaceLinkedConversation(
  workspace: Workspace,
  conversationId: string,
  label?: string
): { linked_conversations: WorkspaceLinkedConversation[]; linked_conversation_ids: string[] } | null {
  const trimmedId = conversationId.trim();
  if (!trimmedId || workspaceHasLinkedConversation(workspace, trimmedId)) {
    return null;
  }

  const now = new Date().toISOString();
  const trimmedLabel = label?.trim() || undefined;
  const current = getWorkspaceLinkedConversations(workspace);
  const linked_conversations = [
    ...current,
    {
      id: trimmedId,
      label: trimmedLabel,
      created_at: now,
      updated_at: now
    }
  ];

  return {
    linked_conversations,
    linked_conversation_ids: linked_conversations.map((entry) => entry.id)
  };
}

export function removeWorkspaceLinkedConversation(
  workspace: Workspace,
  conversationId: string
): { linked_conversations: WorkspaceLinkedConversation[]; linked_conversation_ids: string[] } {
  const trimmedId = conversationId.trim();
  const linked_conversations = getWorkspaceLinkedConversations(workspace).filter(
    (entry) => entry.id !== trimmedId
  );
  return {
    linked_conversations,
    linked_conversation_ids: linked_conversations.map((entry) => entry.id)
  };
}

export function updateWorkspaceLinkedLabel(
  workspace: Workspace,
  conversationId: string,
  label: string
): { linked_conversations: WorkspaceLinkedConversation[]; linked_conversation_ids: string[] } | null {
  const trimmedId = conversationId.trim();
  const trimmedLabel = label.trim();
  const current = getWorkspaceLinkedConversations(workspace);
  const index = current.findIndex((entry) => entry.id === trimmedId);
  if (index === -1) {
    return null;
  }

  const linked_conversations = [...current];
  linked_conversations[index] = {
    ...linked_conversations[index],
    label: trimmedLabel || undefined,
    updated_at: new Date().toISOString()
  };

  return {
    linked_conversations,
    linked_conversation_ids: linked_conversations.map((entry) => entry.id)
  };
}

export function getWorkspaceTemplates(): WorkspaceTemplate[] {
  return [...STARTER_TEMPLATES];
}

export function normalizeWorkspaceNote(raw: unknown): WorkspaceNote | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : makeWorkspaceNoteId();
  const title = typeof r.title === "string" ? r.title.trim() : undefined;
  const content = typeof r.content === "string" ? r.content : "";
  const pinned = Boolean(r.pinned);
  
  const tags: string[] = [];
  if (Array.isArray(r.tags)) {
    for (const t of r.tags) {
      if (typeof t === "string" && t.trim()) {
        tags.push(t.trim());
      }
    }
  }

  const created_at = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
  const updated_at = typeof r.updated_at === "string" ? r.updated_at : new Date().toISOString();

  return { id, title, content, tags, pinned, created_at, updated_at };
}

export function normalizeWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : makeWorkspaceId();
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : "Untitled workspace";
  const description = typeof r.description === "string" ? r.description.trim() : undefined;
  
  const validColors = ["cyan", "violet", "green", "amber", "red", "neutral"] as const;
  const color = typeof r.color === "string" && (validColors as readonly string[]).includes(r.color)
    ? (r.color as Workspace["color"])
    : "neutral";

  const preferred_preset_id = typeof r.preferred_preset_id === "string" && r.preferred_preset_id.trim() ? r.preferred_preset_id.trim() : undefined;
  const preferred_model = typeof r.preferred_model === "string" && r.preferred_model.trim() ? r.preferred_model.trim() : undefined;
  
  const preferred_search = r.preferred_search === "on" || r.preferred_search === "off" || r.preferred_search === "auto" ? r.preferred_search : undefined;
  const preferred_tools = r.preferred_tools === "auto" || r.preferred_tools === "off" ? r.preferred_tools : undefined;
  
  const preferred_store = typeof r.preferred_store === "boolean" ? r.preferred_store : undefined;
  const preferred_semantic_recall = r.preferred_semantic_recall === "on" || r.preferred_semantic_recall === "off" || r.preferred_semantic_recall === "auto" ? r.preferred_semantic_recall : undefined;
  
  const system_prompt = typeof r.system_prompt === "string" ? r.system_prompt : undefined;

  const pinned_notes: WorkspaceNote[] = [];
  if (Array.isArray(r.pinned_notes)) {
    for (const note of r.pinned_notes) {
      const normalized = normalizeWorkspaceNote(note);
      if (normalized) {
        pinned_notes.push(normalized);
      }
    }
  }

  const linked_conversation_ids: string[] = [];
  if (Array.isArray(r.linked_conversation_ids)) {
    for (const cId of r.linked_conversation_ids) {
      if (typeof cId === "string" && cId.trim()) {
        linked_conversation_ids.push(cId.trim());
      }
    }
  }

  const linked_conversations: WorkspaceLinkedConversation[] = [];
  if (Array.isArray(r.linked_conversations)) {
    for (const entry of r.linked_conversations) {
      const normalized = normalizeWorkspaceLinkedConversation(entry);
      if (normalized) {
        linked_conversations.push(normalized);
      }
    }
  }

  const memory_tags: string[] = [];
  if (Array.isArray(r.memory_tags)) {
    for (const tag of r.memory_tags) {
      if (typeof tag === "string" && tag.trim()) {
        memory_tags.push(tag.trim());
      }
    }
  }

  const created_at = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
  const updated_at = typeof r.updated_at === "string" ? r.updated_at : new Date().toISOString();

  return syncLinkedConversationFields({
    id,
    name,
    description,
    color,
    preferred_preset_id,
    preferred_model,
    preferred_search,
    preferred_tools,
    preferred_store,
    preferred_semantic_recall,
    system_prompt,
    pinned_notes,
    linked_conversation_ids,
    linked_conversations,
    memory_tags,
    created_at,
    updated_at
  });
}

const WORKSPACES_STORAGE_KEY = "nesty-console.workspaces.v1";

export function loadWorkspacesResult(): { workspaces: Workspace[]; corrupted: boolean } {
  if (typeof window === "undefined") {
    return { workspaces: [], corrupted: false };
  }
  try {
    const raw = window.localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (!raw) {
      return { workspaces: [], corrupted: false };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { workspaces: [], corrupted: true };
    }
    return {
      workspaces: parsed
        .map(normalizeWorkspace)
        .filter((w): w is Workspace => w !== null),
      corrupted: false
    };
  } catch (err) {
    console.warn("Failed to load workspaces from localStorage:", err);
    return { workspaces: [], corrupted: true };
  }
}

export function getWorkspaces(): Workspace[] {
  return loadWorkspacesResult().workspaces;
}

export function saveWorkspaces(workspaces: Workspace[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const serialized = JSON.stringify(workspaces);
    window.localStorage.setItem(WORKSPACES_STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn("Failed to save workspaces to localStorage:", err);
    return false;
  }
}

export function getWorkspaceById(id: string): Workspace | null {
  const workspaces = getWorkspaces();
  return workspaces.find(w => w.id === id) || null;
}

export function createWorkspace(input: Omit<Workspace, "id" | "created_at" | "updated_at" | "pinned_notes" | "linked_conversation_ids">): Workspace {
  const list = getWorkspaces();
  const fresh: Workspace = {
    ...input,
    id: makeWorkspaceId(),
    pinned_notes: [],
    linked_conversation_ids: [],
    linked_conversations: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const normalized = normalizeWorkspace(fresh)!;
  list.push(normalized);
  saveWorkspaces(list);
  return normalized;
}

export function createWorkspaceFromTemplate(template: Omit<Workspace, "id" | "created_at" | "updated_at">): Workspace {
  const list = getWorkspaces();
  const now = new Date().toISOString();
  const clonedNotes = (template.pinned_notes ?? []).map((note) => ({
    ...note,
    id: makeWorkspaceNoteId(),
    created_at: now,
    updated_at: now
  }));
  const fresh: Workspace = {
    ...template,
    id: makeWorkspaceId(),
    pinned_notes: clonedNotes,
    linked_conversation_ids: [...(template.linked_conversation_ids ?? [])],
    linked_conversations: [...(template.linked_conversations ?? [])],
    memory_tags: [...(template.memory_tags ?? [])],
    created_at: now,
    updated_at: now
  };
  const normalized = normalizeWorkspace(fresh)!;
  list.push(normalized);
  saveWorkspaces(list);
  return normalized;
}

export function updateWorkspace(id: string, patch: Partial<Omit<Workspace, "id" | "created_at">>): Workspace | null {
  const list = getWorkspaces();
  const index = list.findIndex(w => w.id === id);
  if (index === -1) {
    return null;
  }

  const updated: Workspace = {
    ...list[index],
    ...patch,
    updated_at: new Date().toISOString()
  };
  const normalized = normalizeWorkspace(updated)!;
  list[index] = normalized;
  saveWorkspaces(list);
  return normalized;
}

export function deleteWorkspace(id: string): boolean {
  const list = getWorkspaces();
  const filtered = list.filter(w => w.id !== id);
  if (filtered.length === list.length) {
    return false;
  }
  saveWorkspaces(filtered);
  return true;
}
