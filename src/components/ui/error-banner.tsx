import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type ErrorBannerProps = {
  code?: string | null;
  message: string;
  children?: ReactNode;
  className?: string;
};

export function ErrorBanner({ code, message, children, className = "" }: ErrorBannerProps) {
  return (
    <div
      className={`rounded-2xl border border-neural-red/35 bg-neural-red/[0.09] p-4 text-sm text-rose-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          {code ? <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">{code}</p> : null}
          <p className={code ? "mt-1 text-pretty leading-relaxed" : "text-pretty leading-relaxed"}>{message}</p>
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
