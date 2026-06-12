"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Pin, 
  ExternalLink,
  Clipboard,
  X, 
  FolderKanban, 
  MessageSquare, 
  BookOpen, 
  Tag, 
  AlertTriangle 
} from "lucide-react";

import { MotionPage } from "@/components/motion/motion-page";
import { PageHeader } from "@/components/layout/page-header";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TokenTag } from "@/components/ui/token-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceActionButton } from "@/components/workspace/workspace-action-button";
import { WorkspaceBadge } from "@/components/workspace/workspace-badge";
import { WorkspaceColorBar } from "@/components/workspace/workspace-color-bar";
import { WorkspaceNotice } from "@/components/workspace/workspace-notice";
import { WorkspaceListMotion } from "@/components/workspace/workspace-list-motion";
import { WorkspaceNoticeMotion } from "@/components/workspace/workspace-notice-motion";
import { WorkspaceStatItem, WorkspaceStatStrip } from "@/components/workspace/workspace-stat-strip";
import { flashNoteCard } from "@/lib/motion/gsap-utils";
import {
  type Workspace,
  type WorkspaceColor,
  type WorkspaceLinkedConversation,
  type WorkspaceNote,
  type WorkspaceTemplate,
  addWorkspaceLinkedConversation,
  getWorkspaces,
  getWorkspaceLinkedConversations,
  createWorkspace,
  createWorkspaceFromTemplate,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceTemplates,
  makeWorkspaceNoteId,
  removeWorkspaceLinkedConversation,
  updateWorkspaceLinkedLabel
} from "@/lib/workspaces/workspaces";
import { buildChatHref, copyChatHref } from "@/lib/chat/chat-url";
import { exportWorkspacesJson, importWorkspacesFromJson } from "@/lib/workspaces/import-export";
import { type ChatPreset, getBuiltInChatPresets, getCustomChatPresets } from "@/lib/chat/presets";
import { PANEL_ACCENTS, WORKSPACE_FOCUS_RING, workspaceListCardClass } from "@/lib/workspaces/ui-tokens";

function sortNotesByUpdated(notes: WorkspaceNote[]): WorkspaceNote[] {
  return [...notes].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

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
  const [newConversationLabel, setNewConversationLabel] = useState<string>("");
  const [linkNotice, setLinkNotice] = useState<string>("");
  const [exportNotice, setExportNotice] = useState<string>("");
  const [importJson, setImportJson] = useState<string>("");
  const detailPanelRef = useRef<HTMLDivElement>(null);

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
    window.requestAnimationFrame(() => flashNoteCard(note.id, detailPanelRef.current));
  };

  // Conversation Link helpers
  const handleLinkConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !newConversationId.trim()) return;

    const linkedPatch = addWorkspaceLinkedConversation(
      selectedWorkspace,
      newConversationId,
      newConversationLabel
    );
    if (!linkedPatch) {
      setLinkNotice("This conversation is already linked.");
      return;
    }

    updateWorkspace(selectedWorkspace.id, linkedPatch);
    setWorkspaces(getWorkspaces());
    setNewConversationId("");
    setNewConversationLabel("");
    setLinkNotice("Conversation linked.");
  };

  const handleUnlinkConversation = (cId: string) => {
    if (!selectedWorkspace) return;
    const confirmed = window.confirm(`Unlink conversation ID "${cId}" from workspace?`);
    if (!confirmed) return;

    const linkedPatch = removeWorkspaceLinkedConversation(selectedWorkspace, cId);
    updateWorkspace(selectedWorkspace.id, linkedPatch);
    setWorkspaces(getWorkspaces());
    setLinkNotice("Conversation unlinked.");
  };

  const handleEditLinkedLabel = (entry: WorkspaceLinkedConversation) => {
    if (!selectedWorkspace) return;
    const nextLabel = window.prompt(
      "Edit local conversation label",
      entry.label || ""
    );
    if (nextLabel === null) return;

    const linkedPatch = updateWorkspaceLinkedLabel(selectedWorkspace, entry.id, nextLabel);
    if (!linkedPatch) return;

    updateWorkspace(selectedWorkspace.id, linkedPatch);
    setWorkspaces(getWorkspaces());
    setLinkNotice("Conversation label updated.");
  };

  const handleWorkspaceListKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }

    const buttons = event.currentTarget.parentElement?.querySelectorAll("button");
    if (!buttons?.length) {
      return;
    }

    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowDown") {
      nextIndex = Math.min(index + 1, buttons.length - 1);
    } else if (event.key === "ArrowUp") {
      nextIndex = Math.max(index - 1, 0);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    }

    (buttons[nextIndex] as HTMLButtonElement | undefined)?.focus();
  };

  const handleCopyLinkedConversationLink = async (workspaceId: string, conversationId: string) => {
    const copied = await copyChatHref({ workspaceId, conversationId });
    setLinkNotice(copied ? "Conversation link copied." : "Could not copy link.");
  };

  const handleCopyWorkspacesJson = async () => {
    const json = exportWorkspacesJson();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setExportNotice("Workspace JSON copied to clipboard.");
      } else {
        setExportNotice("Clipboard is not available in this browser.");
      }
    } catch {
      setExportNotice("Failed to copy workspace JSON.");
    }
  };

  const handleDownloadWorkspacesJson = () => {
    const json = exportWorkspacesJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nesty-console-workspaces.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setExportNotice("Workspace JSON downloaded.");
  };

  const handleImportWorkspacesJson = () => {
    const result = importWorkspacesFromJson(importJson);
    if (result.error) {
      setExportNotice(result.error);
      return;
    }

    setWorkspaces(getWorkspaces());
    setImportJson("");
    setExportNotice(
      `Imported ${result.added} workspace${result.added === 1 ? "" : "s"} · skipped ${result.skippedInvalid} invalid · regenerated ${result.regeneratedIds} ID${result.regeneratedIds === 1 ? "" : "s"}.`
    );
  };

  const renderNoteCard = (note: WorkspaceNote) => (
    <article
      key={note.id}
      data-note-id={note.id}
      className={`relative space-y-2 rounded-2xl border p-3.5 transition-colors duration-200 ${
        note.pinned
          ? "border-neural-cyan/35 bg-neural-cyan/[0.04] shadow-[inset_0_0_0_1px_rgba(75,225,255,0.08)]"
          : "border-white/5 bg-white/[0.01] hover:border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h5 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-[-0.02em] text-neural-text-primary">
          {note.title || "Untitled Note"}
          {note.pinned ? <Badge variant="live" className="px-1.5 py-0 text-[9px]">pinned</Badge> : null}
        </h5>
        <div className="flex items-center gap-1">
          <WorkspaceActionButton
            variant="icon"
            onClick={() => togglePinNote(note)}
            title={note.pinned ? "Unpin note" : "Pin note (included in chat context when enabled)"}
          >
            <Pin className={`h-3.5 w-3.5 ${note.pinned ? "text-neural-cyan" : ""}`} />
          </WorkspaceActionButton>
          <WorkspaceActionButton variant="icon" onClick={() => openEditNoteForm(note)} title="Edit note">
            <Edit className="h-3.5 w-3.5" />
          </WorkspaceActionButton>
          <WorkspaceActionButton
            variant="icon"
            onClick={() => handleDeleteNote(note.id)}
            title="Delete note"
            className="hover:text-neural-red"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </WorkspaceActionButton>
        </div>
      </div>
      <p className="text-xs text-neural-text-secondary leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
        {note.content}
      </p>
      {note.tags && note.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded border border-white/5 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-mono text-neural-text-muted"
            >
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );

  return (
    <MotionPage className="min-w-0">
      <PageHeader
        title="Workspace Memory Hub"
        description="Organize local notes, prompts, presets, and linked conversations. Workspace data remains in this browser."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <WorkspaceStatStrip>
            <WorkspaceStatItem>
              {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"}
            </WorkspaceStatItem>
          </WorkspaceStatStrip>
          <button
            type="button"
            onClick={openNewWorkspaceForm}
            className={`inline-flex items-center gap-2 rounded-2xl border border-neural-cyan/35 bg-neural-cyan/14 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-neural-cyan transition-colors duration-200 hover:bg-neural-cyan/22 active:scale-[0.98] ${WORKSPACE_FOCUS_RING}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Workspace
          </button>
          </div>
        }
      />

      <WorkspaceNotice>Do not put secrets in workspace notes or prompts.</WorkspaceNotice>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_1.35fr]">
        {/* Left pane: Workspace List */}
        <div className="min-w-0 space-y-4">
          <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
            Projects & Workspaces
          </h2>

          {workspaces.length === 0 ? (
            <EmptyState
              title="No workspaces active"
              description="Create a workspace manually or choose from starter templates below to begin organizing."
            />
          ) : (
            <WorkspaceListMotion workspaceCount={workspaces.length} selectedId={selectedId}>
              {workspaces.map((w, index) => {
                const isSelected = w.id === selectedId;
                const noteCount = w.pinned_notes?.length || 0;
                const convCount = getWorkspaceLinkedConversations(w).length;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    onKeyDown={(event) => handleWorkspaceListKeyDown(event, index)}
                    aria-pressed={isSelected}
                    aria-label={`Select workspace ${w.name}`}
                    className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-colors transition-shadow duration-200 ${workspaceListCardClass(isSelected)} ${WORKSPACE_FOCUS_RING}`}
                  >
                    <WorkspaceColorBar color={w.color} className="w-1" />

                    <div className="pl-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-semibold tracking-[-0.03em] text-neural-text-primary">
                          {w.name}
                        </h3>
                        <WorkspaceBadge color={w.color}>{w.color || "cyan"}</WorkspaceBadge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neural-text-secondary">
                        {w.description || "No description configured."}
                      </p>
                      <WorkspaceStatStrip className="mt-3">
                        <WorkspaceStatItem icon={<BookOpen className="h-3.5 w-3.5" aria-hidden="true" />}>
                          {noteCount} Note{noteCount === 1 ? "" : "s"}
                        </WorkspaceStatItem>
                        <WorkspaceStatItem icon={<MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}>
                          {convCount} Conv{convCount === 1 ? "" : "s"}
                        </WorkspaceStatItem>
                        <span className="ml-auto">Updated: {new Date(w.updated_at).toLocaleDateString()}</span>
                      </WorkspaceStatStrip>
                    </div>
                  </button>
                );
              })}
            </WorkspaceListMotion>
          )}

          {/* Starter templates */}
          <Panel accent="violet" className="p-4 space-y-3">
            <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">Starter Templates</p>
            <p className="text-xs text-neural-text-secondary">Spawn starter contexts for common projects in the NestyAI ecosystem.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {getWorkspaceTemplates().map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleCreateFromTemplate(t)}
                  className={`rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left text-xs text-neural-text-secondary transition-colors duration-200 hover:border-neural-cyan/30 hover:bg-white/[0.06] hover:text-neural-text-primary active:scale-[0.99] ${WORKSPACE_FOCUS_RING}`}
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

          <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <summary className="cursor-pointer font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
              Import / Export Workspaces
            </summary>
            <div className="mt-3 space-y-4 text-xs text-neural-text-secondary">
              <p>Copy or download local workspace JSON. No secrets are included by design.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyWorkspacesJson()}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-secondary transition hover:border-neural-cyan/35 hover:text-neural-cyan"
                >
                  Copy JSON
                </button>
                <button
                  type="button"
                  onClick={handleDownloadWorkspacesJson}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-secondary transition hover:border-neural-cyan/35 hover:text-neural-cyan"
                >
                  Download .json
                </button>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <WorkspaceNotice>Only import workspace JSON you trust. Do not import secrets.</WorkspaceNotice>
                <label htmlFor="workspace-import-json" className="sr-only">
                  Workspace import JSON
                </label>
                <textarea
                  id="workspace-import-json"
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  rows={5}
                  placeholder="Paste workspace JSON array or single workspace object"
                  className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neural-text-primary outline-none transition-colors duration-200 focus:border-neural-cyan/40 ${WORKSPACE_FOCUS_RING}`}
                />
                <button
                  type="button"
                  onClick={handleImportWorkspacesJson}
                  className="rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan transition hover:bg-neural-cyan/25"
                >
                  Import JSON
                </button>
              </div>

              <WorkspaceNoticeMotion message={exportNotice} />
            </div>
          </details>
        </div>

        {/* Right pane: Workspace Detail Panel */}
        <div className="min-w-0 space-y-4">
          <h2 className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-secondary">
            Workspace Details
          </h2>

          {!selectedWorkspace ? (
            <Panel className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 bg-white/[0.01]">
              <FolderKanban className="h-10 w-10 text-neural-text-muted" />
              <h3 className="mt-4 text-base font-semibold text-neural-text-primary">No workspace selected</h3>
              <p className="mt-2 max-w-xs text-xs text-neural-text-muted leading-relaxed">
                Select an existing workspace from the left panel, create a new project, or clone a template to configure project notes, presets, and conversation logs.
              </p>
            </Panel>
          ) : (
            <Panel
              accent={PANEL_ACCENTS[selectedWorkspace.color || "cyan"]}
              className="p-5 sm:p-6 space-y-6"
            >
              <div ref={detailPanelRef} className="space-y-6">
              {/* Header with name and actions */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary">
                      {selectedWorkspace.name}
                    </h3>
                    <WorkspaceBadge color={selectedWorkspace.color}>{selectedWorkspace.color || "cyan"}</WorkspaceBadge>
                  </div>
                  <p className="mt-2 text-sm text-neural-text-secondary leading-relaxed">
                    {selectedWorkspace.description || "No description configured."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <WorkspaceActionButton
                    variant="icon"
                    onClick={() => openEditWorkspaceForm(selectedWorkspace)}
                    title="Edit workspace parameters"
                    className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.04]"
                  >
                    <Edit className="h-4 w-4" />
                  </WorkspaceActionButton>
                  <WorkspaceActionButton
                    variant="icon"
                    onClick={() => handleDeleteWorkspace(selectedWorkspace.id, selectedWorkspace.name)}
                    title="Delete workspace"
                    className="h-8 w-8 rounded-xl border border-neural-red/20 bg-neural-red/5 hover:text-neural-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </WorkspaceActionButton>
                  <Link
                    href={buildChatHref({ workspaceId: selectedWorkspace.id })}
                    className={`inline-flex items-center gap-1.5 rounded-xl border border-neural-cyan/40 bg-neural-cyan/15 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan transition-colors duration-200 hover:bg-neural-cyan/25 active:scale-[0.98] ${WORKSPACE_FOCUS_RING}`}
                  >
                    Open Chat
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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
                  <h4 className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">
                    Linked Conversations ({getWorkspaceLinkedConversations(selectedWorkspace).length})
                  </h4>
                </div>
                <p className="text-[11px] text-neural-text-muted">
                  Local labels only. Conversation contents are not fetched or injected into chat context.
                </p>

                <form onSubmit={handleLinkConversation} className="space-y-2">
                  <label htmlFor="link-conversation-id" className="sr-only">
                    Gateway conversation ID to link
                  </label>
                  <input
                    id="link-conversation-id"
                    type="text"
                    value={newConversationId}
                    onChange={(e) => setNewConversationId(e.target.value)}
                    placeholder="Enter Gateway Conversation UUID to link"
                    className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neural-text-primary outline-none transition-colors duration-200 focus:border-neural-cyan/40 ${WORKSPACE_FOCUS_RING}`}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label htmlFor="link-conversation-label" className="sr-only">
                      Optional local label
                    </label>
                    <input
                      id="link-conversation-label"
                      type="text"
                      value={newConversationLabel}
                      onChange={(e) => setNewConversationLabel(e.target.value)}
                      placeholder="Optional local label"
                      className={`flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neural-text-primary outline-none transition-colors duration-200 focus:border-neural-cyan/40 ${WORKSPACE_FOCUS_RING}`}
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary hover:border-neural-cyan/40 hover:text-neural-cyan transition"
                    >
                      Link ID
                    </button>
                  </div>
                </form>

                <WorkspaceNoticeMotion message={linkNotice} />

                {getWorkspaceLinkedConversations(selectedWorkspace).length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                    {getWorkspaceLinkedConversations(selectedWorkspace).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 transition-colors duration-200 hover:border-neural-cyan/20 hover:bg-white/[0.04] sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-medium text-neural-text-primary">
                            {entry.label?.trim() || "Untitled conversation"}
                          </p>
                          <TokenTag className="max-w-full truncate font-mono text-[10px]">{entry.id}</TokenTag>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={buildChatHref({
                              workspaceId: selectedWorkspace.id,
                              conversationId: entry.id
                            })}
                            className={`inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-display text-[9px] uppercase tracking-[0.08em] text-neural-cyan transition-colors duration-200 hover:border-neural-cyan/35 hover:text-neural-text-primary active:scale-[0.98] ${WORKSPACE_FOCUS_RING}`}
                            title={`Open in Chat: ${entry.label?.trim() || "Untitled conversation"}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            Open
                          </Link>
                          <WorkspaceActionButton
                            onClick={() =>
                              void handleCopyLinkedConversationLink(selectedWorkspace.id, entry.id)
                            }
                            title={`Copy Link: ${entry.label?.trim() || "Untitled conversation"}`}
                          >
                            <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                            Copy
                          </WorkspaceActionButton>
                          <WorkspaceActionButton
                            variant="icon"
                            onClick={() => handleEditLinkedLabel(entry)}
                            title="Edit local label"
                          >
                            <Edit className="h-4 w-4" />
                          </WorkspaceActionButton>
                          <WorkspaceActionButton
                            variant="icon"
                            onClick={() => handleUnlinkConversation(entry.id)}
                            title="Unlink conversation ID"
                            className="hover:text-neural-red"
                          >
                            <X className="h-4 w-4" />
                          </WorkspaceActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neural-text-muted italic">No linked conversations yet.</p>
                )}
              </div>

              {/* Workspace notes */}
              {(() => {
                const allNotes = selectedWorkspace.pinned_notes ?? [];
                const pinnedNotes = sortNotesByUpdated(allNotes.filter((note) => note.pinned));
                const otherNotes = sortNotesByUpdated(allNotes.filter((note) => !note.pinned));
                const linkedCount = getWorkspaceLinkedConversations(selectedWorkspace).length;

                return (
                  <div className="space-y-4 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">
                          Project Notes
                        </h4>
                        <p className="text-xs text-neural-text-secondary">
                          {allNotes.length} note{allNotes.length === 1 ? "" : "s"} · {pinnedNotes.length} pinned ·{" "}
                          {linkedCount} linked conversation{linkedCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openNewNoteForm}
                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-display text-[9px] uppercase tracking-[0.08em] text-neural-text-secondary hover:border-neural-cyan/35 hover:text-neural-cyan transition"
                      >
                        <Plus className="h-3 w-3" />
                        Add Note
                      </button>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-neural-cyan/20 bg-neural-cyan/[0.03] p-3">
                      <p className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan">
                        Pinned notes (injected into chat context)
                      </p>
                      <p className="text-[11px] text-neural-text-muted">
                        Only pinned notes are sent as transient workspace context when enabled in Chat.
                      </p>
                      {pinnedNotes.length > 0 ? (
                        <div className="grid gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {pinnedNotes.map((note) => renderNoteCard(note))}
                        </div>
                      ) : (
                        <p className="text-xs text-neural-text-muted italic">No pinned notes yet.</p>
                      )}
                    </div>

                    <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.01] p-3">
                      <p className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-muted">
                        Other notes
                      </p>
                      {otherNotes.length > 0 ? (
                        <div className="grid gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {otherNotes.map((note) => renderNoteCard(note))}
                        </div>
                      ) : (
                        <p className="text-xs text-neural-text-muted italic">No unpinned notes.</p>
                      )}
                    </div>

                    {allNotes.length === 0 ? (
                      <p className="text-xs text-neural-text-muted italic">No notes created for this workspace.</p>
                    ) : null}
                  </div>
                );
              })()}
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Editor Modal/Form overlay for Workspace Config */}
      <Modal
        open={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingWorkspace ? "Edit Workspace Settings" : "Configure New Workspace"}
        description="Workspace configuration stays local to this browser."
        size="lg"
      >
            <form onSubmit={handleSaveWorkspace} className="space-y-4 text-xs">
              <WorkspaceNotice>
                Do not put secrets in workspace notes or prompts. Workspace configurations remain local to this browser
                session.
              </WorkspaceNotice>

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
                  <Select
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value as WorkspaceColor)}
                  >
                    <option value="cyan">Cyan</option>
                    <option value="violet">Violet</option>
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="red">Red</option>
                    <option value="neutral">Neutral</option>
                  </Select>
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
                    <Select
                      value={formPresetId}
                      onChange={(e) => handleFormPresetChange(e.target.value)}
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
                    </Select>
                  </label>

                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Preferred Model Override</span>
                    <Select
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="font-mono"
                    >
                      <option value="">Default (No Override)</option>
                      <option value="nesty-flash-1.0">nesty-flash-1.0</option>
                      <option value="nesty-combined-1.0">nesty-combined-1.0</option>
                      <option value="nesty-pro-1.0">nesty-pro-1.0</option>
                    </Select>
                  </label>
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Search</span>
                    <Select
                      value={formSearch}
                      onChange={(e) => setFormSearch(e.target.value)}
                      className="py-2"
                    >
                      <option value="">Default</option>
                      <option value="auto">auto</option>
                      <option value="on">on</option>
                      <option value="off">off</option>
                    </Select>
                  </label>
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Tools</span>
                    <Select
                      value={formTools}
                      onChange={(e) => setFormTools(e.target.value)}
                      className="py-2"
                    >
                      <option value="">Default</option>
                      <option value="auto">auto</option>
                      <option value="off">off</option>
                    </Select>
                  </label>
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Store Logs</span>
                    <Select
                      value={formStore}
                      onChange={(e) => setFormStore(e.target.value)}
                      className="py-2"
                    >
                      <option value="">Default</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </label>
                  <label className="block space-y-1 text-neural-text-secondary">
                    <span>Semantic Recall</span>
                    <Select
                      value={formSemanticRecall}
                      onChange={(e) => setFormSemanticRecall(e.target.value)}
                      className="py-2"
                    >
                      <option value="">Default</option>
                      <option value="auto">auto</option>
                      <option value="on">on</option>
                      <option value="off">off</option>
                    </Select>
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
      </Modal>

      {/* Editor Modal for Project Notes */}
      <Modal
        open={showNoteEditor}
        onClose={() => setShowNoteEditor(false)}
        title={editingNote ? "Edit Project Note" : "Create New Note"}
        description="Pinned notes can be sent transiently as workspace chat context."
        size="sm"
      >
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
      </Modal>
    </MotionPage>
  );
}
