// Deterministic, rule-based insight generator. Doubles as (a) the response
// when nothing is flagged — skip the model call entirely — and (b) the
// fallback whenever Ollama is unreachable, slow, or returns something we
// can't parse. Shape-compatible with what the model produces, so the UI
// never needs to know which source it got.
import type { Insight, ModuleSnapshot } from "./types";

interface Rule {
  match: (s: ModuleSnapshot) => boolean;
  build: (s: ModuleSnapshot) => Pick<Insight, "title" | "body">;
}

function fmtValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function durationPhrase(mins: number | null): string {
  if (mins === null) return "moments";
  if (mins < 2) return "under a minute";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const RULES: Rule[] = [
  {
    match: (s) => s.metricKey === "temperature",
    build: (s) => {
      const dur = durationPhrase(s.minutesSinceFlagged);
      const climbing = s.trend === "rising";
      return {
        title: s.status === "critical" ? "Overheating — action needed" : "Running hot",
        body:
          `${s.label} has read ${fmtValue(s.latest)}${s.unit} for the last ${dur}` +
          `${climbing ? " and is still climbing" : ""}. ` +
          (s.status === "critical"
            ? "Past the critical threshold — check cooling and airflow now."
            : "Keep an eye on airflow around the enclosure; it's trending toward the critical line."),
      };
    },
  },
  {
    match: (s) => s.metricKey === "sound_level",
    build: (s) => {
      const dur = durationPhrase(s.minutesSinceFlagged);
      return {
        title: s.status === "critical" ? "Abnormal noise — likely mechanical fault" : "Sustained unusual noise",
        body:
          `${s.label} has held at ${fmtValue(s.latest)}${s.unit} — steady, not a spike — for ${dur}. ` +
          "A flat, elevated noise floor like this usually points to bearing wear or a loose part rather than a one-off event. Worth a physical check.",
      };
    },
  },
  {
    match: (s) => s.metricKey === "distance_cm",
    build: (s) => {
      const dur = durationPhrase(s.minutesSinceFlagged);
      return {
        title: s.status === "critical" ? "Object intrusion — safety zone breached" : "Object closer than expected",
        body: `${s.label} has read ${fmtValue(s.latest)}${s.unit} — inside its clearance zone — for ${dur}. Confirm nothing is obstructing the zone before resuming normal operation.`,
      };
    },
  },
  {
    match: (s) => s.metricKey === "lux",
    build: (s) => {
      const dur = durationPhrase(s.minutesSinceFlagged);
      return {
        title: s.status === "critical" ? "Ambient light spike" : "Ambient light elevated",
        body: `${s.label} has read ${fmtValue(s.latest)} ${s.unit} for ${dur}, above its expected range. Check for a stuck light source or a shift in the sensor's field of view.`,
      };
    },
  },
];

function genericInsight(s: ModuleSnapshot): Pick<Insight, "title" | "body"> {
  const dur = durationPhrase(s.minutesSinceFlagged);
  return {
    title: s.status === "critical" ? `${s.label} — critical` : `${s.label} — needs attention`,
    body: `${s.label} has read ${fmtValue(s.latest)}${s.unit} for ${dur}, outside its expected range.`,
  };
}

export function heuristicInsights(snapshots: ModuleSnapshot[]): Insight[] {
  const flagged = snapshots.filter((s) => s.status !== "good");

  if (flagged.length === 0) {
    return [
      {
        moduleSlug: "system",
        moduleLabel: "All modules",
        severity: "info",
        title: "All systems nominal",
        body: `All ${snapshots.length} installed modules are reading within normal range. No action needed right now.`,
      },
    ];
  }

  return [...flagged]
    .sort((a, b) => (a.status === "critical" ? -1 : 1) - (b.status === "critical" ? -1 : 1))
    .map((s) => {
      const rule = RULES.find((r) => r.match(s));
      const { title, body } = rule ? rule.build(s) : genericInsight(s);
      return {
        moduleSlug: s.slug,
        moduleLabel: s.label,
        severity: s.status as Insight["severity"],
        title,
        body,
      };
    });
}
