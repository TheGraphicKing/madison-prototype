"use client";

// The run as a live 3D system, built on the shared scene kit. Sources stand on the left as stacks;
// each step is a low platform on a gentle path. Sections travel as thin sheets, obligations as the
// same rounded blocks used in Coverage, links as thin lines to the policy and control stacks.
// Double-check is a translucent gate with a tray for what it holds back; You decide is a raised
// platform where blocks queue. At the end the obligations settle into the Regulation E plot.
import { Line } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Run } from "@/data/types";
import type { ItemInstance, RunState } from "@/lib/player/derive";
import { agentById, getDuty, position, userById } from "@/data";
import { useStore } from "@/lib/store";
import { stepResult, stepTitle } from "@/lib/run-steps";
import { Typed } from "@/components/core/typed";
import { Blocks, CameraRig, Gate, Label, OverviewButton, Platform, Stage, STATE_VAR, useSceneTokens, type Frame, type Tokens } from "@/components/scene";

const W = 2.1; // platform width
const D = 1.3; // platform depth
const H = 0.12; // platform height
const RAISED = 0.55; // the decision platform
const GAP_X = 4.2;
const ROW_Z = 3.1;

type Group = "block" | "sheet" | "tile";
const GROUP_OF: Record<string, Group> = { duty: "block", draft_part: "block", document: "sheet", section: "sheet", candidate: "sheet", impact: "tile", handoff: "tile" };
const SIZE: Record<Group, [number, number, number]> = { block: [0.24, 0.18, 0.24], sheet: [0.34, 0.016, 0.44], tile: [0.22, 0.04, 0.22] };
const PLOT_PLACES = new Set(["covered", "not_yet_confirmed", "nothing_behind", "known_gap"]);

interface Layout {
  stage: Record<string, { x: number; z: number; top: number; raised: boolean; gate: boolean; row: number; col: number }>;
  source: Record<string, { x: number; z: number; top: number }>;
  tray?: { x: number; z: number };
  plot?: { x: number; z: number };
  out: Record<string, { x: number; z: number }>;
  bounds: Frame;
}

function layoutFor(run: Run): Layout {
  const n = run.stages.length;
  const perRow = n <= 5 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  const x0 = -((perRow - 1) * GAP_X) / 2 + 1.2;
  const stage: Layout["stage"] = {};
  run.stages.forEach((s, i) => {
    const row = Math.floor(i / perRow);
    const col = row % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
    const raised = s.kind === "person";
    stage[s.key] = { x: x0 + col * GAP_X, z: rows === 1 ? -0.8 : row === 0 ? -ROW_Z : ROW_Z, top: raised ? RAISED : H, raised, gate: s.kind === "gate", row, col };
  });
  const srcs = run.sources ?? [];
  const sx = x0 - 6.6;
  const source: Layout["source"] = {};
  srcs.forEach((s, i) => {
    const z = srcs.length === 1 ? 0 : -3.8 + (7.6 * i) / (srcs.length - 1);
    source[s.id] = { x: sx, z, top: 0.42 };
  });
  const g = run.stages.find((s) => s.kind === "gate");
  let tray: Layout["tray"];
  const canHold = run.events.some((e) => e.type === "check" && e.result === "block" && e.kind !== "drift");
  if (g && canHold) {
    const p = stage[g.key];
    tray = p.col === perRow - 1 ? { x: p.x + W / 2 + 1.0, z: p.z } : { x: p.x, z: p.z + D / 2 + 1.0 };
  }
  const xr = x0 + (perRow - 1) * GAP_X;
  const plot = run.id === "run-rule-1005" ? { x: x0 + ((perRow - 1) * GAP_X) / 2, z: -ROW_Z - D / 2 - 2.1 } : undefined;
  const out: Layout["out"] = { out: { x: x0 - 1.6, z: rows === 1 ? 1.6 : ROW_Z + 1.4 }, tprm: { x: xr + 2.6, z: -1.2 }, assurance: { x: xr + 2.6, z: 1.2 } };
  const minX = sx - 2.2;
  const maxX = Math.max(xr + W / 2 + 1.6, tray ? tray.x + 0.8 : -Infinity);
  const minZ = plot ? plot.z - 1.4 : -4.2;
  const maxZ = (rows === 1 ? 2.8 : ROW_Z + D / 2 + 0.9) + 0.3;
  return { stage, source, tray, plot, out, bounds: { center: [(minX + maxX) / 2, 0.3, (minZ + maxZ) / 2], size: [maxX - minX, 0.8, maxZ - minZ] } };
}

/** The Regulation E plot that the run's obligations settle into: 10 by 10. */
const PLOT_COLS = 10;
const PLOT_CELL = 0.2;
function plotSlot(k: number, origin: { x: number; z: number }) {
  const c = k % PLOT_COLS;
  const r = Math.floor(k / PLOT_COLS);
  return { x: origin.x + (c - (PLOT_COLS - 1) / 2) * PLOT_CELL, z: origin.z + (r - 4.5) * PLOT_CELL };
}

export function System3D({
  run,
  st,
  playing,
  selected,
  onSelect,
  focus,
  touched,
}: {
  run: Run;
  st: RunState;
  playing: boolean;
  selected: string | null;
  onSelect: (k: string | null) => void;
  /** the agent being traced in the team column */
  focus: string | null;
  touched: (agents: string[]) => boolean;
}) {
  const tk = useSceneTokens();
  const [guided, setGuided] = useState(true);
  const [reset, setReset] = useState(0);
  const [hover, setHover] = useState<{ title: string; text: string } | null>(null);
  if (!tk) return <div className="h-full w-full" />;
  const regE = run.id === "run-rule-1005";
  return (
    <div className="relative h-full min-h-[560px] w-full">
      <Stage tk={tk} label={`${run.title}: Madison's live system`} extent={9} camera={[2, 12, 14]} onMissed={() => onSelect(null)}>
        <SystemScene tk={tk} run={run} st={st} playing={playing} selected={selected} onSelect={onSelect} focusAgent={focus} guided={guided} reset={reset} onHover={setHover} />
      </Stage>
      {hover ? (
        <div className="pointer-events-none absolute top-4 left-4 max-w-[340px] rounded-[12px] bg-surface px-3.5 py-2.5 shadow-(--overlay-shadow) ring-1 ring-line">
          <div className="text-[13.5px] leading-5 font-medium">{hover.title}</div>
          <div className="mt-1 text-[12.5px] leading-[18px] text-ink2">{hover.text}</div>
        </div>
      ) : null}
      <div className="absolute right-4 bottom-4 flex flex-wrap items-center justify-end gap-2">
        {st.done && regE ? (
          <Link href="/coverage/?view=field&plot=reg-01" className="inline-flex h-8 items-center rounded-[10px] bg-ink px-3 text-[13px] font-medium text-surface hover:opacity-90">
            Open in Coverage
          </Link>
        ) : null}
        <button
          onClick={() => setGuided((g) => !g)}
          aria-pressed={guided}
          className={cn("inline-flex h-8 items-center rounded-[10px] px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)]", guided ? "bg-surface2" : "bg-surface hover:bg-surface2")}
        >
          {guided ? "Following the work" : "Follow the work"}
        </button>
        <OverviewButton
          onClick={() => {
            setGuided(false);
            setReset((r) => r + 1);
          }}
        />
      </div>
    </div>
  );
}

function SystemScene({
  tk,
  run,
  st,
  playing,
  selected,
  onSelect,
  focusAgent,
  guided,
  reset,
  onHover,
}: {
  tk: Tokens;
  run: Run;
  st: RunState;
  playing: boolean;
  selected: string | null;
  onSelect: (k: string | null) => void;
  focusAgent: string | null;
  guided: boolean;
  reset: number;
  onHover: (h: { title: string; text: string } | null) => void;
}) {
  const persona = useStore((s) => s.persona);
  const lay = useMemo(() => layoutFor(run), [run]);

  // every moving thing gets a stable instance slot, by kind group, in order of first appearance
  const slots = useMemo(() => {
    const m: Record<Group, string[]> = { block: [], sheet: [], tile: [] };
    for (const e of run.events) {
      if (e.type !== "item") continue;
      const g = GROUP_OF[e.kind];
      if (g && !m[g].includes(e.id)) m[g].push(e.id);
    }
    return m;
  }, [run]);

  // the latest instance of each item, and where it rested before (so it travels from there)
  const latest = useMemo(() => {
    const byId = new Map<string, { cur: ItemInstance; prevTo?: string }>();
    for (const it of st.items) {
      const prev = byId.get(it.id);
      byId.set(it.id, { cur: it, prevTo: prev ? prev.cur.to : undefined });
    }
    return byId;
  }, [st.items]);

  const held = st.checks.filter((c) => c.result === "block" && c.kind !== "drift");
  const heldIds = new Set(held.map((c) => c.item_ref));

  const regE = position().by_regulation.find((r) => r.regulation_id === "reg-01");
  const plotBase = regE ? regE.covered + regE.not_yet_confirmed : 0; // obligations already in the plot
  const plotArrivals = useMemo(() => {
    const ids: string[] = [];
    for (const e of run.events) if (e.type === "item" && PLOT_PLACES.has(e.to) && !ids.includes(e.id)) ids.push(e.id);
    return ids;
  }, [run]);

  // where a place is, for the k-th of n items resting there
  const placePos = (place: string, k: number, n: number, id: string): [number, number, number] => {
    const s = lay.stage[place];
    if (s) {
      if (s.raised) {
        // a queue along the front of the raised platform
        const x = s.x - ((Math.min(n, 8) - 1) * 0.3) / 2 + (k % 8) * 0.3;
        return [x, s.top, s.z + 0.25 - Math.floor(k / 8) * 0.34];
      }
      const cols = 5;
      const c = k % cols;
      const r = Math.floor(k / cols);
      return [s.x - 0.84 + c * 0.42, s.top + Math.floor(k / 15) * 0.05, s.z - 0.42 + (r % 3) * 0.34];
    }
    const src = lay.source[place];
    if (src) return [src.x, src.top + 0.05, src.z];
    if (place === "held" && lay.tray) return [lay.tray.x - 0.2 + (k % 3) * 0.3, 0.08, lay.tray.z];
    if (PLOT_PLACES.has(place) && lay.plot) {
      const p = plotSlot(plotBase + Math.max(0, plotArrivals.indexOf(id)) - 6, lay.plot);
      return [p.x, 0.1, p.z];
    }
    const o = lay.out[place];
    if (o) return [o.x + (k % 4) * 0.3 - 0.45, 0.05, o.z + Math.floor(k / 4) * 0.3];
    return [0, 0, 0];
  };

  // targets for each slot, recomputed on every derive; the frame loop eases toward them
  const targets = useMemo(() => {
    const out: Record<Group, ({ p: [number, number, number]; color: string; arc: number; hidden?: boolean } | null)[]> = { block: [], sheet: [], tile: [] };
    const restingAt: Record<string, string[]> = {};
    for (const [id, v] of latest) if (!v.cur.inFlight) (restingAt[v.cur.to] ??= []).push(id);
    for (const g of ["block", "sheet", "tile"] as Group[]) {
      out[g] = slots[g].map((id) => {
        const v = latest.get(id);
        if (!v) return null;
        const it = v.cur;
        // sections and candidates are read where they land; once the next step starts they stay as a small pile
        const colour = colourFor(it, tk, heldIds.has(id));
        const dim = focusAgent && it.agentId && it.agentId !== focusAgent ? 0.25 : 1;
        const c = dim < 1 ? mix(colour, tk["--surface3"], 0.7) : colour;
        if (!it.inFlight) {
          const list = restingAt[it.to] ?? [];
          return { p: placePos(it.to, list.indexOf(id), list.length, id), color: c, arc: 0 };
        }
        const fromPlace = v.prevTo && v.prevTo !== it.from ? v.prevTo : it.from;
        const a = placePos(fromPlace, 0, 1, id);
        const b = placePos(it.to, (restingAt[it.to] ?? []).length, (restingAt[it.to] ?? []).length + 1, id);
        const k = easeInOut(it.progress);
        // pass through the gate when the item is leaving it
        const via = lay.stage[it.from]?.gate && v.prevTo !== it.from ? placePos(it.from, 0, 1, id) : null;
        let p: [number, number, number];
        if (via) {
          p = k < 0.5 ? lerp3(a, via, k * 2) : lerp3(via, b, (k - 0.5) * 2);
        } else p = lerp3(a, b, k);
        const arc = Math.sin(Math.PI * k) * (it.to === "held" ? 0.25 : 0.7);
        return { p: [p[0], p[1] + arc, p[2]], color: c, arc };
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, slots, tk, focusAgent, lay]);

  const tRef = useRef(targets);
  tRef.current = targets;
  const cur = useRef<Record<Group, THREE.Vector3[]>>({ block: [], sheet: [], tile: [] });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const animateFor = (g: Group) => (i: number, o: THREE.Object3D, c: THREE.Color) => {
    const tg = tRef.current[g][i];
    if (!tg) return false;
    const arr = cur.current[g];
    if (!arr[i]) arr[i] = new THREE.Vector3(...tg.p);
    // ease toward the target so motion stays smooth between player updates
    arr[i].lerp(tmp.set(tg.p[0], tg.p[1], tg.p[2]), playing ? 0.35 : 0.25);
    o.position.set(arr[i].x, arr[i].y + SIZE[g][1] / 2, arr[i].z);
    if (g === "sheet") o.rotation.set(0, 0.06 * Math.sin(i * 1.7), 0);
    c.set(tg.color);
    return true;
  };

  // the gate fills as obligations pass it
  const gateStage = run.stages.find((s) => s.kind === "gate");
  const gateChecked = gateStage ? new Set(st.checks.filter((c) => gateStage.agents.includes(c.gate) || /^D\d$/.test(c.gate)).map((c) => (/^D\d$/.test(c.gate) ? c.gate : c.item_ref))).size : 0;
  const gateTotal = run.id === "run-design-mfa" ? 7 : slots.block.length;

  // links: thin lines from the policy and control stacks to the matching step
  const links = st.items.filter((it) => it.kind === "link" || it.kind === "candidate");

  // guided camera: the working step, the waiting decision, or the whole system when done
  const runningKey = run.stages.find((s) => ["running", "waiting_person"].includes(st.stages[s.key].state))?.key;
  const fk = selected ?? runningKey;
  const focus: Frame | null =
    !guided || st.done || !fk
      ? null
      : (() => {
          const s = lay.stage[fk];
          // pan toward the work, keeping most of the system in view
          const b = lay.bounds;
          return { center: [b.center[0] + (s.x - b.center[0]) * 0.12, s.top, b.center[2] + (s.z - b.center[2]) * 0.12], size: [b.size[0] * 0.98, 1, b.size[2] * 0.98] };
        })();

  const path = run.stages.map((s) => lay.stage[s.key]);
  const feeds = useMemo(() => {
    const out: { source: string; stage: string }[] = [];
    const add = (source: string, stage: string) => !out.some((f) => f.source === source && f.stage === stage) && out.push({ source, stage });
    for (const e of run.events) if (e.type === "item" && lay.source[e.from] && lay.stage[e.to]) add(e.from, e.to);
    const scope = run.stages.find((x) => x.key === "scope" || x.key === "suggest");
    if (scope) for (const id of Object.keys(lay.source)) if (/profile|fr$/.test(id) && !out.some((f) => f.source === id)) add(id, id.endsWith("fr") ? run.stages[0].key : scope.key);
    return out;
  }, [run, lay]);

  return (
    <>
      <CameraRig overview={lay.bounds} focus={focus} resetKey={reset} drift={!playing} padding={-0.08} azimuth={0} polar={40} />

      {/* sources: stacks of sheets */}
      {(run.sources ?? []).map((s) => {
        const p = lay.source[s.id];
        const used = st.items.some((it) => it.from === s.id) || (s.id === "src-profile" && st.stages.scope?.state !== "waiting");
        return (
          <group key={s.id}>
            {[0, 1, 2, 3].map((k) => (
              <Platform key={k} position={[p.x + (k % 2) * 0.03, k * 0.1, p.z - (k % 2) * 0.02]} size={[1.2, 0.08, 0.86]} radius={0.03} color={k === 3 && used ? tk["--surface"] : tk["--surface2"]} />
            ))}
            <Label position={[p.x + 0.72, 0.3, p.z]} anchor="left" z={[8, 0]}>
              <div className="whitespace-nowrap">
                <div className={cn("text-[12.5px] leading-4 font-medium", used ? "text-ink" : "text-ink2")}>{s.label}</div>
                <div className="mt-0.5 font-mono text-[9.5px] tracking-[0.08em] text-ink3 uppercase">{s.detail}</div>
              </div>
            </Label>
          </group>
        );
      })}

      {/* which source feeds which step: faint until the step has used it */}
      {feeds.map((f) => {
        const src = lay.source[f.source];
        const s = lay.stage[f.stage];
        if (!src || !s) return null;
        const used = st.stages[f.stage]?.state !== "waiting";
        const a = new THREE.Vector3(src.x + 0.62, 0.36, src.z);
        const b = new THREE.Vector3(s.x - W / 2, 0.1, s.z);
        const pts = new THREE.CubicBezierCurve3(a, a.clone().add(new THREE.Vector3(1.4, 0, 0)), b.clone().add(new THREE.Vector3(-1.4, 0, 0)), b).getPoints(28);
        return <Line key={`${f.source}-${f.stage}`} points={pts} color={tk["--ink"]} lineWidth={1} transparent opacity={used ? 0.32 : 0.1} dashed={!used} dashSize={0.1} gapSize={0.08} />;
      })}

      {/* the path between steps */}
      {path.slice(0, -1).map((a, i) => {
        const b = path[i + 1];
        const from = run.stages[i];
        const lit = st.stages[from.key].state === "done";
        const sameRow = a.row === b.row;
        const pts: [number, number, number][] = sameRow
          ? [
              [a.x + Math.sign(b.x - a.x) * (W / 2), 0.03, a.z],
              [b.x - Math.sign(b.x - a.x) * (W / 2), 0.03, b.z],
            ]
          : [
              [a.x, 0.03, a.z + D / 2],
              [a.x + 0.0001, 0.03, (a.z + b.z) / 2],
              [b.x, 0.03, b.z - D / 2],
            ];
        return <Line key={i} points={pts} color={lit ? tk["--ink"] : tk["--lineStrong"]} lineWidth={1.2} dashed={!lit} dashSize={0.12} gapSize={0.1} transparent opacity={lit ? 0.55 : 0.9} />;
      })}

      {/* platforms */}
      {run.stages.map((s) => {
        const p = lay.stage[s.key];
        const state = st.stages[s.key].state;
        const running = state === "running";
        const waitingPerson = state === "waiting_person";
        const dimmed = focusAgent ? !s.agents.includes(focusAgent) : false;
        const color = waitingPerson ? tk["--highlight"] : running ? mix(tk["--surface"], tk["--highlight"], 0.55) : state === "done" ? tk["--surface"] : tk["--surface2"];
        const who = s.kind === "person" ? s.agents[0].slice(7) : null;
        const responder = st.responded.find((r) => r.event.stage === s.key);
        const result = state === "done" ? stepResult(run, s.key, st, who ? userById(responder?.event.waiting_for ?? who)?.name : undefined) : undefined;
        return (
          <group key={s.key}>
            <Platform position={[p.x, 0, p.z]} size={[W + 0.1, 0.035, D + 0.1]} radius={0.2} color={tk["--lineStrong"]} castShadow={false} />
            <Platform
              position={[p.x, 0.02, p.z]}
              size={[W, p.top, D]}
              radius={0.16}
              color={dimmed ? mix(color, tk["--ground"], 0.6) : color}
              onClick={(e) => (e.stopPropagation(), onSelect(selected === s.key ? null : s.key))}
              onOver={(e) => (e.stopPropagation(), (document.body.style.cursor = "pointer"))}
              onOut={() => (document.body.style.cursor = "")}
            />
            {selected === s.key ? <Platform position={[p.x, 0, p.z]} size={[W + 0.14, 0.02, D + 0.14]} radius={0.2} color={tk["--ink"]} castShadow={false} /> : null}
            {p.gate ? <Gate position={[p.x + 0.45, p.top + 0.02, p.z]} width={D - 0.25} height={0.62} color={tk["--ink3"]} paneColor={tk["--highlight"]} fill={gateTotal ? gateChecked / gateTotal : 0} /> : null}
            <Label position={[p.x, 0, p.z + D / 2 + 0.12]} anchor="top" width={132} z={[12, 0]}>
              <button
                onClick={() => onSelect(selected === s.key ? null : s.key)}
                className={cn("pointer-events-auto block w-full text-center transition-opacity", dimmed && "opacity-35")}
              >
                <span className={cn("inline-block rounded-[8px] px-2 py-0.5 text-[13px] leading-[18px] font-medium", waitingPerson ? "bg-highlight text-highlight-ink" : state === "waiting" ? "text-ink3" : "text-ink")}>
                  {stepTitle(run, s.key)}
                </span>
                {running && st.narration ? (
                  <span className="mt-0.5 block text-[12px] leading-[17px] text-ink2">
                    <Typed key={st.narration.text} text={st.narration.text} elapsed={playing ? st.narration.elapsed : undefined} cps={70} caret="while" />
                  </span>
                ) : waitingPerson ? (
                  <span className="mt-0.5 block text-[12px] leading-[17px] text-ink">{who === persona ? "Waiting for you" : `Waiting for ${userById(who ?? "")?.name}`}</span>
                ) : result ? (
                  <span className="mt-0.5 block text-[12px] leading-[17px] text-ink2">{result}</span>
                ) : null}
                <span className="mt-1 block font-mono text-[9px] leading-[13px] tracking-[0.08em] text-ink3 uppercase">{s.agents.map((a) => (a.startsWith("person:") ? "You decide" : agentById(a)?.name ?? "")).join(" · ")}</span>
                {p.gate && gateChecked && !result ? (
                  <span className="mt-0.5 block text-[12px] leading-[17px] text-ink2">
                    {gateChecked - held.length} passed{held.length ? ` · ${held.length} held back` : ""}
                  </span>
                ) : null}
              </button>
            </Label>
          </group>
        );
      })}

      {/* the tray for what the double-check holds back */}
      {lay.tray ? (
        <>
          <Platform position={[lay.tray.x, 0, lay.tray.z]} size={[1.1, 0.06, 0.8]} radius={0.06} color={tk["--surface3"]} />
          <Label position={[lay.tray.x, 0, lay.tray.z - 0.55]} anchor="bottom" z={[8, 0]}>
            <span className="text-[11.5px] whitespace-nowrap text-ink3">Held back</span>
          </Label>
        </>
      ) : null}

      {/* the Regulation E plot the obligations settle into */}
      {lay.plot && regE ? (
        <PlotBase tk={tk} origin={lay.plot} base={plotBase} done={st.done} label="Regulation E · where it stands" />
      ) : null}

      {/* links to the policy and control stacks */}
      {links.map((it) => {
        const src = lay.source[it.from];
        const s = lay.stage[it.to];
        if (!src || !s) return null;
        const a = new THREE.Vector3(src.x, src.top + 0.1, src.z);
        const b = new THREE.Vector3(s.x - W / 2 + 0.2, s.top + 0.05, s.z);
        const mid = a.clone().lerp(b, 0.5).setY(1.4);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const k = it.inFlight ? it.progress : 1;
        const pts = curve.getPoints(24).slice(0, Math.max(2, Math.round(24 * k) + 1));
        const dim = focusAgent && it.agentId && it.agentId !== focusAgent;
        return <Line key={it.key} points={pts} color={tk["--ink"]} lineWidth={1} transparent opacity={dim ? 0.08 : it.inFlight ? 0.6 : 0.22} />;
      })}

      <Blocks
        count={slots.block.length}
        size={SIZE.block}
        radius={0.06}
        animate={animateFor("block")}
        onHover={(i) => {
          const id = slots.block[i];
          const c = held.find((h) => h.item_ref === id);
          const d = getDuty(id);
          if (c) onHover({ title: "Held back by the double-check", text: c.reason });
          else if (d) onHover({ title: d.plain, text: d.citation });
        }}
        onOut={() => onHover(null)}
      />
      <Blocks count={slots.sheet.length} size={SIZE.sheet} radius={0.006} animate={animateFor("sheet")} castShadow />
      <Blocks count={slots.tile.length} size={SIZE.tile} radius={0.03} animate={animateFor("tile")} />
    </>
  );
}

function PlotBase({ tk, origin, base, done, label }: { tk: Tokens; origin: { x: number; z: number }; base: number; done: boolean; label: string }) {
  // the obligations already in the plot, as covered blocks (the last one not yet confirmed)
  const items = useMemo(
    () =>
      Array.from({ length: Math.max(0, base - 6) }, (_, k) => {
        const p = plotSlot(k, origin);
        return { x: p.x, y: 0.1 + 0.03, z: p.z, sy: 0.5, color: k === base - 7 ? tk["--vizWarn"] : tk["--vizOk"] };
      }),
    [base, origin, tk],
  );
  return (
    <group>
      <Platform position={[origin.x, 0, origin.z]} size={[PLOT_COLS * PLOT_CELL + 0.24, 0.08, 10 * PLOT_CELL + 0.24]} radius={0.06} color={tk["--surface2"]} />
      <Blocks count={items.length} items={items} size={[0.16, 0.1, 0.16]} radius={0.04} />
      <Label position={[origin.x, 0.1, origin.z - 5 * PLOT_CELL - 0.2]} anchor="bottom" z={[8, 0]}>
        <span className={cn("text-[12px] whitespace-nowrap", done ? "font-medium text-ink" : "text-ink3")}>{label}</span>
      </Label>
    </group>
  );
}

function colourFor(it: ItemInstance, tk: Tokens, isHeld: boolean): string {
  if (it.kind === "duty") {
    if (isHeld || it.to === "held") return tk["--vizWarn"];
    const d = getDuty(it.id);
    if (d?.applicability === "excluded") return tk["--vizMuted"];
    if (it.coverageState && it.coverageState in STATE_VAR) return tk[STATE_VAR[it.coverageState as keyof typeof STATE_VAR]];
    return tk["--ink3"];
  }
  if (it.kind === "draft_part") return tk["--ink2"];
  if (it.kind === "impact" || it.kind === "handoff") return tk["--vizInfo"];
  return tk["--surface"];
}

function mix(a: string, b: string, k: number) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
}
function lerp3(a: [number, number, number], b: [number, number, number], k: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
