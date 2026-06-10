"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Pin, 
  ExternalLink, 
  X, 
  FolderKanban, 
  MessageSquare, 
  BookOpen, 
  Tag, 
  AlertTriangle 
} from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { TokenTag } from "@/components/ui/token-tag";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type Workspace,
  type WorkspaceColor,
  type WorkspaceNote,
  type WorkspaceTemplate,
  getWorkspaces,
  createWorkspace,
  createWorkspaceFromTemplate,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceTemplates,
  makeWorkspaceNoteId
} from "@/lib/workspaces/workspaces";
import { type ChatPreset, getBuiltInChatPresets, getCustomChatPresets } from "@/lib/chat/presets";

const PANEL_ACCENTS: Record<NonNullable<Workspace["color"]>, "cyan" | "violet" | "green" | "amber" | "red"> = {
  cyan: "cyan",
  violet: "violet",
  green: "green",
  amber: "amber",
  red: "red",
  neutral: "cyan"
};

const WORKSPACE_BADGE_VARIANTS: Record<
  NonNullable<Workspace["color"]>,
  "live" | "ai" | "success" | "warning" | "error" | "inactive"
> = {
  cyan: "live",
  violet: "ai",
  green: "success",
  amber: "warning",
  red: "error",
  neutral: "inactive"
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  
  // Note states
  const [showNoteEditor, setShowNoteEditor] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<WorkspaceNote | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");
  const [noteTags, setNoteTags] = useState<string>("");
  const [notePinned, setNotePinned] = useState<boolean>(false);

  // Form states
  const [formName, setFormName] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formColor, setFormColor] = useState<Workspace["color"]>("cyan");
  const [formPresetId, setFormPresetId] = useState<string>("");
  const [formModel, setFormModel] = useState<string>("");
  const [formSearch, setFormSearch] = useState<string>("");
  const [formTools, setFormTools] = useState<string>("");
  const [formStore, setFormStore] = useState<string>("");
  const [formSemanticRecall, setFormSemanticRecall] = useState<string>("");
  const [formPrompt, setFormPrompt] = useState<string>("");
  const [formTags, setFormTags] = useState<string>("");

  // Linked conversation ID state
  const [newConversationId, setNewConversationId] = useState<string>("");

  // Presets list
  const builtinPresets = getBuiltInChatPresets();
  const [customPresets, setCustomPresets] = useState<ChatPreset[]>([]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setWorkspaces(getWorkspaces());
    setCustomPresets(getCustomChatPresets());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const selectedWorkspace = workspaces.find(w => w.id === selectedId) || null;

  // Template instantiation helper
  const handleCreateFromTemplate = (template: WorkspaceTemplate) => {
    const fresh = createWorkspaceFromTemplate(template);
    const updated = getWorkspaces();
    setWorkspaces(updated);
    setSelectedId(fresh.id);
  };

  // Preset switch in form helper
  const handleFormPresetChange = (presetId: string) => {
    setFormPresetId(presetId);
    if (!presetId) return;
    
    const allPresets = [...builtinPresets, ...customPresets];
    const found = allPresets.find(p => p.id === presetId);
    if (found) {
      setFormModel(found.model);
      setFormSearch(found.search);
      setFormTools(found.tools);
      setFormStore(found.store ? "true" : "false");
      setFormSemanticRecall(found.semantic_recall);
      if (found.system_prompt) {
        setFormPrompt(found.system_prompt);
      }
    }
  };

  const openNewWorkspaceForm = () => {
    setEditingWorkspace(null);
    setFormName("");
    setFormDesc("");
    setFormColor("cyan");
    setFormPresetId("");
    setFormModel("");
    setFormSearch("");
    setFormTools("");
    setFormStore("");
    setFormSemanticRecall("");
    setFormPrompt("");
    setFormTags("");
    setShowEditor(true);
  };

  const openEditWorkspaceForm = (w: Workspace) => {
    setEditingWorkspace(w);
    setFormName(w.name);
    setFormDesc(w.description || "");
    setFormColor(w.color || "cyan");
    setFormPresetId(w.preferred_preset_id || "");
    setFormModel(w.preferred_model || "");
    setFormSearch(w.preferred_search || "");
    setFormTools(w.preferred_tools || "");
    setFormStore(w.preferred_store === undefined ? "" : (w.preferred_store ? "true" : "false"));
    setFormSemanticRecall(w.preferred_semantic_recall || "");
    setFormPrompt(w.system_prompt || "");
    setFormTags(w.memory_tags ? w.memory_tags.join(", ") : "");
    setShowEditor(true);
  };

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      return;
    }

    const tagsArr = formTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const storeBool = formStore === "" ? undefined : formStore === "true";

    const preferredSearch: Workspace["preferred_search"] =
      formSearch === "auto" || formSearch === "on" || formSearch === "off" ? formSearch : undefined;
    const preferredTools: Workspace["preferred_tools"] =
      formTools === "auto" || formTools === "off" ? formTools : undefined;
    const preferredSemanticRecall: Workspace["preferred_semantic_recall"] =
      formSemanticRecall === "auto" || formSemanticRecall === "on" || formSemanticRecall === "off"
        ? formSemanticRecall
        : undefined;

    const payload: Partial<Omit<Workspace, "id" | "created_at">> = {
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      color: formColor,
      preferred_preset_id: formPresetId || undefined,
      preferred_model: formModel || undefined,
      preferred_search: preferredSearch,
      preferred_tools: preferredTools,
      preferred_store: storeBool,
      preferred_semantic_recall: preferredSemanticRecall,
      system_prompt: formPrompt.trim() || undefined,
      memory_tags: tagsArr
    };

    if (editingWorkspace) {
      updateWorkspace(editingWorkspace.id, payload);
    } else {
      const fresh = createWorkspace({
        name: payload.name!,
        description: payload.description,
        color: payload.color,
        preferred_preset_id: payload.preferred_preset_id,
        preferred_model: payload.preferred_model,
        preferred_search: payload.preferred_search,
        preferred_tools: payload.preferred_tools,
        preferred_store: payload.preferred_store,
        preferred_semantic_recall: payload.preferred_semantic_recall,
        system_prompt: payload.system_prompt,
        memory_tags: tagsArr
      });
      setSelectedId(fresh.id);
    }

    setWorkspaces(getWorkspaces());
    setShowEditor(false);
    setEditingWorkspace(null);
  };

  const handleDeleteWorkspace = (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the workspace "${name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    
    deleteWorkspace(id);
    setWorkspaces(getWorkspaces());
    if (selectedId === id) {
      setSelectedId("");
    }
  };

  // Notes CRUD helpers
  const openNewNoteForm = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteTags("");
    setNotePinned(false);
    setShowNoteEditor(true);
  };

  const openEditNoteForm = (note: WorkspaceNote) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteContent(note.content);
    setNoteTags(note.tags ? note.tags.join(", ") : "");
    setNotePinned(Boolean(note.pinned));
    setShowNoteEditor(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !noteContent.trim()) return;

    const tagsArr = noteTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const freshNote: WorkspaceNote = {
      id: editingNote ? editingNote.id : makeWorkspaceNoteId(),
      title: noteTitle.trim() || undefined,
      content: noteContent,
      tags: tagsArr,
      pinned: notePinned,
      created_at: editingNote ? editingNote.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let updatedNotes = [...(selectedWorkspace.pinned_notes || [])];
    if (editingNote) {
      updatedNotes = updatedNotes.map(n => n.id === editingNote.id ? freshNote : n);
    } else {
      updatedNotes.push(freshNote);
    }

    updateWorkspace(selectedWorkspace.id, { pinned_notes: updatedNotes });
    setWorkspaces(getWorkspaces());
    setShowNoteEditor(false);
    setEditingNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!selectedWorkspace) return;
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this note? This cannot be undone."
    );
    if (!confirmed) return;

    const updatedNotes = (selectedWorkspace.pinned_notes || []).filter(n => n.id !== noteId);
    updateWorkspace(selectedWorkspace.id, { pinned_notes: updatedNotes });
    setWorkspaces(getWorkspaces());
  };

  const togglePinNote = (note: WorkspaceNote) => {
    if (!selectedWorkspace) return;
    const updatedNotes = (selectedWorkspace.pinned_notes || []).map(n => {
      if (n.id === note.id) {
        return { ...n, pinned: !n.pinned, updated_at: new Date().toISOString() };
      }
      return n;
    });
    updateWorkspace(selectedWorkspace.id, { pinned_notes: updatedNotes });
    setWorkspaces(getWorkspaces());
  };

  // Conversation Link helpers
  const handleLinkConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !newConversationId.trim()) return;

    const cId = newConversationId.trim();
    if (selectedWorkspace.linked_conversation_ids?.includes(cId)) {
      alert("This conversation is already linked.");
      return;
    }

    const updatedIds = [...(selectedWorkspace.linked_conversation_ids || []), cId];
    updateWorkspace(selectedWorkspace.id, { linked_conversation_ids: updatedIds });
    setWorkspaces(getWorkspaces());
    setNewConversationId("");
  };

  const handleUnlinkConversation = (cId: string) => {
    if (!selectedWorkspace) return;
    const confirmed = window.confirm(`Unlink conversation ID "${cId}" from workspace?`);
    if (!confirmed) return;

    const updatedIds = (selectedWorkspace.linked_conversation_ids || []).filter(id => id !== cId);
    updateWorkspace(selectedWorkspace.id, { linked_conversation_ids: updatedIds });
    setWorkspaces(getWorkspaces());
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-neural-text-primary sm:text-4xl">
            Workspace Memory Hub
          </h1>
          <p className="mt-1 text-sm text-neural-text-secondary">
            Organize local notes, system prompts, presets, and linked conversations by project. All data remains in local browser storage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewWorkspaceForm}
            className="inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition hover:bg-neural-cyan/22"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-neural-amber/20 bg-neural-amber/5 p-3 text-sm text-neural-amber">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Do not put secrets in workspace notes or prompts.</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        {/* Left pane: Workspace List */}
        <div className="space-y-4">
          <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Projects & Workspaces</h2>
          
          {workspaces.length === 0 ? (
            <EmptyState
              title="No workspaces active"
              description="Create a workspace manually or choose from starter templates below to begin organizing."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-1">
              {workspaces.map((w) => {
                const isSelected = w.id === selectedId;
                const noteCount = w.pinned_notes?.length || 0;
                const convCount = w.linked_conversation_ids?.length || 0;
                return (
                  <article
                    key={w.id}
                    onClick={() => setSelectedId(w.id)}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition hover:bg-white/[0.05] ${
                      isSelected 
                        ? "border-neural-cyan bg-neural-cyan/5 shadow-neural-glow" 
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    {/* Color Accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${
                      w.color === "cyan" ? "bg-neural-cyan" :
                      w.color === "violet" ? "bg-neural-violet" :
                      w.color === "green" ? "bg-neural-green" :
                      w.color === "amber" ? "bg-neural-amber" :
                      w.color === "red" ? "bg-neural-red" : "bg-neural-text-muted"
                    }`} />
                    
                    <div className="pl-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-semibold tracking-[-0.03em] text-neural-text-primary">
                          {w.name}
                        </h3>
                        <Badge variant={WORKSPACE_BADGE_VARIANTS[w.color || "cyan"]}>
                          {w.color || "cyan"}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-neural-text-secondary line-clamp-2 leading-relaxed">
                        {w.description || "No description configured."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-neural-text-muted font-mono">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {noteCount} Note{noteCount === 1 ? "" : "s"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {convCount} Conv{convCount === 1 ? "" : "s"}
                        </span>
                        <span className="ml-auto">
                          Updated: {new Date(w.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Starter templates */}
          <Panel accent="violet" className="p-4 space-y-3">
            <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Starter Templates</p>
            <p className="text-xs text-neural-text-secondary">Spawn starter contexts for common projects in the NestyAI ecosystem.</p>
            <div className="grid grid-cols-2 gap-2">
              {getWorkspaceTemplates().map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleCreateFromTemplate(t)}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-2 text-left text-xs text-neural-text-secondary transition hover:border-neural-cyan/30 hover:bg-white/[0.06] hover:text-neural-text-primary"
                >
                  <span className="font-display font-semibold block">{t.name}</span>
                  <span className="text-[10px] text-neural-text-muted mt-0.5 block line-clamp-1">{t.description}</span>
                  <span className="mt-1.5 inline-block font-display text-[9px] uppercase tracking-[0.08em] text-neural-cyan">
                    Create from Template
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right pane: Workspace Detail Panel */}
        <div className="space-y-4">
          <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Workspace Details</h2>

          {!selectedWorkspace ? (
            <Panel className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 bg-white/[0.01]">
              <FolderKanban className="h-10 w-10 text-neural-text-muted" />
              <h3 className="mt-4 text-base font-semibold text-neural-text-primary">No workspace selected</h3>
              <p className="mt-2 max-w-xs text-xs text-neural-text-muted leading-relaxed">
                Select an existing workspace from the left panel, create a new project, or clone a template to configure project notes, presets, and conversation logs.
              </p>
            </Panel>
          ) : (
            <Panel accent={PANEL_ACCENTS[selectedWorkspace.color || "cyan"]} className="p-5 sm:p-6 space-y-6">
              {/* Header with name and actions */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
                      {selectedWorkspace.name}
                    </h3>
                    <Badge variant={WORKSPACE_BADGE_VARIANTS[selectedWorkspace.color || "cyan"]}>
                      {selectedWorkspace.color || "cyan"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-neural-text-secondary leading-relaxed">
                    {selectedWorkspace.description || "No description configured."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditWorkspaceForm(selectedWorkspace)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neural-text-secondary transition hover:border-neural-cyan/35 hover:text-neural-cyan"
                    title="Edit workspace parameters"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkspace(selectedWorkspace.id, selectedWorkspace.name)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neural-red/20 bg-neural-red/5 text-neural-text-secondary transition hover:border-neural-red/40 hover:text-neural-red"
                    title="Delete workspace"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/chat?workspace=${selectedWorkspace.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan transition hover:bg-neural-cyan/25"
                  >
                    Open Chat
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Memory tags */}
              {selectedWorkspace.memory_tags && selectedWorkspace.memory_tags.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Memory Isolation Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedWorkspace.memory_tags.map(tag => (
                      <TokenTag key={tag} className="border-neural-violet/20 bg-neural-violet/5 text-violet-200">
                        {tag}
                      </TokenTag>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Summary */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
                <h4 className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Workspace Chat Config Override</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Preferred Preset</span>
                    <span className="font-medium text-neural-text-primary">
                      {(() => {
                        if (!selectedWorkspace.preferred_preset_id) return "None";
                        const found = [...builtinPresets, ...customPresets].find(p => p.id === selectedWorkspace.preferred_preset_id);
                        return found ? found.name : selectedWorkspace.preferred_preset_id;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Preferred Model</span>
                    <span className="font-mono text-neural-text-primary">{selectedWorkspace.preferred_model || "Default"}</span>
                  </div>
                  <div>
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Web Search</span>
                    <span className="font-mono text-neural-text-primary">{selectedWorkspace.preferred_search || "Default"}</span>
                  </div>
                  <div>
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Provider Tools</span>
                    <span className="font-mono text-neural-text-primary">{selectedWorkspace.preferred_tools || "Default"}</span>
                  </div>
                  <div>
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Store Chat Logs</span>
                    <span className="font-mono text-neural-text-primary">
                      {selectedWorkspace.preferred_store === undefined ? "Default" : (selectedWorkspace.preferred_store ? "Yes" : "No")}
                    </span>
                  </div>
                  <div>
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Semantic Recall</span>
                    <span className="font-mono text-neural-text-primary">{selectedWorkspace.preferred_semantic_recall || "Default"}</span>
                  </div>
                </div>

                {selectedWorkspace.system_prompt && (
                  <div className="border-t border-white/5 pt-3 space-y-1.5">
                    <span className="text-neural-text-muted block text-[10px] uppercase tracking-[0.06em]">Project System Instruction</span>
                    <p className="font-mono text-xs bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-neural-text-secondary leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {selectedWorkspace.system_prompt}
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Conversations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Linked Conversations ({selectedWorkspace.linked_conversation_ids?.length || 0})</h4>
                </div>

                <form onSubmit={handleLinkConversation} className="flex gap-2">
                  <input
                    type="text"
                    value={newConversationId}
                    onChange={(e) => setNewConversationId(e.target.value)}
                    placeholder="Enter Gateway Conversation UUID to link"
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary hover:border-neural-cyan/40 hover:text-neural-cyan transition"
                  >
                    Link ID
                  </button>
                </form>

                {selectedWorkspace.linked_conversation_ids && selectedWorkspace.linked_conversation_ids.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                    {selectedWorkspace.linked_conversation_ids.map(cId => (
                      <div key={cId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                        <TokenTag className="max-w-[calc(100%-2rem)] truncate font-mono text-[10px]">
                          {cId}
                        </TokenTag>
                        <button
                          type="button"
                          onClick={() => handleUnlinkConversation(cId)}
                          className="text-neural-text-muted hover:text-neural-red transition"
                          title="Unlink conversation ID"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neural-text-muted italic">No linked conversations yet.</p>
                )}
              </div>

              {/* Workspace notes */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">
                    Project Notes ({selectedWorkspace.pinned_notes?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={openNewNoteForm}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-display text-[9px] uppercase tracking-[0.08em] text-neural-text-secondary hover:border-neural-cyan/35 hover:text-neural-cyan transition"
                  >
                    <Plus className="h-3 w-3" />
                    Add Note
                  </button>
                </div>

                {selectedWorkspace.pinned_notes && selectedWorkspace.pinned_notes.length > 0 ? (
                  <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedWorkspace.pinned_notes.map((note) => (
                      <article 
                        key={note.id} 
                        className={`rounded-2xl border p-3.5 space-y-2 relative group ${
                          note.pinned 
                            ? "border-neural-cyan/30 bg-neural-cyan/[0.02]" 
                            : "border-white/5 bg-white/[0.01]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h5 className="font-display text-sm font-semibold tracking-[-0.02em] text-neural-text-primary flex items-center gap-1.5">
                            {note.title || "Untitled Note"}
                            {note.pinned && <Badge variant="live" className="text-[9px] px-1.5 py-0">pinned</Badge>}
                          </h5>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => togglePinNote(note)}
                              className={`p-1 rounded transition ${note.pinned ? "text-neural-cyan hover:text-neural-text-muted" : "text-neural-text-muted hover:text-neural-cyan"}`}
                              title={note.pinned ? "Unpin Note" : "Pin Note (Includes note content in chat context)"}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditNoteForm(note)}
                              className="p-1 text-neural-text-muted hover:text-neural-cyan transition"
                              title="Edit Note"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 text-neural-text-muted hover:text-neural-red transition"
                              title="Delete Note"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-neural-text-secondary leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {note.content}
                        </p>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-0.5 rounded border border-white/5 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-mono text-neural-text-muted">
                                <Tag className="h-2 w-2" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neural-text-muted italic">No notes created for this workspace.</p>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Editor Modal/Form overlay for Workspace Config */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neural-void/80 p-4 backdrop-blur-sm">
          <Panel className="w-full max-w-xl p-6 space-y-4 border border-white/10 bg-neural-elevated shadow-neural-soft max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <h3 className="font-display text-base font-semibold text-neural-text-primary">
                {editingWorkspace ? "Edit Workspace Settings" : "Configure New Workspace"}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="text-neural-text-secondary hover:text-neural-cyan transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkspace} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 rounded-2xl border border-neural-amber/20 bg-neural-amber/5 p-3 text-neural-amber">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Do not put secrets in workspace notes or prompts. Workspace configurations remain local to this browser session.</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-neural-text-secondary">
                  <span>Workspace Name *</span>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Minecraft SMP"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                  />
                </label>
                <label className="block space-y-1 text-neural-text-secondary">
                  <span>Color Theme Accent</span>
                  <select
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value as WorkspaceColor)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                  >
                    <option value="cyan">Cyan</option>
                    <option value="violet">Violet</option>
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="red">Red</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1 text-neural-text-secondary">
                <span>Description</span>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Summarize project context or purpose"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                />
              </label>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <p className="font-display font-semibold text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">Chat Interface Overrides</p>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Preferred Chat Preset</span>
                    <select
                      value={formPresetId}
                      onChange={(e) => handleFormPresetChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                    >
                      <option value="">-- No Preset Override --</option>
                      <optgroup label="Built-in Presets">
                        {builtinPresets.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                      {customPresets.length > 0 && (
                        <optgroup label="Custom Presets">
                          {customPresets.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </label>

                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Preferred Model Override</span>
                    <select
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                    >
                      <option value="">Default (No Override)</option>
                      <option value="nesty-flash-1.0">nesty-flash-1.0</option>
                      <option value="nesty-combined-1.0">nesty-combined-1.0</option>
                      <option value="nesty-pro-1.0">nesty-pro-1.0</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Search</span>
                    <select
                      value={formSearch}
                      onChange={(e) => setFormSearch(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                    >
                      <option value="">Default</option>
                      <option value="auto">auto</option>
                      <option value="on">on</option>
                      <option value="off">off</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Tools</span>
                    <select
                      value={formTools}
                      onChange={(e) => setFormTools(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                    >
                      <option value="">Default</option>
                      <option value="auto">auto</option>
                      <option value="off">off</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Store Logs</span>
                    <select
                      value={formStore}
                      onChange={(e) => setFormStore(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                    >
                      <option value="">Default</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Semantic Recall</span>
                    <select
                      value={formSemanticRecall}
                      onChange={(e) => setFormSemanticRecall(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                    >
                      <option value="">Default</option>
                      <option value="auto">auto</option>
                      <option value="on">on</option>
                      <option value="off">off</option>
                    </select>
                  </label>
                </div>
              </div>

              <label className="block space-y-1 text-neural-text-secondary">
                <span>Memory Tags (Comma-separated)</span>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. console, main-thread, operator"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                />
              </label>

              <label className="block space-y-1 text-neural-text-secondary">
                <span>Custom System Instructions</span>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  rows={4}
                  placeholder="Configure custom behavior instructions for this workspace"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                />
              </label>

              <div className="flex gap-2 justify-end border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan hover:bg-neural-cyan/25 transition"
                >
                  Save Workspace
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* Editor Modal for Project Notes */}
      {showNoteEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neural-void/80 p-4 backdrop-blur-sm">
          <Panel className="w-full max-w-md p-6 space-y-4 border border-white/10 bg-neural-elevated shadow-neural-soft">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <h3 className="font-display text-base font-semibold text-neural-text-primary">
                {editingNote ? "Edit Project Note" : "Create New Note"}
              </h3>
              <button
                type="button"
                onClick={() => setShowNoteEditor(false)}
                className="text-neural-text-secondary hover:text-neural-cyan transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 rounded-2xl border border-neural-amber/20 bg-neural-amber/5 p-3 text-neural-amber">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Do not put secrets in workspace notes or prompts.</span>
              </div>

              <label className="block space-y-1 text-neural-text-secondary">
                <span>Note Title</span>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Whitelist commands"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                />
              </label>

              <label className="block space-y-1 text-neural-text-secondary">
                <span>Content *</span>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                  rows={6}
                  placeholder="Type note content. Pinned notes are transiently sent as context to NestyChat."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                />
              </label>

              <label className="block space-y-1 text-neural-text-secondary">
                <span>Note Tags (Comma-separated)</span>
                <input
                  type="text"
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  placeholder="e.g. plugins, player-list"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-neural-text-secondary">
                <input
                  type="checkbox"
                  checked={notePinned}
                  onChange={(e) => setNotePinned(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-white/[0.03]"
                />
                <span>Pin note (transiently injected in workspace chat context)</span>
              </label>

              <div className="flex gap-2 justify-end border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNoteEditor(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary hover:border-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-4 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan hover:bg-neural-cyan/25 transition"
                >
                  Save Note
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}
    </section>
  );
}
