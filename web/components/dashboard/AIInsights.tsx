"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Insight, InsightsResult } from "@/lib/ai/types";
import type { ModuleRuntime } from "./utils";
import { severityIcon } from "./icons";

// ── Rolling-average anomaly detector ────────────────────────────────────────
// For each module: compute the mean of the last 10 series values, then check
// if the latest reading spikes above 1.5× that mean. This is the "fake ML"
// threshold the brief calls for — deterministic, no model, zero latency.
const SPIKE_RATIO = 1.5;
const ROLLING_WINDOW = 10;

interface AnomalyHit {
  label: string;
  latest: number;
  rollingAvg: number;
  unit: string;
  ratio: number;
}

function detectAnomalies(modules: ModuleRuntime[]): AnomalyHit[] {
  const hits: AnomalyHit[] = [];
  for (const m of modules) {
    if (!m.series || m.series.length < 2) continue;
    const window = m.series.slice(-ROLLING_WINDOW);
    const avg = window.reduce((sum, p) => sum + p.v, 0) / window.length;
    if (avg <= 0) continue; // guard against divide-by-zero / nonsense baseline
    const latest = m.latest ?? m.series[m.series.length - 1].v;
    const ratio = latest / avg;
    if (ratio >= SPIKE_RATIO) {
      hits.push({
        label: m.def.label,
        latest,
        rollingAvg: Math.round(avg * 10) / 10,
        unit: m.def.unit,
        ratio: Math.round(ratio * 100) / 100,
      });
    }
  }
  // Sort worst spike first.
  return hits.sort((a, b) => b.ratio - a.ratio);
}

// ── Sub-components ───────────────────────────────────────────────────────────

const SEVERITY_CLASSES: Record<Insight["severity"], string> = {
  info: "border-teal/30 bg-teal/6",
  warning: "border-warning/35 bg-warning/7",
  critical: "border-critical/40 bg-critical/9",
};

const SEVERITY_ICON_COLOR: Record<Insight["severity"], string> = {
  info: "text-teal",
  warning: "text-warning",
  critical: "text-critical",
};

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`flex gap-3 rounded-[9px] border px-4 py-3.5 ${SEVERITY_CLASSES[insight.severity]}`}>
      <div className={`mt-0.5 flex-none ${SEVERITY_ICON_COLOR[insight.severity]}`}>{severityIcon(insight.severity)}</div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-[13.5px] font-semibold text-ink">{insight.title}</span>
          <span className="font-mono text-[10px] tracking-[0.05em] text-ink-muted uppercase">{insight.moduleLabel}</span>
        </div>
        <p className="text-[12.5px] leading-[1.5] text-ink-secondary">{insight.body}</p>
      </div>
    </div>
  );
}

function AnomalyBanner({ hits }: { hits: AnomalyHit[] }) {
  if (hits.length === 0) return null;
  return (
    <div className="mb-4 flex flex-col gap-2">
      {hits.map((hit) => (
        <div
          key={hit.label}
          className="flex items-start gap-3 rounded-[9px] border border-critical/50 bg-critical/10 px-4 py-3"
          role="alert"
          aria-live="polite"
        >
          <span className="mt-0.5 text-[16px] leading-none" aria-hidden="true">✨</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[13px] font-bold text-critical">AI Anomaly Detected</span>
              <span className="font-mono text-[10px] tracking-[0.05em] text-ink-muted uppercase">{hit.label}</span>
            </div>
            <p className="text-[12px] leading-[1.5] text-ink-secondary">
              Current reading of{" "}
              <span className="font-semibold text-ink">
                {hit.latest}
                {hit.unit}
              </span>{" "}
              is <span className="font-semibold text-critical">{hit.ratio}×</span> above the{" "}
              {ROLLING_WINDOW}-sample rolling average of{" "}
              <span className="font-semibold text-ink">
                {hit.rollingAvg}
                {hit.unit}
              </span>
              . Threshold: ≥{SPIKE_RATIO}× baseline.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 rounded-[9px] border border-border bg-surface-2 px-4 py-3.5">
      <div className="mt-0.5 h-3 w-3 flex-none animate-pulse rounded-full bg-border-strong" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-border-strong" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-border-strong" />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function AIInsights({ modules }: { modules: ModuleRuntime[] }) {
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/insights", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const data = (await res.json()) as InsightsResult;
      setResult(data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // One-time fetch on mount. Manual refresh is via the button below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Recompute anomalies whenever the module series update — this is cheap
  // (pure arithmetic on an array ≤ 90 elements) so no debouncing needed.
  const anomalies = useMemo(() => detectAnomalies(modules), [modules]);

  const sourceLabel =
    result?.source === "ollama"
      ? `local model · ${result.model ?? "ollama"}`
      : result
        ? "rule-based fallback"
        : null;

  return (
    <section className="mt-9" aria-labelledby="ai-insights-heading">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="ai-insights-heading"
          className="flex items-center gap-2.5 font-display text-[13px] font-extrabold tracking-[0.08em] text-ink uppercase"
        >
          AI Insights
          {anomalies.length > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-critical/50 bg-critical/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-critical uppercase tracking-[0.04em]">
              ✨ {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3 font-mono text-[12px] text-ink-muted">
          {sourceLabel && <span>{sourceLabel}</span>}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-[5px] border border-border px-2 py-1 text-[11px] tracking-[0.03em] text-ink-secondary uppercase transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-surface px-[18px] py-4">
        <p className="mb-3.5 text-[12px] leading-[1.5] text-ink-muted">
          Generated on-device from live sensor readings by a locally hosted model — nothing leaves the rig. Falls back to a
          rule-based reading automatically if the local model isn&apos;t running.
        </p>

        <AnomalyBanner hits={anomalies} />

        {loading && !result && (
          <div className="flex flex-col gap-2.5">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {failed && !loading && (
          <div className="rounded-[9px] border border-critical/35 bg-critical/8 px-4 py-3.5 text-[12.5px] text-ink-secondary">
            Couldn&apos;t reach the insights API. Try refreshing.
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2.5">
            {result.insights.map((insight, i) => (
              <InsightCard key={`${insight.moduleSlug}-${i}`} insight={insight} />
            ))}
            {result.source === "heuristic" && result.error && (
              <p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">
                local model unavailable ({result.error}) — showing rule-based insights
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
