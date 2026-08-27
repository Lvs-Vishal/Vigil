// Canonical Nodeframe seed data — single source of truth for the marketing
// site, the dashboard, and the AI-insights API route. Do not fork this data.
//
// This reflects the real hackathon build: 4 sensors are physically wired to
// the ESP32 (power budget caps it there); 4 more plugin manifests exist and
// are shown honestly as "not installed" — no fabricated community authors,
// no fabricated install counts anywhere in this file.
import raw from "./seed-data.json";
import { supabase } from "./supabase";

export type ThresholdKey = "warn_above" | "crit_above" | "warn_below" | "crit_below";
export type Status = "good" | "warning" | "critical";

export interface SeriesPoint {
  t: string;
  v: number;
}

export interface Module {
  id: string;
  slug: string;
  label: string;
  slot: string;
  sensor_chip: string;
  metric_key: string;
  unit: string;
  author: string;
  status: Status;
  latest: number;
  thresholds: Partial<Record<ThresholdKey, number>>;
  series: SeriesPoint[];
  connected_at: string;
}

export interface SystemEvent {
  t: string;
  type: string;
  severity: "info" | "warning" | "critical";
  module: string;
  message: string;
}

export interface MarketplacePlugin {
  slug: string;
  name: string;
  sensor_chip?: string;
  category: string;
  author: string;
  installed: boolean;
  description: string;
  target_slot?: string;
  metric_key?: string | null;
  unit?: string | null;
  thresholds?: Partial<Record<ThresholdKey, number>>;
}

export interface SeedData {
  generated_at: string;
  core: {
    name: string;
    firmware: string;
    uptime_hours: number;
    slots_total: number;
    slots_used: number;
  };
  modules: Module[];
  events: SystemEvent[];
  marketplace: MarketplacePlugin[];
}

export const seed = raw as unknown as SeedData;

export async function fetchLiveSeedData(): Promise<SeedData> {
  if (!supabase) {
    console.warn("Supabase credentials missing. Falling back to static seed data.");
    return seed;
  }
  
  try {
    const [pluginsRes, modulesRes, readingsRes, eventsRes] = await Promise.all([
      supabase.from("plugins").select("*"),
      supabase.from("modules").select("*"),
      supabase.from("readings").select("*").order("recorded_at", { ascending: false }).limit(500),
      supabase.from("events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    if (pluginsRes.error) throw pluginsRes.error;
    if (modulesRes.error) throw modulesRes.error;
    if (readingsRes.error) throw readingsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const plugins = pluginsRes.data;
    const modulesData = modulesRes.data;
    const readings = readingsRes.data;
    const events = eventsRes.data;

    const marketplace: MarketplacePlugin[] = plugins.map((p: any) => ({
      slug: p.slug,
      name: p.name,
      sensor_chip: p.sensor_chip,
      category: p.category,
      author: p.author,
      installed: modulesData.some((m: any) => m.plugin_slug === p.slug),
      description: p.description,
      target_slot: p.target_slot,
      metric_key: p.metric_key,
      unit: p.unit,
      thresholds: {
        warn_above: p.warn_above,
        crit_above: p.crit_above,
        warn_below: p.warn_below,
        crit_below: p.crit_below,
      },
    }));

    const modules: Module[] = modulesData.map((m: any) => {
      const p = plugins.find((pl: any) => pl.slug === m.plugin_slug);
      const seedMod = seed.modules.find((sm) => sm.slug === m.plugin_slug || sm.id === m.id);
      
      const targetMetricKey = p?.metric_key || seedMod?.metric_key || "";

      const modReadings = readings
        .filter((r: any) => r.module_id === m.id && (!targetMetricKey || r.metric_key === targetMetricKey))
        .slice(0, 30)
        .reverse();

      const latestReading =
        modReadings.length > 0
          ? modReadings[modReadings.length - 1].value
          : seedMod?.latest ?? 0;
      
      const series: SeriesPoint[] =
        modReadings.length > 0
          ? modReadings.map((r: any) => ({
              t: r.recorded_at,
              v: r.value,
            }))
          : seedMod?.series ?? [];

      return {
        id: m.id,
        slug: m.plugin_slug,
        label: m.label || seedMod?.label || m.plugin_slug,
        slot: m.slot || p?.target_slot || seedMod?.slot || "A1",
        sensor_chip: p?.sensor_chip || seedMod?.sensor_chip || "",
        metric_key: p?.metric_key || seedMod?.metric_key || "",
        unit: p?.unit || seedMod?.unit || "",
        author: p?.author || seedMod?.author || "nodeframe-core",
        status: (m.status as Status) || seedMod?.status || "good",
        latest: latestReading,
        thresholds: {
          warn_above: p?.warn_above ?? seedMod?.thresholds?.warn_above,
          crit_above: p?.crit_above ?? seedMod?.thresholds?.crit_above,
          warn_below: p?.warn_below ?? seedMod?.thresholds?.warn_below,
          crit_below: p?.crit_below ?? seedMod?.thresholds?.crit_below,
        },
        series,
        connected_at: m.connected_at || new Date().toISOString(),
      };
    });

    const sysEvents: SystemEvent[] = events.map((e: any) => {
      const m = modulesData.find((mod: any) => mod.id === e.module_id);
      return {
        t: e.created_at,
        type: e.event_type,
        severity: e.severity as "info" | "warning" | "critical",
        module: m?.label || "System",
        message: e.message,
      };
    });

    return {
      generated_at: new Date().toISOString(),
      core: {
        name: seed.core.name,
        firmware: seed.core.firmware,
        uptime_hours: seed.core.uptime_hours,
        slots_total: seed.core.slots_total,
        slots_used: modules.length,
      },
      modules,
      events: sysEvents,
      marketplace,
    };
  } catch (err) {
    console.warn("Failed to fetch live Supabase data, falling back to static seed.", err);
    return seed;
  }
}

// Fixed categorical series order — one hue per INSTALLED module, in slot
// order. Keep identical everywhere a module gets a chart color.
export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
] as const;

const MODULE_ORDER = ["sound-level", "ambient-light", "temperature", "proximity"] as const;

export function seriesColorFor(slug: string): string {
  const idx = MODULE_ORDER.indexOf(slug as (typeof MODULE_ORDER)[number]);
  return SERIES_COLORS[idx === -1 ? 0 : idx];
}

export function modulesInSlotOrder(data: SeedData = seed): Module[] {
  return [...data.modules].sort((a, b) => (a.slot < b.slot ? -1 : 1));
}

export function fmtNumber(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(n < 10 ? 2 : 1);
}

export function uptimeLabel(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return `${days}d ${rem}h`;
}

export interface DashboardStats {
  activeModules: number;
  totalSlots: number;
  openAlerts: number;
  warningCount: number;
  criticalCount: number;
  avgSamplesPerHour: number;
  uptime: string;
}

export function computeStats(data: SeedData = seed): DashboardStats {
  const modules = data.modules;
  const warningCount = modules.filter((m) => m.status === "warning").length;
  const criticalCount = modules.filter((m) => m.status === "critical").length;
  return {
    activeModules: modules.length,
    totalSlots: data.core.slots_total,
    openAlerts: warningCount + criticalCount,
    warningCount,
    criticalCount,
    avgSamplesPerHour: 30, // one sample every 2 minutes
    uptime: uptimeLabel(data.core.uptime_hours),
  };
}

// Marketing-site stats — plain facts about the running demo. No fabricated
// customer/testimonial/install-count data anywhere.
export function marketingStats(data: SeedData = seed) {
  const installed = data.marketplace.filter((p) => p.installed).length;
  const readyToInstall = data.marketplace.filter((p) => !p.installed).length;
  return {
    modulesLive: data.modules.length,
    slotsTotal: data.core.slots_total,
    pluginsInMarketplace: data.marketplace.length,
    pluginsInstalled: installed,
    readyToInstall,
  };
}

// Flagged modules right now — the input to the AI-insights feature and to
// any "needs attention" UI. A module is "flagged" if it's warning/critical.
export function flaggedModules(data: SeedData = seed): Module[] {
  return data.modules.filter((m) => m.status !== "good");
}
