import type { ReactNode } from "react";

import { AmbientBackground } from "@/components/layout/ambient-background";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-neural-app text-neural-text-primary">
      <AmbientBackground />
      <div className="relative z-shell mx-auto w-full max-w-[1760px] p-3 sm:p-4 lg:p-5 xl:p-6">
        <Topbar />
        <div className="mt-3 grid min-w-0 gap-3 lg:mt-4 lg:gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Sidebar />
          <main className="min-w-0">
            <div className="mx-auto w-full max-w-[1440px] pb-8 pt-1 sm:pb-10">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
