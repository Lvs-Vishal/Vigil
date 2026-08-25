"use client";

import { useCallback, useEffect, useState } from "react";
import type { Insight, InsightsResult } from "@/lib/ai/types";
import { severityIcon } from "./icons";

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

export function AIInsights() {
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
    // One-time fetch on mount (and on manual refresh via the button below,
    // which calls `load` directly rather than through this effect). The
    // setState calls inside `load` are async-callback-driven, not a
    // synchronous effect body — matching the pattern already used for the
    // dashboard's own load-time effect in DashboardApp.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
