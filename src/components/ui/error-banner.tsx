import type { ReactNode } from "react";

type ErrorBannerProps = {
  code?: string | null;
  message: string;
  children?: ReactNode;
  className?: string;
};

export function ErrorBanner({ code, message, children, className = "" }: ErrorBannerProps) {
  return (
    <div className={`rounded-2xl border border-neural-red/35 bg-neural-red/10 p-4 text-sm text-rose-100 ${className}`}>
      {code ? <p className="font-mono text-[11px] uppercase tracking-[0.08em]">{code}</p> : null}
      <p className={code ? "mt-1 leading-relaxed" : "leading-relaxed"}>{message}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
