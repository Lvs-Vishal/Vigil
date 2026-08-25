import { fmtNumber } from "@/lib/data";
import { SparkChart } from "./SparkChart";
import { StatusPill } from "./StatusPill";
import { METRIC_LABEL, agoDays, thresholdsFor } from "./utils";
import type { ModuleRuntime } from "./utils";

export function ModuleCard({ runtime, color, now }: { runtime: ModuleRuntime; color: string; now: Date }) {
  const { def, series, status, latest } = runtime;

  return (
    <article className="relative flex flex-col gap-3 rounded-[10px] border border-border bg-surface px-[18px] pt-4 pb-3.5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="flex-none rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
            {def.slot}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold text-ink">{def.label}</span>
            <span className="font-mono text-[11px] text-ink-muted">{def.sensor_chip}</span>
          </div>
        </div>
        <StatusPill status={status} label={status.toUpperCase()} />
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[26px] font-medium tabular-nums text-ink">{fmtNumber(latest ?? 0)}</span>
        <span className="font-mono text-[12px] text-ink-secondary">{def.unit}</span>
      </div>

      <div>
        <div className="mb-1 font-mono text-[10px] tracking-[0.05em] text-ink-muted uppercase">
          {(METRIC_LABEL[def.slug] || "READING") + ` (${def.unit})`}
        </div>
        <SparkChart
          points={(series ?? []).map((p) => ({ t: p.t, v: p.v }))}
          color={color}
          unit={def.unit ?? ""}
          thresholds={thresholdsFor(def)}
          ariaLabel={`${def.label} over time`}
          heightClassName="h-[118px]"
        />
      </div>

      <div className="mt-0.5 flex items-center justify-between border-t border-border pt-0.5 font-mono text-[10.5px] text-ink-muted">
        <span>{def.author || "nodeframe-core"}</span>
        <span>connected {agoDays(def.connected_at, now)}</span>
      </div>
    </article>
  );
}
