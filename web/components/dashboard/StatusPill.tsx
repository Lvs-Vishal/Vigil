import { severityIcon } from "./icons";

export type PillStatus = "good" | "warning" | "critical" | "info";

const STATUS_CLASSES: Record<PillStatus, string> = {
  good: "text-good border-good/35 bg-good/8",
  warning: "text-warning border-warning/35 bg-warning/8",
  critical: "text-critical border-critical/40 bg-critical/10",
  info: "text-teal border-teal/30 bg-teal/7",
};

export function StatusPill({ status, label }: { status: PillStatus; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-[5px] pl-2 pr-2.5 font-mono text-[11px] font-medium tracking-[0.04em] uppercase ${STATUS_CLASSES[status]}`}
    >
      {severityIcon(status)}
      <span>{label ?? status.toUpperCase()}</span>
    </span>
  );
}
