export type ChatPreset = {
  id: string;
  name: string;
  description?: string;
  model: string;
  search: "auto" | "on" | "off";
  tools: "auto" | "off";
  store: boolean;
  semantic_recall: "auto" | "on" | "off";
  stream: boolean;
  temperature?: number | null;
  max_tokens?: number | null;
  system_prompt?: string;
  is_builtin?: boolean;
  updated_at?: string;
};

const BUILTIN_PRESETS: ChatPreset[] = [
  {
    id: "builtin-fast-chat",
    name: "Fast Chat",
    description: "Low latency routing using nesty-flash-1.0",
    model: "nesty-flash-1.0",
    search: "auto",
    tools: "off",
    store: true,
    semantic_recall: "auto",
    stream: true,
    is_builtin: true
  },
  {
    id: "builtin-balanced",
    name: "Balanced",
    description: "Optimal orchestration using nesty-combined-1.0",
    model: "nesty-combined-1.0",
    search: "auto",
    tools: "auto",
    store: true,
    semantic_recall: "auto",
    stream: true,
    is_builtin: true
  },
  {
    id: "builtin-deep-pro",
    name: "Deep Pro",
    description: "Multi-model orchestration using nesty-pro-1.0",
    model: "nesty-pro-1.0",
    search: "auto",
    tools: "auto",
    store: true,
    semantic_recall: "auto",
    stream: true,
    is_builtin: true
  },
  {
    id: "builtin-coding-assistant",
    name: "Coding Assistant",
    description: "Code-focused development using nesty-pro-1.0",
    model: "nesty-pro-1.0",
    search: "auto",
    tools: "auto",
    store: true,
    semantic_recall: "auto",
    stream: true,
    system_prompt: "You are a careful coding assistant. Prefer small, safe changes, explain risks, and do not invent APIs.",
    is_builtin: true
  },
  {
    id: "builtin-vietnamese-helper",
    name: "Vietnamese Helper",
    description: "Respond in Vietnamese unless the user asks otherwise",
    model: "nesty-combined-1.0",
    search: "auto",
    tools: "auto",
    store: true,
    semantic_recall: "auto",
    stream: true,
    system_prompt: "Respond in Vietnamese unless the user asks otherwise.",
    is_builtin: true
  }
];

export function getBuiltInChatPresets(): ChatPreset[] {
  return [...BUILTIN_PRESETS];
}

export function getDefaultChatPreset(): ChatPreset {
  return BUILTIN_PRESETS[1]; // Balanced is default
}

export function normalizeChatPreset(raw: unknown): ChatPreset | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : `custom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : "Unnamed Preset";
  const description = typeof r.description === "string" ? r.description.trim() : undefined;
  
  const model = typeof r.model === "string" && r.model.trim() ? r.model.trim() : "nesty-combined-1.0";
  
  const search = r.search === "on" || r.search === "off" ? r.search : "auto";
  const tools = r.tools === "off" ? "off" : "auto";
  
  const store = r.store !== false;
  const semantic_recall = r.semantic_recall === "on" || r.semantic_recall === "off" ? r.semantic_recall : "auto";
  const stream = r.stream !== false;

  let temperature: number | null | undefined = undefined;
  if (typeof r.temperature === "number") {
    temperature = r.temperature;
  } else if (r.temperature === null) {
    temperature = null;
  }

  let max_tokens: number | null | undefined = undefined;
  if (typeof r.max_tokens === "number") {
    max_tokens = r.max_tokens;
  } else if (r.max_tokens === null) {
    max_tokens = null;
  }

  const system_prompt = typeof r.system_prompt === "string" ? r.system_prompt : undefined;
  const is_builtin = Boolean(r.is_builtin);
  const updated_at = typeof r.updated_at === "string" ? r.updated_at : undefined;

  return {
    id,
    name,
    description,
    model,
    search,
    tools,
    store,
    semantic_recall,
    stream,
    temperature,
    max_tokens,
    system_prompt,
    is_builtin,
    updated_at
  };
}

const PRESETS_STORAGE_KEY = "nesty-console.chat.presets.v1";

export function getCustomChatPresets(): ChatPreset[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeChatPreset)
      .filter((p): p is ChatPreset => p !== null && !p.is_builtin);
  } catch (err) {
    console.warn("Failed to load custom presets from localStorage:", err);
    return [];
  }
}

export function saveCustomChatPresets(presets: ChatPreset[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const customOnly = presets.filter(p => !p.is_builtin);
    const serialized = JSON.stringify(customOnly);
    window.localStorage.setItem(PRESETS_STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn("Failed to save custom presets to localStorage:", err);
    return false;
  }
}
