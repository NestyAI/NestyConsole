"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={pending}
      className={
      className ||
        "inline-flex items-center gap-2 rounded-lg border border-neural-text-muted/25 bg-neural-panel/70 px-3 py-2 font-display text-xs uppercase tracking-[0.08em] text-neural-text-primary transition hover:border-neural-cyan/40 hover:text-neural-cyan disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Logout
    </button>
  );
}
