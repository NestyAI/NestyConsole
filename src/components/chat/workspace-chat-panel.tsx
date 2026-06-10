"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { WorkspaceBadge } from "@/components/workspace/workspace-badge";
import { WorkspaceContextPreview } from "@/components/workspace/workspace-context-preview";
import { WorkspaceNotice } from "@/components/workspace/workspace-notice";
import { useCanAnimate } from "@/hooks/use-reduced-motion";
import { useGSAP } from "@/lib/motion/gsap-client";
import { fadeInUp } from "@/lib/motion/gsap-utils";
import { canAnimate } from "@/lib/motion/reduced-motion";
import { getWorkspaceContextMeta } from "@/lib/workspaces/context";
import {
  WORKSPACE_BANNER_CLASSES,
  WORKSPACE_FOCUS_RING
} from "@/lib/workspaces/ui-tokens";
import {
  type Workspace,
  loadWorkspacesResult,
  workspaceHasLinkedConversation
} from "@/lib/workspaces/workspaces";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const canAnimateMotion = useCanAnimate();

  useEffect(() => {
    const { workspaces: list, corrupted } = loadWorkspacesResult();
    /* eslint-disable react-hooks/set-state-in-effect */
    setWorkspaces(list);
    setStorageCorrupted(corrupted);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeWorkspace?.id, activeWorkspace?.updated_at]);

  useGSAP(
    () => {
      if (!panelRef.current || !canAnimate()) {
        return;
      }
      fadeInUp(panelRef.current);
    },
    { scope: panelRef, dependencies: [], revertOnUpdate: false }
  );

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
    <div
      ref={panelRef}
      className={`rounded-2xl border p-3 shadow-neural-soft transition-colors duration-200 sm:p-4 ${accentClass} ${
        canAnimateMotion ? "" : "animate-fade-in-up"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <label className="flex w-full min-w-0 flex-1 flex-col gap-1 text-xs text-neural-text-secondary sm:min-w-[200px]">
          <span className="font-display text-[10px] uppercase tracking-[0.08em]">Workspace</span>
          <select
            id="chat-workspace-select"
            value={activeWorkspace?.id ?? ""}
            onChange={(event) => onWorkspaceSelect(event.target.value)}
            className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-neural-text-primary outline-none transition-colors duration-200 focus:border-neural-cyan/40 ${WORKSPACE_FOCUS_RING}`}
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
          className={`shrink-0 font-display text-[10px] uppercase tracking-[0.08em] text-neural-cyan underline underline-offset-2 transition-colors hover:text-neural-text-primary ${WORKSPACE_FOCUS_RING} rounded-sm`}
        >
          Manage workspaces
        </Link>
      </div>

      {!activeWorkspace ? (
        <p className="mt-2 text-xs text-neural-text-muted">No workspace selected. Chat runs without project context.</p>
      ) : null}

      {storageCorrupted ? (
        <WorkspaceNotice tone="amber" className="mt-2 text-xs">
          Workspace storage could not be read. Continuing with normal chat.
        </WorkspaceNotice>
      ) : null}

      {workspaceWarning ? (
        <WorkspaceNotice tone="amber" className="mt-2 text-xs">
          {workspaceWarning}
        </WorkspaceNotice>
      ) : null}

      {activeWorkspace ? (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceBadge color={activeWorkspace.color}>{activeWorkspace.name}</WorkspaceBadge>
            <span className="text-xs text-neural-text-secondary">Active workspace</span>
          </div>

          <div
            className={`rounded-xl border p-3 transition-colors duration-200 ${
              useWorkspaceContext
                ? "border-neural-cyan/30 bg-neural-cyan/[0.04]"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-2 text-sm text-neural-text-secondary">
              <input
                type="checkbox"
                checked={useWorkspaceContext}
                onChange={(event) => onUseWorkspaceContextChange(event.target.checked)}
                className={`mt-0.5 h-4 w-4 rounded border-white/10 bg-white/[0.03] ${WORKSPACE_FOCUS_RING}`}
              />
              <span>
                <span className="font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary">
                  Workspace context {useWorkspaceContext ? "enabled" : "disabled"}
                </span>
                <span className="mt-1 block text-xs">
                  Injects system prompt, pinned notes, and memory tags per request only — not saved to chat history.
                </span>
              </span>
            </label>
          </div>

          {showLinkAction ? (
            <button
              type="button"
              onClick={onLinkCurrentConversation}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-secondary transition-colors duration-200 hover:border-neural-cyan/35 hover:text-neural-cyan active:scale-[0.98] ${WORKSPACE_FOCUS_RING}`}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Link current conversation
            </button>
          ) : null}

          {isConversationLinked ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Linked</Badge>
              <span className="text-xs text-neural-text-muted">Current conversation is already linked to this workspace.</span>
            </div>
          ) : null}

          {contextMeta ? (
            <WorkspaceContextPreview
              useWorkspaceContext={useWorkspaceContext}
              charCount={contextMeta.charCount}
              truncated={contextMeta.truncated}
              hasSystemPrompt={contextMeta.hasSystemPrompt}
              pinnedNotesCount={contextMeta.pinnedNotesCount}
              memoryTagsCount={contextMeta.memoryTagsCount}
              contextText={contextMeta.text}
            />
          ) : null}

          <WorkspaceNotice tone="amber" className="text-xs">
            Do not put secrets in workspace notes or prompts.
          </WorkspaceNotice>
        </div>
      ) : null}
    </div>
  );
}
