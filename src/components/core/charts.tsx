"use client";

import { scaleLinear } from "d3-scale";
import { curveLinear, curveStepAfter, line } from "d3-shape";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** A tiny line; for the observability strip and small trend marks. */
export function Sparkline({
  values,
  width = 120,
  height = 24,
  step,
  className,
  stroke = "var(--ink2)",
}: {
  values: number[];
  width?: number;
  height?: number;
  step?: boolean;
  className?: string;
  stroke?: string;
}) {
  if (values.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = scaleLinear().domain([0, values.length - 1]).range([1, width - 3]);
  const y = scaleLinear().domain([min, max === min ? min + 1 : max]).range([height - 2, 2]);
  const d = line<number>()
    .x((_, i) => x(i))
    .y((v) => y(v))
    .curve(step ? curveStepAfter : curveLinear)(values)!;
  const last = values.length - 1;
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={x(last) - 2} y={y(values[last]) - 2} width={4} height={4} fill="var(--ink)" />
    </svg>
  );
}

export type StepPoint = { x: string; y: number; note?: string };

/**
 * The Yukon progress chart: a step line, ringed points, and a pill on the newest point
 * in --highlight. Vertical hairlines per x; a dashed "now" line at the end.
 */
export function StepChart({
  points,
  yMin,
  yMax,
  width = 560,
  height = 220,
  xLabels = true,
  latestLabel = "Latest",
  formatY = (v) => String(v),
  className,
  ariaLabel,
  ticks = 4,
  slots,
  compact,
}: {
  points: StepPoint[];
  yMin?: number;
  yMax?: number;
  width?: number;
  height?: number;
  xLabels?: boolean | "ends";
  latestLabel?: string;
  formatY?: (v: number) => string;
  className?: string;
  ariaLabel: string;
  ticks?: number;
  /** total number of x slots; points beyond the data stay empty, so the chart can fill as it plays */
  slots?: number;
  compact?: boolean;
}) {
  const id = useId();
  const padL = compact ? 24 : 44;
  const padR = compact ? 30 : 64;
  const padT = compact ? 26 : 34;
  const padB = xLabels ? 26 : 10;
  const n = Math.max(slots ?? points.length, 2);
  const ys = points.map((p) => p.y);
  const lo = yMin ?? Math.min(...ys, 0);
  const hi = yMax ?? Math.max(...ys, 1);
  const x = scaleLinear().domain([0, n - 1]).range([padL, width - padR]);
  const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([height - padB, padT]);
  const extended = points.length ? [...points, { ...points[points.length - 1] }] : [];
  const d =
    points.length > 0
      ? line<StepPoint>()
          .x((_, i) => x(Math.min(i, points.length - 1) + (i === points.length ? 0.5 : 0)))
          .y((p) => y(p.y))
          .curve(curveStepAfter)(extended)
      : null;
  const last = points.length - 1;
  const tickVals = y.ticks(ticks);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className={cn("block overflow-visible", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      {/* grid */}
      {Array.from({ length: n }).map((_, i) => (
        <line key={`v${i}`} x1={x(i)} x2={x(i)} y1={padT - 8} y2={height - padB} stroke="var(--line)" strokeWidth={1} />
      ))}
      {!compact
        ? tickVals.map((t) => (
            <g key={`t${t}`}>
              <line x1={padL} x2={width - padR + 20} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="1 3" />
              <text x={padL - 10} y={y(t) + 3.5} textAnchor="end" className="fill-ink3 font-mono text-[10px] tabular-nums">
                {formatY(t)}
              </text>
            </g>
          ))
        : null}
      {/* now line */}
      {last >= 0 ? (
        <line
          x1={x(last) + (compact ? 14 : 22)}
          x2={x(last) + (compact ? 14 : 22)}
          y1={padT - 12}
          y2={height - padB}
          stroke="var(--lineStrong)"
          strokeDasharray="2 3"
        />
      ) : null}
      {d ? <path id={`${id}-p`} d={d} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="miter" /> : null}
      {points.map((p, i) => {
        const isLast = i === last;
        return (
          <g key={`${p.x}-${i}`}>
            <circle cx={x(i)} cy={y(p.y)} r={isLast ? 6.5 : 4.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.25} />
            <circle cx={x(i)} cy={y(p.y)} r={isLast ? 3 : 1.75} fill={isLast ? "var(--highlight)" : "var(--ink)"} stroke={isLast ? "var(--ink)" : "none"} strokeWidth={1} />
          </g>
        );
      })}
      {last >= 0 ? (
        <g transform={`translate(${x(last)} ${y(points[last].y) - (compact ? 16 : 20)})`}>
          <LatestPill label={`${latestLabel} · ${formatY(points[last].y)}`} compact={compact} />
        </g>
      ) : null}
      {xLabels
        ? points.map((p, i) =>
            xLabels === "ends" && i !== 0 && i !== last ? null : (
              <text
                key={`xl${i}`}
                x={x(i)}
                y={height - 8}
                textAnchor={i === 0 && xLabels === "ends" ? "start" : "middle"}
                className="fill-ink3 font-mono text-[10px] tracking-[0.08em] uppercase"
              >
                {p.x}
              </text>
            ),
          )
        : null}
    </svg>
  );
}

function LatestPill({ label, compact }: { label: string; compact?: boolean }) {
  const w = label.length * (compact ? 5.9 : 6.4) + 16;
  const h = compact ? 16 : 18;
  return (
    <g transform={`translate(${-w / 2} ${-h})`}>
      <rect width={w} height={h} rx={h / 2} fill="var(--highlight)" />
      <text x={w / 2} y={h / 2 + 3.5} textAnchor="middle" className="fill-highlight-ink font-mono text-[10px] font-medium">
        {label}
      </text>
    </g>
  );
}
