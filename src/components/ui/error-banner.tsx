import type { ReactNode } from "react";

type ErrorBannerProps = {
  code?: string | null;
  message: string;
  children?: ReactNode;
  className?: string;
};

export function ErrorBanner({ code, message, children, className = "" }: ErrorBannerProps) {
  return (
    <div className={`rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100 ${className}`}>
      {code ? <p className="font-medium">{code}</p> : null}
      <p className={code ? "mt-1" : ""}>{message}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
