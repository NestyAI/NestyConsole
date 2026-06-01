import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-neural-base text-neural-text-primary">
      <Topbar />
      <div className="mx-auto flex w-full max-w-[1800px] flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
          <div className="mx-auto w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
