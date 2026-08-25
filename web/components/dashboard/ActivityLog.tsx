import { severityIcon } from "./icons";
import { agoLabel, fmtClockShort } from "./utils";
import type { LogItem } from "./utils";

const SEVERITY_COLOR: Record<LogItem["severity"], string> = {
  info: "text-teal",
  warning: "text-warning",
  critical: "text-critical",
};

function LogRow({ item, now }: { item: LogItem; now: Date }) {
  return (
    <div className="grid grid-cols-[20px_84px_130px_1fr] items-start gap-3 border-b border-border py-2.5 max-[900px]:grid-cols-[16px_1fr] last:border-b-0">
      <div className={`mt-0.5 ${SEVERITY_COLOR[item.severity]}`}>{severityIcon(item.severity)}</div>
      <div className="font-mono text-[11px] whitespace-nowrap text-ink-muted max-[900px]:order-3">
        <div>{fmtClockShort(item.t)} UTC</div>
        <div className="mt-0.5 text-[10px] text-ink-secondary">{agoLabel(item.t, now)}</div>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 max-[900px]:order-2">
        <div className="text-[12.5px] font-semibold text-ink">{item.module}</div>
        <div className="font-mono text-[9px] tracking-[0.05em] text-ink-muted uppercase">{item.type}</div>
      </div>
      <div className={`text-[12.5px] leading-[1.45] max-[900px]:order-4 max-[900px]:col-start-2 ${item.severity === "critical" ? "text-ink" : "text-ink-secondary"}`}>
        {item.message}
      </div>
    </div>
  );
}

export function ActivityLog({ items, now }: { items: LogItem[]; now: Date }) {
  return (
    <section className="mt-9">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-[13px] font-extrabold tracking-[0.08em] text-ink uppercase">
          Activity Log
        </h2>
        <div className="font-mono text-[12px] text-ink-muted">
          {items.length} entries · system events, newest first
        </div>
      </div>
      <div className="rounded-[10px] border border-border bg-surface px-[18px] py-4">
        <div className="flex max-h-[420px] flex-col overflow-y-auto">
          {items.map((item, i) => (
            <LogRow key={`${item.t}-${i}`} item={item} now={now} />
          ))}
        </div>
      </div>
    </section>
  );
}
