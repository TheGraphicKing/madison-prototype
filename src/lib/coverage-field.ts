// Tiles for the coverage field and map, generated from position.json.
// by_regulation gives counts for 14 regulations; the rest of each state's total is spread
// over the other watched regulations by their duties on record (largest remainder), so the
// field adds up to exactly 1,894.
import { duties, position, regulations } from "@/data";
import type { CoverageState } from "@/data/types";

export type FourState = "covered" | "not_yet_confirmed" | "nothing_behind" | "known_gap";
export const STATES: FourState[] = ["covered", "not_yet_confirmed", "nothing_behind", "known_gap"];

export interface Plot {
  regulationId: string;
  citation: string;
  title: string;
  short: string;
  counts: Record<FourState, number>;
  total: number;
  /** real duties from duties.json that belong to this regulation */
  dutyIds: string[];
}

export interface Tile {
  i: number;
  plot: number;
  state: FourState;
  /** index inside its plot */
  k: number;
  dutyId?: string;
}

function shortName(title: string) {
  const m = title.match(/\(([^)]+)\)/);
  return m ? m[1] : title;
}

let cached: { plots: Plot[]; tiles: Tile[] } | null = null;

export function coverageField() {
  if (cached) return cached;
  const pos = position();
  const byReg = new Map(pos.by_regulation.map((r) => [r.regulation_id, r]));
  const rest = regulations.filter((r) => !byReg.has(r.id));
  const remaining: Record<FourState, number> = {
    covered: pos.covered,
    not_yet_confirmed: pos.not_yet_confirmed,
    nothing_behind: pos.nothing_behind,
    known_gap: pos.known_gap,
  };
  for (const r of pos.by_regulation) for (const s of STATES) remaining[s] -= r[s];

  const weight = rest.reduce((n, r) => n + r.duties_on_record, 0);
  const spread: Record<string, Record<FourState, number>> = {};
  for (const r of rest) spread[r.id] = { covered: 0, not_yet_confirmed: 0, nothing_behind: 0, known_gap: 0 };
  for (const s of STATES) {
    const exact = rest.map((r) => (remaining[s] * r.duties_on_record) / weight);
    const floor = exact.map(Math.floor);
    let left = remaining[s] - floor.reduce((a, b) => a + b, 0);
    const order = exact.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f || a.i - b.i);
    for (const o of order) {
      if (left <= 0) break;
      floor[o.i]++;
      left--;
    }
    rest.forEach((r, i) => (spread[r.id][s] = floor[i]));
  }

  const plots: Plot[] = regulations.map((r) => {
    const src = byReg.get(r.id);
    const counts = src ? { covered: src.covered, not_yet_confirmed: src.not_yet_confirmed, nothing_behind: src.nothing_behind, known_gap: src.known_gap } : spread[r.id];
    const prefix = r.citation.replace(/ Subpart.*/, "");
    return {
      regulationId: r.id,
      citation: r.citation,
      title: r.title,
      short: shortName(r.title),
      counts,
      total: STATES.reduce((n, s) => n + counts[s], 0),
      dutyIds: r.citation.includes("Subpart") ? [] : duties.filter((d) => d.citation.startsWith(prefix + ".") || d.citation.startsWith(prefix + " ")).map((d) => d.id),
    };
  });

  const tiles: Tile[] = [];
  plots.forEach((p, pi) => {
    // known gaps and nothing-behind first, so the trouble sits at the front of each plot
    const order: FourState[] = ["known_gap", "nothing_behind", "not_yet_confirmed", "covered"];
    let k = 0;
    const realByState = new Map<FourState, string[]>();
    for (const id of p.dutyIds) {
      const d = duties.find((x) => x.id === id)!;
      const st = d.coverage_state as CoverageState;
      if ((STATES as string[]).includes(st)) (realByState.get(st as FourState) ?? realByState.set(st as FourState, []).get(st as FourState)!).push(id);
    }
    for (const s of order) {
      const real = [...(realByState.get(s) ?? [])];
      for (let n = 0; n < p.counts[s]; n++) tiles.push({ i: tiles.length, plot: pi, state: s, k: k++, dutyId: real.shift() });
    }
  });
  cached = { plots, tiles };
  return cached;
}

/** Shelf layout of plots on the plane; each plot is a square-ish grid of tiles. */
export function plotLayout(plots: Plot[], tile = 0.12, gap = 0.03, plotGap = 0.55, maxRowWidth = 9.2) {
  const cell = tile + gap;
  const dims = plots.map((p) => {
    const cols = Math.max(4, Math.ceil(Math.sqrt(p.total * 1.4)));
    const rows = Math.ceil(p.total / cols);
    return { cols, rows, w: cols * cell, d: rows * cell };
  });
  const order = plots.map((_, i) => i).sort((a, b) => dims[b].d - dims[a].d || a - b);
  const pos: { x: number; z: number; cols: number; rows: number; w: number; d: number }[] = new Array(plots.length);
  let x = 0;
  let z = 0;
  let rowDepth = 0;
  for (const i of order) {
    const dm = dims[i];
    if (x > 0 && x + dm.w > maxRowWidth) {
      x = 0;
      z += rowDepth + plotGap + 0.25;
      rowDepth = 0;
    }
    pos[i] = { x, z, ...dm };
    x += dm.w + plotGap;
    rowDepth = Math.max(rowDepth, dm.d);
  }
  const width = Math.max(...pos.map((p) => p.x + p.w));
  const depth = Math.max(...pos.map((p) => p.z + p.d));
  return { pos, width, depth, cell, tile };
}
