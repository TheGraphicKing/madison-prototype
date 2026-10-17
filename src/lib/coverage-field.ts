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

// ---------- the live field: what the demo changed, applied on top of the seed ----------
import { useMemo } from "react";
import { getChange } from "@/data";
import { useStore } from "./store";

export interface LiveTile extends Tile {
  /** added by a run during this demo (the Reg E obligations) */
  fresh?: boolean;
}

/** Obligations that belong in the field: accepted, in scope, from a change Madison has worked on. */
function inField(dutyId: string, ruleRunDone: boolean) {
  const d = duties.find((x) => x.id === dutyId);
  if (!d || d.applicability !== "in_scope" || !(STATES as string[]).includes(d.coverage_state)) return false;
  if (d.change_id === "RC-2026-014") return ruleRunDone;
  const c = getChange(d.change_id);
  return Boolean(c && !["new", "duties", "screened_out", "uncertain"].includes(c.state));
}

export function liveField(states: Record<string, CoverageState>, ruleRunDone: boolean) {
  const base = coverageField();
  const plots: Plot[] = base.plots.map((p) => ({ ...p, counts: { ...p.counts } }));
  let tiles: LiveTile[] = base.tiles.map((t) => ({ ...t }));
  const named = new Set(tiles.map((t) => t.dutyId).filter(Boolean));
  const plotHasNamed = new Set(tiles.filter((t) => t.dutyId).map((t) => t.plot));

  // every named obligation gets a block of its own state; totals stay the same by swapping
  // with an unnamed block of that state in a plot that names nothing
  plots.forEach((p, pi) => {
    for (const id of p.dutyIds) {
      if (named.has(id) || !inField(id, false)) continue;
      const st = duties.find((x) => x.id === id)!.coverage_state as FourState;
      const here = tiles.find((t) => t.plot === pi && !t.dutyId && t.state !== st);
      const there = tiles.find((t) => !plotHasNamed.has(t.plot) && t.plot !== pi && !t.dutyId && t.state === st);
      if (!here || !there) continue;
      there.state = here.state;
      here.state = st;
      here.dutyId = id;
      named.add(id);
    }
  });

  // the Reg E run adds its six obligations to the Reg E plot
  if (ruleRunDone) {
    const pi = plots.findIndex((p) => p.regulationId === "reg-01");
    let k = tiles.filter((t) => t.plot === pi).length;
    for (const d of duties.filter((x) => x.change_id === "RC-2026-014" && inField(x.id, true))) {
      tiles.push({ i: 0, plot: pi, state: d.coverage_state as FourState, k: k++, dutyId: d.id, fresh: true });
    }
  }

  // what people changed during the demo
  for (const t of tiles) if (t.dutyId && states[t.dutyId] && (STATES as string[]).includes(states[t.dutyId])) t.state = states[t.dutyId] as FourState;

  // trouble first inside each plot, then recount
  const order: Record<FourState, number> = { known_gap: 0, nothing_behind: 1, not_yet_confirmed: 2, covered: 3 };
  // fresh blocks go last, so they land after the blocks that were already there
  const byPlot = plots.map((_, pi) => tiles.filter((t) => t.plot === pi).sort((a, b) => Number(Boolean(a.fresh)) - Number(Boolean(b.fresh)) || order[a.state] - order[b.state]));
  tiles = byPlot.flatMap((list) => list.map((t, k) => ({ ...t, k })));
  tiles.forEach((t, i) => (t.i = i));
  plots.forEach((p, pi) => {
    for (const s of STATES) p.counts[s] = byPlot[pi].filter((t) => t.state === s).length;
    p.total = byPlot[pi].length;
  });
  return { plots, tiles };
}

export function useLiveField() {
  const states = useStore((s) => s.obligationStates);
  const ruleRunDone = useStore((s) => Boolean(s.finishedRuns["run-rule-1005"]));
  return useMemo(() => liveField(states, ruleRunDone), [states, ruleRunDone]);
}
