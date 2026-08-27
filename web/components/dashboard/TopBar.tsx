import Link from "next/link";
import type { Status } from "@/lib/data";
import type { PollStatus } from "@/lib/hooks/useLiveData";
import { BackArrowIcon, BrandMarkIcon } from "./icons";
import { StatusPill } from "./StatusPill";
import { fmtClock, fmtDateLabel } from "./utils";

export function TopBar({
  now,
  hubName,
  firmware,
  slotsUsed,
  slotsTotal,
  overallStatus,
  reduceMotion,
  pollStatus,
  dbStatus,
}: {
  now: Date;
  hubName: string;
  firmware: string;
  slotsUsed: number;
  slotsTotal: number;
  overallStatus: Status;
  reduceMotion: boolean;
  pollStatus: PollStatus;
  dbStatus: "connected" | "offline";
}) {
  return (
    <div className="sticky top-0 z-50 border-b border-border bg-plane/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-5 px-6 py-3.5">
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 text-ink-secondary transition-colors hover:text-copper-strong"
          aria-label="Back to Nodeframe site"
        >
          <BackArrowIcon />
          <span className="font-mono text-[11px] tracking-[0.03em] uppercase">Nodeframe</span>
        </Link>
        <div className="h-6 w-px flex-none bg-border-strong" aria-hidden="true" />

        <div className="mr-2 flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-border-strong text-copper">
            <BrandMarkIcon />
          </span>
          <span className="font-display text-[18px] font-black tracking-[-0.02em] text-ink">NODEFRAME</span>
        </div>
        <div className="h-6 w-px flex-none bg-border-strong" aria-hidden="true" />

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[12px] text-ink-secondary">
          <span className="font-sans text-[13px] font-semibold text-ink">{hubName}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-[3px] text-[11px] tracking-[0.02em] whitespace-nowrap">
            FW <b className="font-medium text-ink">{firmware}</b>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-[3px] text-[11px] tracking-[0.02em] whitespace-nowrap">
            SLOTS{" "}
            <b className="font-medium text-ink">
              {slotsUsed}/{slotsTotal}
            </b>
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3.5">
          <StatusPill status={overallStatus} label={overallStatus === "good" ? "NOMINAL" : overallStatus.toUpperCase()} />
          <div className="flex items-center gap-2 font-mono text-[13px] tracking-[0.02em] text-ink">
            {/* Supabase DB Connection Indicator */}
            {dbStatus === "connected" ? (
              <span
                title="Supabase Connected (Real-time)"
                className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-2 py-0.5 text-[10px] tracking-[0.05em] text-teal uppercase"
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-teal ${reduceMotion ? "" : "animate-pulse"}`} />
                Supabase
              </span>
            ) : (
              <span
                title="Supabase Offline (Using local fallback or disconnected)"
                className="inline-flex items-center gap-1.5 rounded-full border border-critical/40 bg-critical/10 px-2 py-0.5 text-[10px] tracking-[0.05em] text-critical uppercase"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-critical" />
                Offline
              </span>
            )}
            
            {/* Live SWR indicator dot */}
            {pollStatus === "live" && (
              <span
                title="Live — polling every 30 s"
                className={`h-[7px] w-[7px] rounded-full bg-teal shadow-[0_0_0_3px_rgba(43,214,164,0.18)] ${
                  reduceMotion ? "" : "animate-pulse"
                }`}
              />
            )}
            {pollStatus === "connecting" && (
              <span
                title="Fetching latest data…"
                className="h-[7px] w-[7px] rounded-full bg-ink-muted animate-pulse"
              />
            )}
            {pollStatus === "error" && (
              <span
                title="Poll failed — showing last known data"
                className="h-[7px] w-[7px] rounded-full bg-warning"
              />
            )}
            <span>{fmtClock(now)}</span>
            <span className="text-[11px] text-ink-muted">{fmtDateLabel(now)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
