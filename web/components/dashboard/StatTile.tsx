import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[10px] border border-border bg-surface px-[18px] py-4">
      <div className="flex items-start justify-between">
        <div className="font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase">{label}</div>
        <div className="text-ink-muted">{icon}</div>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[32px] leading-none font-black tracking-[-0.01em] text-ink">{value}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-secondary">{caption}</div>
    </div>
  );
}
