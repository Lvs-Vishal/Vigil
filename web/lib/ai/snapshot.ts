import { seed, type Module } from "@/lib/data";
import type { ModuleSnapshot } from "./types";

function trendFor(m: Module): "rising" | "falling" | "flat" {
  const series = m.series;
  if (series.length < 8) return "flat";
  const recent = series[series.length - 1].v;
  const past = series[Math.max(0, series.length - 10)].v;
  const delta = recent - past;
  const scale = Math.max(Math.abs(past), 1) * 0.02; // ~2% move = noise floor
  if (delta > scale) return "rising";
  if (delta < -scale) return "falling";
  return "flat";
}

function minutesSinceFlagged(m: Module): number | null {
  if (m.status === "good") return null;
  const th = m.thresholds;
  const breaches = (v: number) =>
    (th.warn_above !== undefined && v >= th.warn_above) ||
    (th.warn_below !== undefined && v <= th.warn_below);

  // walk backward from the end to find how long it's been continuously over
  let i = m.series.length - 1;
  let firstBreachIdx = i;
  while (i >= 0 && breaches(m.series[i].v)) {
    firstBreachIdx = i;
    i--;
  }
  const startT = new Date(m.series[firstBreachIdx].t).getTime();
  const endT = new Date(m.series[m.series.length - 1].t).getTime();
  return Math.round((endT - startT) / 60000);
}

function recentEventsFor(label: string): string[] {
  return seed.events
    .filter((e) => e.module === label)
    .slice(0, 2)
    .map((e) => e.message);
}

export function buildSnapshots(modules: Module[] = seed.modules): ModuleSnapshot[] {
  return modules.map((m) => ({
    slug: m.slug,
    label: m.label,
    sensorChip: m.sensor_chip,
    metricKey: m.metric_key,
    unit: m.unit,
    latest: m.latest,
    status: m.status,
    thresholds: m.thresholds,
    trend: trendFor(m),
    minutesSinceFlagged: minutesSinceFlagged(m),
    recentEvents: recentEventsFor(m.label),
  }));
}
