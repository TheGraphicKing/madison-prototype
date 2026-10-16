"use client";

import { useEffect, useState } from "react";

/**
 * Path geometry cache. Points along an SVG path, computed once per path string and
 * sampled into a lookup table so dozens of packets can move at 60 fps without layout.
 */
const SAMPLES = 96;
const cache = new Map<string, { pts: [number, number][]; length: number }>();
let host: SVGSVGElement | null = null;

function sample(d: string) {
  const hit = cache.get(d);
  if (hit) return hit;
  if (typeof document === "undefined") return { pts: [[0, 0]] as [number, number][], length: 0 };
  if (!host) {
    host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.setAttribute("width", "0");
    host.setAttribute("height", "0");
    host.style.position = "absolute";
    host.style.visibility = "hidden";
    document.body.appendChild(host);
  }
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  host.appendChild(p);
  const length = p.getTotalLength();
  const pts: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const pt = p.getPointAtLength((length * i) / SAMPLES);
    pts.push([pt.x, pt.y]);
  }
  host.removeChild(p);
  const v = { pts, length };
  cache.set(d, v);
  return v;
}

export function pointOnPath(d: string, progress: number): [number, number] {
  const { pts } = sample(d);
  const t = Math.min(1, Math.max(0, progress)) * (pts.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = pts[i];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export function pathLength(d: string) {
  return sample(d).length;
}

/**
 * A 4 to 5 px square at a given progress along a path. Driven by the run player,
 * so seeking places it exactly.
 */
export function Packet({
  d,
  progress,
  size = 5,
  color = "var(--ink)",
  label,
  onHover,
  dim,
  emphasis,
}: {
  d: string;
  progress: number;
  size?: number;
  color?: string;
  label?: string;
  onHover?: (on: boolean) => void;
  dim?: boolean;
  emphasis?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  const [x, y] = pointOnPath(d, progress);
  const s = emphasis ? size + 1 : size;
  return (
    <g
      transform={`translate(${x - s / 2} ${y - s / 2})`}
      style={{ opacity: dim ? 0.25 : 1, transition: "opacity 120ms" }}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
    >
      {/* a larger invisible hit area for hover */}
      <rect x={-5} y={-5} width={s + 10} height={s + 10} fill="transparent" />
      <rect width={s} height={s} fill={color} />
      {label ? <title>{label}</title> : null}
    </g>
  );
}

/** A free-running packet, for decorative loops (the gallery, idle states). */
export function LoopPacket({
  d,
  duration = 1.2,
  delay = 0,
  size = 5,
  color = "var(--ink)",
}: {
  d: string;
  duration?: number;
  delay?: number;
  size?: number;
  color?: string;
}) {
  return (
    <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={color}>
      <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" path={d} />
    </rect>
  );
}
