"use client";

import { useRef } from "react";

import { TerminalBlock } from "@/components/ui/terminal-block";
import { WorkspaceNotice } from "@/components/workspace/workspace-notice";
import { fadeIn } from "@/lib/motion/gsap-utils";
import { canAnimate } from "@/lib/motion/reduced-motion";
import { WORKSPACE_CONTEXT_CHAR_CAP } from "@/lib/workspaces/context";
import { WORKSPACE_FOCUS_RING } from "@/lib/workspaces/ui-tokens";

type WorkspaceContextPreviewProps = {
  useWorkspaceContext: boolean;
  charCount: number;
  truncated: boolean;
  hasSystemPrompt: boolean;
  pinnedNotesCount: number;
  memoryTagsCount: number;
  contextText: string;
};

export function WorkspaceContextPreview({
  useWorkspaceContext,
  charCount,
  truncated,
  hasSystemPrompt,
  pinnedNotesCount,
  memoryTagsCount,
  contextText
}: WorkspaceContextPreviewProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!canAnimate() || !detailsRef.current?.open || !contentRef.current) {
      return;
    }
    fadeIn(contentRef.current);
  };

  return (
    <details
      ref={detailsRef}
      onToggle={handleToggle}
      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-neural-text-secondary transition-colors duration-200 open:border-neural-cyan/20"
    >
      <summary
        className={`cursor-pointer font-display text-[10px] uppercase tracking-[0.08em] text-neural-text-primary ${WORKSPACE_FOCUS_RING} rounded-sm`}
      >
        Context preview · {useWorkspaceContext ? "enabled" : "disabled"} · {charCount}/{WORKSPACE_CONTEXT_CHAR_CAP}{" "}
        chars
        {truncated ? " · truncated" : ""}
      </summary>
      <div ref={contentRef} className="mt-3 space-y-2">
        <p className="font-mono text-[10px]">
          System prompt: {hasSystemPrompt ? "yes" : "no"} · Pinned notes: {pinnedNotesCount} · Memory tags:{" "}
          {memoryTagsCount}
        </p>
        {useWorkspaceContext && truncated ? (
          <WorkspaceNotice tone="amber" className="text-xs">
            Workspace context exceeds {WORKSPACE_CONTEXT_CHAR_CAP} characters and will be truncated per request.
          </WorkspaceNotice>
        ) : null}
        {useWorkspaceContext && contextText.trim() ? (
          <TerminalBlock className="max-h-32 overflow-y-auto border-white/10 text-[11px]">{contextText}</TerminalBlock>
        ) : (
          <p className="text-neural-text-muted italic">
            {useWorkspaceContext
              ? "No workspace context content to inject."
              : "Enable workspace context to preview injected content."}
          </p>
        )}
      </div>
    </details>
  );
}
