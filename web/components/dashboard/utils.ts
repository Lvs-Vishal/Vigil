// Pure helpers for the dashboard route: time formatting, the mean-reverting
// random-walk simulation, threshold-based status, and log merging. These are
// dashboard-only presentation/simulation concerns (not canonical data), so
// they live here rather than in the shared `@/lib/data` module.
import type { Module, SeriesPoint, Status, SystemEvent } from "@/lib/data";

/** A module's mutable runtime state, seeded from `@/lib/data` and advanced
 * in place by the live simulation. `def` stays the immutable seed record. */
export interface ModuleRuntime {
  def: Module;
  series: SeriesPoint[] | null;
  status: Status;
  latest?: number;
}

// The 4 real modules physically wired to the hub, in slot order (A1–A4).
export const MODULE_ORDER = ["sound-level", "ambient-light", "temperature", "proximity"] as const;

export const METRIC_LABEL: Record<string, string> = {
  "sound-level": "SOUND LEVEL",
  "ambient-light": "LUX",
  temperature: "TEMP",
  proximity: "DISTANCE",
};

function round(v: number, d: number): number {
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function fmtClock(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

export function fmtClockShort(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function fmtDateLabel(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} UTC`;
}

export function agoLabel(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h ago`;
}

export function agoDays(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  return `${days}d ago`;
}

/* ============ threshold-based status ============ */
export function computeStatus(value: number, thresholds?: Module["thresholds"]): Status {
  if (!thresholds) return "good";
  if (thresholds.crit_above != null && value >= thresholds.crit_above) return "critical";
  if (thresholds.crit_below != null && value <= thresholds.crit_below) return "critical";
  if (thresholds.warn_above != null && value >= thresholds.warn_above) return "warning";
  if (thresholds.warn_below != null && value <= thresholds.warn_below) return "warning";
  return "good";
}

export const STATUS_RANK: Record<Status, number> = { good: 0, warning: 1, critical: 2 };

export function overallStatus(statuses: Status[]): Status {
  let worst: Status = "good";
  statuses.forEach((s) => {
    if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
  });
  return worst;
}

export interface ChartThreshold {
  value: number;
  label: string;
  status: "warning" | "critical";
}

export function thresholdsFor(m: Module): ChartThreshold[] {
  const t = m.thresholds;
  if (!t) return [];
  const arr: ChartThreshold[] = [];
  if (t.warn_above != null) arr.push({ value: t.warn_above, label: "WARN " + t.warn_above, status: "warning" });
  if (t.crit_above != null) arr.push({ value: t.crit_above, label: "CRIT " + t.crit_above, status: "critical" });
  if (t.warn_below != null) arr.push({ value: t.warn_below, label: "WARN " + t.warn_below, status: "warning" });
  if (t.crit_below != null) arr.push({ value: t.crit_below, label: "CRIT " + t.crit_below, status: "critical" });
  return arr;
}

/* ============ live-simulation config ============ */
export interface SimConfig {
  step: number;
  reversion: number;
  min?: number;
  max?: number;
  decimals: number;
}

// Ranges picked to stay plausible against each module's real thresholds
// (lib/seed-data.json) — wide enough to wander, tight enough that a single
// tick can't leap straight from good to critical.
export const SIM_CFG: Record<string, SimConfig> = {
  "sound-level": { step: 1.8, reversion: 0.12, min: 15, max: 95, decimals: 2 }, // warn 70 / crit 85 dB(rel)
  "ambient-light": { step: 24, reversion: 0.1, min: 20, max: 1300, decimals: 2 }, // warn 900 / crit 1200 lux
  temperature: { step: 0.28, reversion: 0.1, min: 15, max: 36, decimals: 2 }, // warn 29 / crit 33 °C
  proximity: { step: 9, reversion: 0.08, min: 10, max: 240, decimals: 2 }, // warn 30 / crit 12 cm (below)
};

/** Mean-reverting random walk, continuing from the series' last real value. */
export function nextValue(seriesVals: number[], cfg: SimConfig): number {
  const last = seriesVals[seriesVals.length - 1];
  const recent = seriesVals.slice(-8);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const noise = (Math.random() - 0.5) * 2 * cfg.step;
  const pull = (avg - last) * cfg.reversion;
  let v = last + noise + pull;
  if (cfg.min != null) v = Math.max(cfg.min, v);
  if (cfg.max != null) v = Math.min(cfg.max, v);
  return round(v, cfg.decimals);
}

/** Advances every module's series by one synthetic sample, mean-reverting
 * from its own last real value. */
export function tickModules(prev: ModuleRuntime[]): ModuleRuntime[] {
  return prev.map((m) => {
    const cfg = SIM_CFG[m.def.slug];
    if (!cfg || !m.series || m.series.length === 0) return m;

    const vals = m.series.map((p) => p.v);
    const nextV = nextValue(vals, cfg);
    const lastT = new Date(m.series[m.series.length - 1].t);
    const nextT = new Date(lastT.getTime() + 2 * 60000);
    const point: SeriesPoint = { t: nextT.toISOString(), v: nextV };

    let series = [...m.series, point];
    if (series.length > 90) series = series.slice(series.length - 90);

    return {
      ...m,
      series,
      latest: nextV,
      status: computeStatus(nextV, m.def.thresholds),
    };
  });
}

/* ============ activity log ============ */
export interface LogItem {
  t: string;
  severity: "info" | "warning" | "critical";
  module: string;
  type: string;
  message: string;
}

export function buildMergedLog(events: SystemEvent[], modules: Module[]): LogItem[] {
  void modules; // no per-module event source beyond `events` currently
  const items: LogItem[] = events.map((e) => ({
    t: e.t,
    severity: e.severity,
    module: e.module,
    type: e.type,
    message: e.message,
  }));
  items.sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  return items;
}
