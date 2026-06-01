"use client";

import type { ReactNode } from "react";

type ConfirmActionProps = {
  confirmMessage: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  title?: string;
};

export function ConfirmAction({
  confirmMessage,
  onConfirm,
  className = "",
  disabled,
  children,
  title = "Please confirm"
}: ConfirmActionProps) {
  const handleClick = async () => {
    const confirmed = window.confirm(`${title}\n\n${confirmMessage}`);
    if (!confirmed) {
      return;
    }
    await onConfirm();
  };

  return (
    <button type="button" onClick={() => void handleClick()} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
