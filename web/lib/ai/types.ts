export type InsightSeverity = "info" | "warning" | "critical";

export interface Insight {
  moduleSlug: string;
  moduleLabel: string;
  severity: InsightSeverity;
  title: string;
  body: string;
}

export interface InsightsResult {
  insights: Insight[];
  source: "ollama" | "heuristic";
  model?: string;
  error?: string;
}

// What we hand to the generator for each module — just enough context for a
// useful insight, nothing invented.
export interface ModuleSnapshot {
  slug: string;
  label: string;
  sensorChip: string;
  metricKey: string;
  unit: string;
  latest: number;
  status: "good" | "warning" | "critical";
  thresholds: Partial<Record<"warn_above" | "crit_above" | "warn_below" | "crit_below", number>>;
  trend: "rising" | "falling" | "flat";
  minutesSinceFlagged: number | null;
  recentEvents: string[];
}
