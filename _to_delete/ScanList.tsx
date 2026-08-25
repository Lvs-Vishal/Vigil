import type { Module, ScanEvent } from "@/lib/data";
import { CheckIcon, XIcon } from "./icons";
import { agoDays, fmtClockShort } from "./utils";

function ScanRow({ scan }: { scan: ScanEvent }) {
  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-2 border-b border-border px-2.5 py-1.5 text-[12px] last:border-b-0">
      <span className="font-mono text-[10.5px] text-ink-muted">{fmtClockShort(scan.t)}</span>
      <div className="min-w-0">
        <span className="block truncate text-[12px] font-medium text-ink">{scan.user_name}</span>
        <span className="block font-mono text-[9.5px] text-ink-muted">{scan.card_uid}</span>
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded whitespace-nowrap px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.04em] uppercase ${
          scan.authorized ? "bg-good/10 text-good" : "bg-critical/12 text-critical"
        }`}
      >
        {scan.authorized ? <CheckIcon /> : <XIcon />}
        <span>{scan.authorized ? "OK" : "DENIED"}</span>
      </span>
    </div>
  );
}

/** Access Control's card body: last-scan readout, scrollable scan list, footer. */
export function ScanList({ module, now }: { module: Module; now: Date }) {
  const scans = module.scans ?? [];
  const lastScan = scans[0];
  const deniedCount = scans.filter((s) => !s.authorized).length;

  return (
    <>
      {lastScan && (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-[16px] font-medium text-ink">{lastScan.authorized ? "Access granted" : "Access denied"}</span>
          <span className="font-mono text-[12px] text-ink-secondary">last scan {fmtClockShort(lastScan.t)} UTC</span>
        </div>
      )}
      <div className="relative">
        <div className="mb-1 font-mono text-[10px] tracking-[0.05em] text-ink-muted uppercase">RECENT SCANS ({scans.length})</div>
        <div className="flex max-h-[190px] flex-col overflow-y-auto rounded-md border border-border">
          {scans.map((s, i) => (
            <ScanRow key={`${s.t}-${i}`} scan={s} />
          ))}
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between border-t border-border pt-0.5 font-mono text-[10.5px] text-ink-muted">
        <span>
          {deniedCount} denied of {scans.length} scans
        </span>
        <span>
          slot {module.slot} · connected {agoDays(module.connected_at, now)}
        </span>
      </div>
    </>
  );
}
