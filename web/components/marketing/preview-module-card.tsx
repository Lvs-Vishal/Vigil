import { fmtNumber, seriesColorFor, type Module } from "@/lib/data";

const STATUS_LABEL: Record<Module["status"], string> = {
  good: "nominal",
  warning: "warning",
  critical: "critical",
};

const STATUS_CLASS: Record<Module["status"], string> = {
  good: "text-good bg-good/15",
  warning: "text-warning bg-warning/15",
  critical: "text-critical bg-critical/15",
};

function thresholdNote(m: Module): string | null {
  const t = m.thresholds;
  if (!t) return null;
  if (t.warn_below !== undefined) return `Warns below ${fmtNumber(t.warn_below)} ${m.unit ?? ""}`.trim();
  if (t.warn_above !== undefined) return `Warns above ${fmtNumber(t.warn_above)} ${m.unit ?? ""}`.trim();
  return null;
}

export function PreviewModuleCard({ module: m }: { module: Module }) {
  const color = seriesColorFor(m.slug);
  const note = thresholdNote(m);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden="true"
          />
          <span className="font-mono text-[0.68rem] text-ink-muted">{m.slot}</span>
        </div>
        <span
          className={`whitespace-nowrap rounded px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wide ${STATUS_CLASS[m.status]}`}
        >
          {STATUS_LABEL[m.status]}
        </span>
      </div>

      <div>
        <div className="font-display text-base font-bold text-ink">{m.label}</div>
        <div className="font-mono text-xs text-ink-muted">{m.sensor_chip}</div>
      </div>

      {typeof m.latest === "number" && (
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-ink">
            {fmtNumber(m.latest)}
          </span>
          {m.unit && <span className="font-mono text-sm text-ink-secondary">{m.unit}</span>}
        </div>
      )}

      {note && <p className="font-mono text-[0.68rem] text-ink-muted">{note}</p>}
    </div>
  );
}
