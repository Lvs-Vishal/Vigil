"use client";

import { useRef, useState } from "react";
import { fmtNumber } from "@/lib/data";
import { fmtClockShort } from "./utils";
import type { ChartThreshold } from "./utils";

export interface SparkChartPoint {
  t: string;
  v: number;
}

export interface SparkChartProps {
  points: SparkChartPoint[];
  /** A CSS color, typically `var(--series-N)` from `seriesColorFor(slug)`. */
  color: string;
  unit: string;
  thresholds?: ChartThreshold[];
  ariaLabel: string;
  /** Tailwind height class for the outer box, e.g. "h-[108px]" or "h-[118px]". */
  heightClassName?: string;
}

const VIEW_W = 600;
const VIEW_H = 180;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 12;

/**
 * Reusable SVG line/area chart with hover crosshair + tooltip. One axis per
 * chart, always — callers that need two metrics (e.g. temperature +
 * humidity) render two separate <SparkChart> instances, never a dual-axis
 * combo.
 *
 * Mark spec (ported from the reference build): 2px line, >=8px-diameter end
 * marker with a 2px surface-color ring, hairline gridlines at 25/50/75%,
 * ~10% opacity area fill, dashed threshold lines with matching labels.
 */
export function SparkChart({ points, color, unit, thresholds = [], ariaLabel, heightClassName = "h-[108px]" }: SparkChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const focusIdxRef = useRef(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length === 0) {
    return <div className={`relative w-full ${heightClassName}`} />;
  }

  const vals = points.map((p) => p.v);
  const threshVals = thresholds.map((t) => t.value);
  let min = Math.min(...vals, ...threshVals);
  let max = Math.max(...vals, ...threshVals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  min -= range * 0.1;
  max += range * 0.14;

  const x = (i: number) => PAD_L + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (VIEW_W - PAD_L - PAD_R));
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * (VIEW_H - PAD_T - PAD_B);

  let linePath = "";
  points.forEach((p, i) => {
    linePath += `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.v).toFixed(2)} `;
  });
  const baseY = (VIEW_H - PAD_B).toFixed(2);
  const areaPath = `${linePath}L${x(points.length - 1).toFixed(2)},${baseY} L${x(0).toFixed(2)},${baseY} Z`;

  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.v);

  function idxFromClientX(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return points.length - 1;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * VIEW_W;
    const frac = (relX - PAD_L) / (VIEW_W - PAD_L - PAD_R);
    return Math.round(frac * (points.length - 1));
  }

  function showAt(idx: number) {
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null;
  const hoverX = hoverIdx != null ? x(hoverIdx) : 0;
  const hoverY = hoverPoint ? y(hoverPoint.v) : 0;

  return (
    <div className={`relative w-full ${heightClassName}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="block h-full w-full cursor-crosshair touch-none outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal focus-visible:outline-offset-2"
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => showAt(idxFromClientX(e.clientX))}
        onPointerLeave={() => setHoverIdx(null)}
        onFocus={() => setHoverIdx(points.length - 1)}
        onBlur={() => setHoverIdx(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            focusIdxRef.current = Math.max(0, (focusIdxRef.current || points.length - 1) - 1);
            showAt(focusIdxRef.current);
            e.preventDefault();
          } else if (e.key === "ArrowRight") {
            focusIdxRef.current = Math.min(points.length - 1, (focusIdxRef.current || 0) + 1);
            showAt(focusIdxRef.current);
            e.preventDefault();
          }
        }}
      >
        <g aria-hidden="true">
          {[0.25, 0.5, 0.75].map((f) => {
            const ly = PAD_T + f * (VIEW_H - PAD_T - PAD_B);
            return (
              <line
                key={f}
                x1={PAD_L}
                x2={VIEW_W - PAD_R}
                y1={ly}
                y2={ly}
                stroke="var(--border)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            );
          })}
        </g>
        <g aria-hidden="true">
          {thresholds.map((t) => {
            const ty = y(t.value);
            return (
              <g key={`${t.status}-${t.value}`}>
                <line
                  x1={PAD_L}
                  x2={VIEW_W - PAD_R}
                  y1={ty}
                  y2={ty}
                  stroke={`var(--${t.status})`}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.75}
                />
                <text
                  x={VIEW_W - PAD_R}
                  y={ty - 3.5}
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                  fontSize={8.5}
                  fill={`var(--${t.status})`}
                  opacity={0.95}
                  paintOrder="stroke fill"
                  stroke="var(--surface)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                >
                  {t.label}
                </text>
              </g>
            );
          })}
        </g>
        <path d={areaPath} fill={color} stroke="none" opacity={0.1} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
        {hoverIdx != null && (
          <>
            <line x1={hoverX} x2={hoverX} y1={6} y2={VIEW_H - 6} stroke="var(--ink-muted)" strokeWidth={1} />
            <circle cx={hoverX} cy={hoverY} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="transparent" />
      </svg>
      {hoverPoint && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[115%] whitespace-nowrap rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] shadow-lg shadow-black/40"
          style={{ left: `${(hoverX / VIEW_W) * 100}%`, top: `${(hoverY / VIEW_H) * 100}%` }}
        >
          <div className="tabular-nums text-[12.5px] font-medium text-ink">
            {fmtNumber(hoverPoint.v)} {unit}
          </div>
          <div className="mt-0.5 text-[10px] text-ink-muted">{fmtClockShort(hoverPoint.t)} UTC</div>
        </div>
      )}
    </div>
  );
}
