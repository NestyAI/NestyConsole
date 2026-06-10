"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TerminalBlock } from "@/components/ui/terminal-block";
import {
  WORKSPACE_CONTEXT_CHAR_CAP,
  getWorkspaceContextMeta
} from "@/lib/workspaces/context";
import {
  type Workspace,
  loadWorkspacesResult,
  workspaceHasLinkedConversation
} from "@/lib/workspaces/workspaces";

const WORKSPACE_BADGE_VARIANTS: Record<string, "live" | "ai" | "success" | "warning" | "error" | "inactive"> = {
  cyan: "live",
  violet: "ai",
  green: "success",
  amber: "warning",
  red: "error",
  neutral: "inactive"
};

const WORKSPACE_BANNER_CLASSES: Record<string, string> = {
  cyan: "border-neural-cyan/25 bg-neural-cyan/10",
  violet: "border-neural-violet/25 bg-neural-violet/10",
  green: "border-neural-green/25 bg-neural-green/10",
  amber: "border-neural-amber/25 bg-neural-amber/10",
  red: "border-neural-red/25 bg-neural-red/10",
  neutral: "border-white/10 bg-white/[0.03]"
};

type WorkspaceChatPanelProps = {
  activeWorkspace: Workspace | null;
  useWorkspaceContext: boolean;
  workspaceWarning: string | null;
  conversationId: string | null;
  onWorkspaceSelect: (workspaceId: string) => void;
  onUseWorkspaceContextChange: (enabled: boolean) => void;
  onLinkCurrentConversation: () => void;
};

export function WorkspaceChatPanel({
  activeWorkspace,
  useWorkspaceContext,
  workspaceWarning,
  conversationId,
  onWorkspaceSelect,
  onUseWorkspaceContextChange,
  onLinkCurrentConversation
}: WorkspaceChatPanelProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [storageCorrupted, setStorageCorrupted] = useState(false);

  useEffect(() => {
    const { workspaces: list, corrupted } = loadWorkspacesResult();
    /* eslint-disable react-hooks/set-state-in-effect */
    setWorkspaces(list);
    setStorageCorrupted(corrupted);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeWorkspace?.id, activeWorkspace?.updated_at]);

  const contextMeta = useMemo(
    () => (activeWorkspace ? getWorkspaceContextMeta(activeWorkspace) : null),
    [activeWorkspace]
  );

  const isConversationLinked = Boolean(
    activeWorkspace && conversationId && workspaceHasLinkedConversation(activeWorkspace, conversationId)
  );

  const showLinkAction = Boolean(
    activeWorkspace && conversationId && !isConversationLinked
  );

  const accentClass = activeWorkspace
    ? WORKSPACE_BANNER_CLASSES[activeWorkspace.color || "cyan"] || WORKSPACE_BANNER_CLASSES.cyan
    : "border-white/10 bg-white/[0.03]";

  return (
    <div className={`rounded-2xl border p-3 shadow-neural-soft ${accentClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-neural-text-secondary">
          <span className="font-display text-[10px] uppercase tracking-[0.08em]">Workspace</span>
          <select
            value={activeWorkspace?.id ?? ""}
            onChange={(event) => onWorkspaceSelect(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-neural-text-primary outline-none transition focus:border-neural-cyan/40"
          >
            <option value="">No workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/workspaces"
          className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan underline underline-offset-2 hover:text-neural-text-primary"
        >
          Manage workspaces
        </Link>
      </div>

      {storageCorrupted ? (
        <p className="mt-2 text-xs text-amber-100">
          Workspace storage could not be read. Continuing with normal chat.
        </p>
      ) : null}

      {workspaceWarning ? (
        <p className="mt-2 text-xs text-amber-100">{workspaceWarning}</p>
      ) : null}

      {activeWorkspace ? (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={WORKSPACE_BADGE_VARIANTS[activeWorkspace.color || "cyan"] || "live"}>
              {activeWorkspace.name}
            </Badge>
            <span className="text-xs text-neural-text-secondary">Active workspace</span>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-neural-text-secondary">
            <input
              type="checkbox"
              checked={useWorkspaceContext}
              onChange={(event) => onUseWorkspaceContextChange(event.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/[0.03]"
            />
            <span>Use workspace context (system prompt, pinned notes, memory tags)</span>
          </label>

          {showLinkAction ? (
            <button
              type="button"
              onClick={onLinkCurrentConversation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-secondary transition hover:border-neural-cyan/35 hover:text-neural-cyan"
            >
              <Link2 className="h-3.5 w-3.5" />
              Link current conversation
            </button>
          ) : null}

          {isConversationLinked ? (
            <p className="text-xs text-neural-text-muted">Current conversation is already linked.</p>
          ) : null}

          {contextMeta ? (
            <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-neural-text-secondary">
              <summary className="cursor-pointer font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary">
                Context preview · {useWorkspaceContext ? "enabled" : "disabled"} · {contextMeta.charCount}/
                {WORKSPACE_CONTEXT_CHAR_CAP} chars
                {contextMeta.truncated ? " · truncated" : ""}
              </summary>
              <div className="mt-3 space-y-2">
                <p>
                  System prompt: {contextMeta.hasSystemPrompt ? "yes" : "no"} · Pinned notes:{" "}
                  {contextMeta.pinnedNotesCount} · Memory tags: {contextMeta.memoryTagsCount}
                </p>
                {useWorkspaceContext && contextMeta.truncated ? (
                  <p className="flex items-start gap-2 text-amber-100">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Workspace context exceeds {WORKSPACE_CONTEXT_CHAR_CAP} characters and will be truncated per
                    request.
                  </p>
                ) : null}
                {useWorkspaceContext && contextMeta.text.trim() ? (
                  <TerminalBlock className="max-h-32 overflow-y-auto border-white/10 text-[11px]">
                    {contextMeta.text}
                  </TerminalBlock>
                ) : (
                  <p className="text-neural-text-muted italic">
                    {useWorkspaceContext
                      ? "No workspace context content to inject."
                      : "Enable workspace context to preview injected content."}
                  </p>
                )}
              </div>
            </details>
          ) : null}

          <p className="flex items-start gap-2 text-xs text-amber-100/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Do not put secrets in workspace notes or prompts.
          </p>
        </div>
      ) : null}
    </div>
  );
}
