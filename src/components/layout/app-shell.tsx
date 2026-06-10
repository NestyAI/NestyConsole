import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-[100dvh] bg-neural-app text-neural-text-primary">
      <Topbar />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
