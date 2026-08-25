import type { ReactNode } from "react";

export function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-critical/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-good/60" />
        </div>
        <div className="flex-1 truncate rounded-md border border-border bg-plane px-3 py-1 text-center font-mono text-[0.72rem] text-ink-muted">
          {url}
        </div>
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </div>
  );
}
