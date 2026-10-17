"use client";

// The change map: one living scene for a rule change, built on the Coverage scene kit.
// Sources stand on the left; six journey platforms run along a gentle arc; this regulation's
// coverage plot waits at the right end. A run plays in place: agents (pucks) glide to the
// platform they work on, packets travel the arcs, obligation blocks pass the gate, queue at the
// person ring and settle into the plot. Nothing disappears afterwards.
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { agentById, dutiesFor, getDuty, linksFor, userById } from "@/data";
import type { Run, RuleChange } from "@/data/types";
import type { ItemInstance, RunState } from "@/lib/player/derive";
import { PLATFORM_LABEL, STAGE_PLACE, type PlaceKey, type PlatformModel } from "@/lib/change-map";
import { useLiveField, type LiveTile, type Plot } from "@/lib/coverage-field";
import { Blocks, CameraRig, Gate, Label, OverviewButton, Platform, Stage, STATE_HEIGHT, STATE_VAR, useSceneTokens, useZoom, ZoomButtons, type BlockItem, type Frame, type Tokens, type ZoomSignal } from "@/components/scene";

/* ---------- layout ---------- */

const W = 2.0;
const D = 1.4;
const H = 0.14;
const LIFT = 0.22;
const POS: Record<string, [number, number]> = {
  applies: [-5.7, 2.3],
  obligations: [-3.6, 0.3],
  linked: [-1.2, -0.9],
  covered: [1.2, -0.9],
  whats_left: [3.6, 0.3],
  close: [5.7, 2.3],
  suggest: [1.3, -3.6],
  draft: [3.3, -3.9],
  checks: [5.3, -3.6],
};
const GATE: [number, number] = [-2.4, -0.4];
const HELD: [number, number] = [-1.8, 1.4];
const PLOT: [number, number] = [7.8, -2.6];
const PLOT_COLS = 12;
const CELL = 0.19;

const SOURCES = [
  { id: "ecfr", label: "eCFR", detail: "Rule text" },
  { id: "fr", label: "Federal Register", detail: "Notices" },
  { id: "profile", label: "Bank profile", detail: "47 facts" },
  { id: "policies", label: "Policies", detail: "38 documents" },
  { id: "controls", label: "Controls", detail: "212 in inventory" },
  { id: "vendors", label: "Vendors", detail: "41 in scope" },
] as const;
const SRC_Z = (i: number) => -3.4 + (6.8 * i) / (SOURCES.length - 1);
const SRC_X = -8.7;
const srcPos = (id: string): [number, number] => {
  const i = SOURCES.findIndex((s) => s.id === id);
  return [SRC_X, SRC_Z(Math.max(0, i))];
};
/** which run source lands on which stack */
const SRC_ALIAS: Record<string, string> = { "src-ecfr": "ecfr", "src-fr": "fr", "src-profile": "profile", "src-policies": "policies", "src-policy": "policies", "src-procedures": "policies", "src-controls": "controls" };
/** the arcs that always connect a source to the platform it feeds */
const FEEDS: { src: string; to: string }[] = [
  { src: "ecfr", to: "applies" },
  { src: "fr", to: "applies" },
  { src: "profile", to: "applies" },
  { src: "policies", to: "linked" },
  { src: "controls", to: "linked" },
  { src: "vendors", to: "whats_left" },
];
/** agents that did each step, for changes worked on before this demo */
const STATIC_AGENTS: Record<string, string[]> = { applies: ["RC-17"], obligations: ["RC-03"], gate: ["RC-04"], linked: ["RC-11"], covered: ["RC-13"], whats_left: ["RC-12"] };

type Group = "block" | "sheet" | "tile";
const GROUP_OF: Record<string, Group> = { duty: "block", draft_part: "block", document: "sheet", section: "sheet", candidate: "sheet", impact: "tile", handoff: "tile" };
const SIZE: Record<Group, [number, number, number]> = { block: [0.24, 0.18, 0.24], sheet: [0.34, 0.016, 0.44], tile: [0.22, 0.04, 0.22] };
const PLOT_PLACES = new Set(["covered", "not_yet_confirmed", "nothing_behind", "known_gap"]);

export interface ChangeMapProps {
  change: RuleChange;
  regulation: string;
  platforms: PlatformModel[];
  run?: Run;
  st?: RunState | null;
  runActive: boolean;
  playing: boolean;
  /** where a person must answer, and whether the answer is still awaited */
  ring: { at: PlaceKey; pending: boolean; who?: string } | null;
  selected: string | null;
  onSelect: (k: string | null) => void;
  focusAgent: string | null;
  onFocusAgent: (id: string | null) => void;
  heldReason?: string;
  onOpenCoverage: () => void;
}

export function ChangeMap(props: ChangeMapProps) {
  const tk = useSceneTokens();
  const [follow, setFollow] = useState(true);
  const [reset, setReset] = useState(0);
  const { zoom, zoomIn, zoomOut } = useZoom();
  const [hover, setHover] = useState<{ title: string; text: string } | null>(null);
  if (!tk) return <div className="h-full w-full" />;
  const onlyApplies = props.change.state === "screened_out";
  return (
    <div className="relative h-full w-full">
      <Stage tk={tk} label={`The change map for ${props.change.citation}`} extent={13} camera={[0, 14, 16]} onMissed={() => props.onSelect(null)}>
        <MapScene {...props} tk={tk} follow={follow} reset={reset} zoom={zoom} onHover={setHover} onlyApplies={onlyApplies} />
      </Stage>
      {hover ? (
        <div className="pointer-events-none absolute top-3 left-3 max-w-[340px] rounded-[12px] bg-surface px-3.5 py-2.5 shadow-(--overlay-shadow) ring-1 ring-line">
          <div className="text-[13.5px] leading-5 font-medium">{hover.title}</div>
          <div className="mt-1 text-[12.5px] leading-[18px] text-ink2">{hover.text}</div>
        </div>
      ) : null}
      <div className="absolute right-3 bottom-3 flex flex-wrap items-center justify-end gap-2">
        {!onlyApplies ? (
          <button onClick={props.onOpenCoverage} data-demo="D1-7 D2-6" className="inline-flex h-8 items-center rounded-[10px] bg-surface px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2">
            Open in Coverage
          </button>
        ) : null}
        {props.runActive ? (
          <button onClick={() => setFollow((f) => !f)} aria-pressed={follow} className={cn("inline-flex h-8 items-center rounded-[10px] px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)]", follow ? "bg-surface2" : "bg-surface hover:bg-surface2")}>
            {follow ? "Following the work" : "Follow the work"}
          </button>
        ) : null}
        <ZoomButtons onIn={zoomIn} onOut={zoomOut} />
        <OverviewButton
          onClick={() => {
            setFollow(false);
            setReset((r) => r + 1);
          }}
        />
      </div>
    </div>
  );
}

function MapScene({
  tk,
  change,
  regulation,
  platforms,
  run,
  st,
  runActive,
  playing,
  ring,
  selected,
  onSelect,
  focusAgent,
  onFocusAgent,
  heldReason,
  follow,
  reset,
  zoom,
  onHover,
  onlyApplies,
}: ChangeMapProps & { tk: Tokens; follow: boolean; reset: number; zoom: ZoomSignal; onHover: (h: { title: string; text: string } | null) => void; onlyApplies: boolean }) {
  const field = useLiveField();
  const plotIdx = field.plots.findIndex((p) => p.citation === regulation || regulation.startsWith(p.citation));
  const plot: Plot | undefined = field.plots[plotIdx];
  const plotTiles = useMemo(() => field.tiles.filter((t) => t.plot === plotIdx), [field.tiles, plotIdx]);
  const changeDuties = useMemo(() => new Set(dutiesFor(change.id).map((d) => d.id)), [change.id]);

  const stateOf = (k: string) => platforms.find((p) => p.key === k)?.status ?? "hidden";
  const shown = platforms.filter((p) => p.status !== "hidden");
  const placeXZ = (k: string): [number, number] => (k === "gate" ? GATE : (POS[k] ?? POS.applies));
  const top = (k: string) => (stateOf(k) === "current" ? H + LIFT : H);

  /* ---------- static objects: what each done platform holds ---------- */
  const staticItems = useMemo<BlockItem[]>(() => {
    const out: BlockItem[] = [];
    const ds = dutiesFor(change.id);
    const inScope = ds.filter((d) => d.applicability === "in_scope");
    const excluded = ds.filter((d) => d.applicability === "excluded");
    const hideRun = runActive && run?.id === "run-rule-1005";
    const colour = (st: string) => (st in STATE_VAR ? tk[STATE_VAR[st as keyof typeof STATE_VAR]] : tk["--ink3"]);
    const grid = (k: string, n: number, i: number, y: number): [number, number, number] => {
      const [x, z] = POS[k];
      const cols = 4;
      return [x - 0.72 + (i % cols) * 0.48, y, z - 0.25 + Math.floor(i / cols) * 0.42];
    };
    if (!hideRun && stateOf("obligations") === "done") {
      inScope.forEach((d, i) => {
        const [x, y, z] = grid("obligations", inScope.length, i, top("obligations"));
        out.push({ x, y: y + 0.09, z, color: tk["--ink3"] });
      });
      excluded.forEach((d, i) => {
        const [x, z] = POS.obligations;
        out.push({ x: x + W / 2 - 0.25, y: top("obligations") + 0.09, z: z + D / 2 - 0.25 - i * 0.4, color: tk["--vizMuted"] });
      });
    }
    if (!hideRun && (stateOf("covered") === "done" || stateOf("whats_left") !== "waiting")) {
      inScope.forEach((d, i) => {
        if (stateOf("covered") !== "done") return;
        const [x, y, z] = grid("covered", inScope.length, i, top("covered"));
        out.push({ x, y: y + 0.09, z, color: colour(d.coverage_state) });
      });
    }
    if (!hideRun && ["current", "blocked", "done"].includes(stateOf("whats_left"))) {
      inScope
        .filter((d) => d.coverage_state === "nothing_behind" || d.coverage_state === "not_yet_confirmed")
        .forEach((d, i) => {
          const [x, y, z] = grid("whats_left", 4, i, top("whats_left"));
          out.push({ x, y: y + 0.09, z, color: colour(d.coverage_state), sy: d.coverage_state === "nothing_behind" ? 1.6 : 1.2 });
        });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [change.id, platforms, tk, runActive, run?.id]);

  /* ---------- the run's moving things (ported from the live system) ---------- */
  const slots = useMemo(() => {
    const m: Record<Group, string[]> = { block: [], sheet: [], tile: [] };
    if (!run) return m;
    for (const e of run.events) {
      if (e.type !== "item") continue;
      const g = GROUP_OF[e.kind];
      if (g && !m[g].includes(e.id)) m[g].push(e.id);
    }
    return m;
  }, [run]);
  const latest = useMemo(() => {
    const byId = new Map<string, { cur: ItemInstance; prevTo?: string }>();
    for (const it of st?.items ?? []) {
      const prev = byId.get(it.id);
      byId.set(it.id, { cur: it, prevTo: prev ? prev.cur.to : undefined });
    }
    return byId;
  }, [st?.items]);
  const held = (st?.checks ?? []).filter((c) => c.result === "block" && c.kind !== "drift");
  const heldIds = new Set(held.map((c) => c.item_ref));
  const baseCount = plotTiles.filter((t) => !t.fresh).length;
  const arrivals = useMemo(() => {
    const ids: string[] = [];
    for (const e of run?.events ?? []) if (e.type === "item" && PLOT_PLACES.has(e.to) && !ids.includes(e.id)) ids.push(e.id);
    return ids;
  }, [run]);

  const placePos = (place: string, k: number, n: number, id: string): [number, number, number] => {
    const mapped = run ? STAGE_PLACE[run.id]?.[place] : undefined;
    const pk = mapped ?? (POS[place] ? place : undefined);
    if (pk) {
      const [x, z] = placeXZ(pk);
      if (pk === "gate") return [x, 0.1, z];
      const y = top(pk);
      if (ring && ring.at === pk && (place === "decide" || place === "owner" || place === "signoff")) {
        // a queue along the front of the ring
        return [x - ((Math.min(n, 8) - 1) * 0.3) / 2 + (k % 8) * 0.3, y + 0.32, z + 0.2];
      }
      const cols = 5;
      return [x - 0.84 + (k % cols) * 0.42, y + Math.floor(k / 15) * 0.05, z - 0.42 + (Math.floor(k / cols) % 3) * 0.36];
    }
    const alias = SRC_ALIAS[place];
    if (alias) {
      const [x, z] = srcPos(alias);
      return [x, 0.45, z];
    }
    if (place === "src-duty") {
      const [x, z] = POS.whats_left;
      return [x, H + 0.1, z];
    }
    if (place === "held") return [HELD[0] - 0.2 + (k % 3) * 0.3, 0.08, HELD[1]];
    if (PLOT_PLACES.has(place)) return slot3(baseCount + Math.max(0, arrivals.indexOf(id)), 0.12);
    if (place === "tprm" || place === "assurance") {
      const [x, z] = srcPos("vendors");
      return [x + 0.4 + (k % 3) * 0.3, 0.5, z];
    }
    const [x, z] = POS.whats_left;
    return [x + W / 2 + 0.4 + (k % 3) * 0.3, 0.06, z + Math.floor(k / 3) * 0.3];
  };
  const plotSlot = (slot: number): [number, number] => {
    const c = slot % PLOT_COLS;
    const r = Math.floor(slot / PLOT_COLS);
    return [PLOT[0] + (c - (PLOT_COLS - 1) / 2) * CELL, PLOT[1] + (r - 4) * CELL];
  };
  // plotSlot returns [x, z]; reorder for 3D
  const slot3 = (slot: number, y: number): [number, number, number] => {
    const [x, z] = plotSlot(slot);
    return [x, y, z];
  };

  const targets = useMemo(() => {
    const out: Record<Group, ({ p: [number, number, number]; color: string } | null)[]> = { block: [], sheet: [], tile: [] };
    if (!runActive || !run) return out;
    const restingAt: Record<string, string[]> = {};
    for (const [id, v] of latest) if (!v.cur.inFlight) (restingAt[v.cur.to] ??= []).push(id);
    const fix = (p: [number, number, number], place: string, id: string): [number, number, number] => (PLOT_PLACES.has(place) ? slot3(baseCount + Math.max(0, arrivals.indexOf(id)), 0.12) : p);
    for (const g of ["block", "sheet", "tile"] as Group[]) {
      out[g] = slots[g].map((id) => {
        const v = latest.get(id);
        if (!v) return null;
        const it = v.cur;
        const colour = colourFor(it, tk, heldIds.has(id));
        const dim = focusAgent && it.agentId && it.agentId !== focusAgent;
        const c = dim ? mix(colour, tk["--surface3"], 0.7) : colour;
        if (!it.inFlight) {
          const list = restingAt[it.to] ?? [];
          return { p: fix(placePos(it.to, list.indexOf(id), list.length, id), it.to, id), color: c };
        }
        const fromPlace = v.prevTo && v.prevTo !== it.from ? v.prevTo : it.from;
        const a = fix(placePos(fromPlace, 0, 1, id), fromPlace, id);
        const b = fix(placePos(it.to, (restingAt[it.to] ?? []).length, (restingAt[it.to] ?? []).length + 1, id), it.to, id);
        const k = easeInOut(it.progress);
        const throughGate = run && STAGE_PLACE[run.id]?.[it.from] === "gate" && v.prevTo !== it.from;
        const g3: [number, number, number] = [GATE[0], 0.4, GATE[1]];
        const p = throughGate ? (k < 0.5 ? lerp3(a, g3, k * 2) : lerp3(g3, b, (k - 0.5) * 2)) : lerp3(a, b, k);
        const arc = Math.sin(Math.PI * k) * (it.to === "held" ? 0.25 : 0.8);
        return { p: [p[0], p[1] + arc, p[2]], color: c };
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, slots, tk, focusAgent, runActive, platforms, baseCount, arrivals]);
  const tRef = useRef(targets);
  tRef.current = targets;
  const cur = useRef<Record<Group, THREE.Vector3[]>>({ block: [], sheet: [], tile: [] });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const animateFor = (g: Group) => (i: number, o: THREE.Object3D, c: THREE.Color) => {
    const tg = tRef.current[g][i];
    if (!tg) return false;
    const arr = cur.current[g];
    if (!arr[i]) arr[i] = new THREE.Vector3(...tg.p);
    arr[i].lerp(tmp.set(tg.p[0], tg.p[1], tg.p[2]), 0.3);
    o.position.set(arr[i].x, arr[i].y + SIZE[g][1] / 2, arr[i].z);
    c.set(tg.color);
    return true;
  };

  /* ---------- agents ---------- */
  const agents = useMemo(() => {
    const out: { id: string; place: string; working: boolean; done: boolean }[] = [];
    if (runActive && run && st) {
      for (const s of run.stages) {
        const place = STAGE_PLACE[run.id]?.[s.key];
        if (!place) continue;
        const state = st.stages[s.key].state;
        for (const a of s.agents) {
          if (a.startsWith("person:")) continue;
          const prev = out.find((x) => x.id === a);
          const entry = { id: a, place, working: state === "running", done: state === "done" };
          if (!prev) out.push(entry);
          else if (entry.working || (!prev.working && state !== "waiting")) Object.assign(prev, entry);
        }
      }
      return out;
    }
    for (const [place, ids] of Object.entries(STATIC_AGENTS)) {
      const status = place === "gate" ? stateOf("obligations") : stateOf(place);
      if (status !== "done" || (onlyApplies && place !== "applies")) continue;
      for (const id of ids) out.push({ id, place, working: false, done: status === "done" });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runActive, run, st?.stages, platforms, onlyApplies]);

  /* ---------- camera ---------- */
  const minX = SRC_X - 1.8;
  const maxX = onlyApplies ? POS.applies[0] + 3.5 : PLOT[0] + 1.6;
  const overview: Frame = onlyApplies ? { center: [(minX + maxX) / 2, 0.3, 0.4], size: [maxX - minX, 1, 8.4] } : { center: [(minX + maxX) / 2, 0.3, 0.2], size: [maxX - minX, 1, 8.4] };
  const active = platforms.find((p) => p.status === "current");
  const activeKey = runActive && st ? (run?.stages.find((s) => ["running", "waiting_person"].includes(st.stages[s.key].state))?.key ?? null) : null;
  const activePlace = activeKey && run ? STAGE_PLACE[run.id]?.[activeKey] : active?.key;
  const focus: Frame | null =
    runActive && follow && activePlace
      ? (() => {
          const [x, z] = placeXZ(activePlace);
          return { center: [x, 0.3, z + 0.4], size: [12, 1, 8] };
        })()
      : null;

  const dimmed = (k: string) => {
    if (!focusAgent) return false;
    return !agents.some((a) => a.id === focusAgent && (a.place === k || (a.place === "gate" && k === "obligations")));
  };

  return (
    <>
      <CameraRig overview={overview} focus={focus} resetKey={reset} zoom={zoom} drift={!playing} padding={-0.34} azimuth={0} polar={40} />

      {/* sources */}
      {SOURCES.map((s, i) => {
        if (onlyApplies && !["ecfr", "fr", "profile"].includes(s.id)) return null;
        const [x, z] = [SRC_X, SRC_Z(i)];
        const feeding = FEEDS.some((f) => f.src === s.id && platforms.find((p) => p.key === f.to)?.working);
        return (
          <group key={s.id}>
            {[0, 1, 2, 3].map((k) => (
              <Platform key={k} position={[x + (k % 2) * 0.03, k * 0.1, z - (k % 2) * 0.02]} size={[1.3, 0.08, 0.9]} radius={0.03} color={k === 3 && feeding ? mix(tk["--surface"], tk["--highlight"], 0.5) : tk["--surface2"]} />
            ))}
            <Label position={[x + 0.78, 0.3, z]} anchor="left" z={[8, 2]}>
              <div className="whitespace-nowrap">
                <div className="text-[12.5px] leading-4 font-medium text-ink">{s.label}</div>
                <div className="font-mono text-[9.5px] tracking-[0.08em] text-ink3 uppercase">{s.detail}</div>
              </div>
            </Label>
          </group>
        );
      })}

      {/* arcs from the sources, with packets while a platform works */}
      {FEEDS.map((f) => {
        if (onlyApplies && f.to !== "applies") return null;
        const p = platforms.find((x) => x.key === f.to);
        if (!p || p.status === "hidden") return null;
        const [sx, sz] = srcPos(f.src);
        const [tx, tz] = POS[f.to];
        const lit = p.status === "done" || p.working;
        return <Arc key={`${f.src}-${f.to}`} a={[sx + 0.66, 0.38, sz]} b={[tx - W / 2, top(f.to) - 0.04, tz]} color={tk["--ink"]} opacity={lit ? 0.3 : 0.09} packet={p.working ? tk["--ink"] : undefined} />;
      })}

      {/* the path between platforms */}
      {shown
        .filter((p) => !["suggest", "draft", "checks"].includes(p.key))
        .slice(0, -1)
        .map((p, i, list) => {
          const next = shown.filter((x) => !["suggest", "draft", "checks"].includes(x.key))[i + 1];
          if (!next) return null;
          const [ax, az] = POS[p.key];
          const [bx, bz] = POS[next.key];
          const lit = p.status === "done";
          return <Line key={p.key} points={[[ax + W / 2, 0.03, az], [(ax + bx) / 2, 0.03, (az + bz) / 2], [bx - W / 2, 0.03, bz]]} color={lit ? tk["--ink"] : tk["--lineStrong"]} lineWidth={1.2} dashed={!lit} dashSize={0.12} gapSize={0.1} transparent opacity={lit ? 0.5 : 0.9} />;
        })}

      {/* platforms */}
      {shown.map((p) => {
        const [x, z] = POS[p.key];
        const design = ["suggest", "draft", "checks"].includes(p.key);
        const w = design ? 1.6 : W;
        const d = design ? 1.2 : D;
        const lifted = p.status === "current";
        const hollow = p.status === "waiting";
        const dim = dimmed(p.key);
        const colour = p.status === "blocked" ? mix(tk["--surface"], tk["--warn"], 0.18) : lifted ? mix(tk["--surface"], tk["--highlight"], 0.55) : p.status === "done" ? tk["--surface"] : tk["--surface2"];
        const y = lifted ? LIFT : 0;
        return (
          <group key={p.key}>
            {!hollow ? <Platform position={[x, 0, z]} size={[w + 0.1, 0.035, d + 0.1]} radius={0.2} color={tk["--lineStrong"]} castShadow={false} /> : null}
            <Platform
              position={[x, y, z]}
              size={[w, H, d]}
              radius={0.16}
              color={dim ? mix(colour, tk["--ground"], 0.6) : colour}
              opacity={hollow ? 0.28 : 1}
              onClick={(e) => (e.stopPropagation(), onSelect(selected === p.key ? null : p.key))}
              onOver={(e) => (e.stopPropagation(), (document.body.style.cursor = "pointer"))}
              onOut={() => (document.body.style.cursor = "")}
            />
            {hollow ? <Outline x={x} z={z} w={w} d={d} color={tk["--ink3"]} /> : null}
            {selected === p.key ? <Platform position={[x, 0, z]} size={[w + 0.18, 0.02, d + 0.18]} radius={0.22} color={tk["--ink"]} castShadow={false} /> : null}
            {ring && ring.at === p.key ? <Ring x={x} y={y + H + 0.3} z={z} r={Math.min(w, d) * 0.42} color={ring.pending ? tk["--highlight"] : tk["--ink3"]} pulse={ring.pending} /> : null}
            <Label position={[x, y, z + d / 2 + 0.1]} anchor="top" interactive width={onlyApplies ? 200 : 150} z={[14, 4]}>
              <button
                onClick={() => onSelect(selected === p.key ? null : p.key)}
                data-demo={p.key === "obligations" ? "D1-3" : p.key === "whats_left" ? "D1-6 D2-1" : undefined}
                className={cn("block w-full text-center", dim && "opacity-35")}
              >
                <span className={cn("inline-block rounded-[8px] px-2 py-0.5 text-[13px] leading-[18px] font-medium", lifted ? "bg-highlight text-highlight-ink" : hollow ? "text-ink3" : "text-ink")}>{PLATFORM_LABEL[p.key]}</span>
                {p.note ? (
                  <span className={cn("mt-0.5 block text-[12px] leading-[16px]", p.status === "blocked" ? "font-medium text-warn" : "text-ink2")}>{p.note}</span>
                ) : null}
                {onlyApplies && p.key === "applies" ? (
                  <span className="mt-1.5 flex flex-wrap justify-center gap-1">
                    <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11.5px] text-ink2 shadow-[inset_0_0_0_1px_var(--line)]">Prepaid accounts: no</span>
                    <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11.5px] text-ink2 shadow-[inset_0_0_0_1px_var(--line)]">Certainty: Clear</span>
                  </span>
                ) : null}
              </button>
            </Label>
          </group>
        );
      })}

      {/* the gate between Obligations and Linked, with the tray for what it holds back */}
      {!onlyApplies && stateOf("obligations") !== "hidden" ? (
        <>
          <Gate position={[GATE[0], 0, GATE[1]]} width={1.3} height={0.85} color={tk["--ink3"]} paneColor={tk["--highlight"]} fill={gateFill(st, run)} />
          <Label position={[GATE[0], 0.95, GATE[1]]} anchor="bottom" z={[10, 3]}>
            <span className="text-[11.5px] whitespace-nowrap text-ink3" data-demo="D1-4">
              Double-check
            </span>
          </Label>
          {held.length || heldReason ? (
            <>
              <Platform position={[HELD[0], 0, HELD[1]]} size={[1.0, 0.05, 0.7]} radius={0.06} color={tk["--surface3"]} />
              {!runActive && heldReason ? (
                <Blocks count={1} items={[{ x: HELD[0], y: 0.14, z: HELD[1], color: tk["--vizWarn"] }]} size={SIZE.block} radius={0.06} onHover={() => onHover({ title: "Held back by the double-check", text: heldReason })} onOut={() => onHover(null)} />
              ) : null}
              <Label position={[HELD[0], 0, HELD[1] + 0.45]} anchor="top" z={[8, 2]}>
                <span className="text-[11px] whitespace-nowrap text-ink3">Held back · hover for why</span>
              </Label>
            </>
          ) : null}
        </>
      ) : null}

      {/* this regulation's coverage plot, the same blocks as Coverage */}
      {!onlyApplies && plot ? (
        <PlotHere tk={tk} tiles={plotTiles} changeDuties={changeDuties} label={`${plot.citation} · ${plot.short}`} counts={plot.counts} onHover={onHover} />
      ) : null}

      {/* static results on the platforms */}
      <Blocks count={staticItems.length} items={staticItems} size={SIZE.block} radius={0.06} />

      {/* the run's moving things */}
      {runActive && run ? (
        <>
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
          <Blocks count={slots.sheet.length} size={SIZE.sheet} radius={0.006} animate={animateFor("sheet")} />
          <Blocks count={slots.tile.length} size={SIZE.tile} radius={0.03} animate={animateFor("tile")} />
        </>
      ) : null}

      {/* the links into Linked, once made */}
      {!runActive && stateOf("linked") === "done"
        ? dutiesFor(change.id)
            .flatMap((d) => linksFor(d.id))
            .slice(0, 8)
            .map((l, i) => {
              const [sx, sz] = srcPos(l.policy_section_id ? "policies" : "controls");
              const [tx, tz] = POS.linked;
              return <Line key={l.id} points={new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx + 0.66, 0.4, sz), new THREE.Vector3((sx + tx) / 2, 1.6 + i * 0.05, (sz + tz) / 2), new THREE.Vector3(tx - 0.6 + (i % 4) * 0.4, H + 0.02, tz)).getPoints(24)} color={tk["--ink"]} lineWidth={0.8} transparent opacity={0.14} />;
            })
        : null}

      {/* agents as pucks */}
      {agents.map((a, i) => (
        <Puck
          key={a.id}
          tk={tk}
          name={agentById(a.id)?.name ?? "Madison"}
          target={pucksAt(a.place, a.working, i, agents, placeXZ, top)}
          trailTo={a.done || a.working ? (() => {
            const [x, z] = placeXZ(a.place);
            return [x, top(a.place), z];
          })() : null}
          working={a.working}
          focused={focusAgent === a.id}
          dim={Boolean(focusAgent && focusAgent !== a.id)}
          onClick={() => onFocusAgent(focusAgent === a.id ? null : a.id)}
        />
      ))}
    </>
  );
}

/** Where a puck sits: on its platform while working, otherwise resting in front of it. */
function pucksAt(place: string, working: boolean, i: number, all: { id: string; place: string }[], placeXZ: (k: string) => [number, number], top: (k: string) => number): [number, number, number] {
  const [x, z] = placeXZ(place);
  const siblings = all.filter((a) => a.place === place);
  const j = siblings.findIndex((a) => a === all[i]);
  if (working) return [x + 0.75 - j * 0.6, top(place) + 0.12, z - 0.55];
  // resting pucks wait behind their platform, so they never cover its label
  return [x - 0.4 + j * 0.62, 0.04, z - D / 2 - 0.55];
}

function Puck({ tk, name, target, trailTo, working, focused, dim, onClick }: { tk: Tokens; name: string; target: [number, number, number]; trailTo: [number, number, number] | null; working: boolean; focused: boolean; dim: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const [over, setOver] = useState(false);
  const pos = useRef(new THREE.Vector3(...target));
  const [p, setP] = useState<[number, number, number]>(target);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.26, 0.26, 0.09, 28), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    pos.current.lerp(new THREE.Vector3(...target), 0.06);
    g.position.copy(pos.current);
    const s = working ? 1 + Math.sin(clock.elapsedTime * 4) * 0.07 : 1;
    g.scale.set(s, 1, s);
    if (Math.abs(pos.current.x - p[0]) + Math.abs(pos.current.z - p[2]) > 0.05) setP([pos.current.x, pos.current.y, pos.current.z]);
  });
  const colour = working ? tk["--highlight"] : focused ? tk["--ink"] : mix(tk["--surface"], tk["--ink"], 0.12);
  return (
    <>
      <group ref={ref} onClick={(e) => (e.stopPropagation(), onClick())} onPointerOver={(e) => (e.stopPropagation(), setOver(true), (document.body.style.cursor = "pointer"))} onPointerOut={() => (setOver(false), (document.body.style.cursor = ""))}>
        <mesh geometry={geo} position={[0, 0.045, 0]} castShadow>
          <meshStandardMaterial color={dim ? mix(colour, tk["--ground"], 0.6) : colour} roughness={0.85} />
        </mesh>
      </group>
      {trailTo ? <Line points={[[p[0], 0.06, p[2]], [trailTo[0], trailTo[1], trailTo[2]]]} color={tk["--ink"]} lineWidth={1} dashed dashSize={0.06} gapSize={0.07} transparent opacity={dim ? 0.06 : 0.28} /> : null}
      {working || focused || over ? (
      <Label position={[p[0], 0.12, p[2] + 0.3]} anchor="top" interactive z={[16, 6]}>
        <button onClick={onClick} className={cn("rounded-full px-1.5 text-[11px] leading-4 whitespace-nowrap", focused ? "bg-ink text-surface" : working ? "bg-highlight text-highlight-ink" : "text-ink2", dim && "opacity-30")}>
          {name}
        </button>
      </Label>
      ) : null}
    </>
  );
}

/** A thin TextQL-style arc; a packet travels it while the platform works. */
function Arc({ a, b, color, opacity, packet }: { a: [number, number, number]; b: [number, number, number]; color: string; opacity: number; packet?: string }) {
  const curve = useMemo(() => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    return new THREE.CubicBezierCurve3(A, A.clone().add(new THREE.Vector3(2.2, 0.9, 0)), B.clone().add(new THREE.Vector3(-2.2, 0.9, 0)), B);
  }, [a, b]);
  const pts = useMemo(() => curve.getPoints(36), [curve]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !packet) return;
    ref.current.position.copy(curve.getPoint((clock.elapsedTime * 0.7) % 1));
  });
  return (
    <>
      <Line points={pts} color={color} lineWidth={1} transparent opacity={opacity} />
      {packet ? (
        <mesh ref={ref}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={packet} roughness={0.8} />
        </mesh>
      ) : null}
    </>
  );
}

function Outline({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  const y = 0.02;
  return (
    <Line
      points={[
        [x - w / 2, y, z - d / 2],
        [x + w / 2, y, z - d / 2],
        [x + w / 2, y, z + d / 2],
        [x - w / 2, y, z + d / 2],
        [x - w / 2, y, z - d / 2],
      ]}
      color={color}
      lineWidth={1.2}
      dashed
      dashSize={0.14}
      gapSize={0.1}
    />
  );
}

/** The person checkpoint: a raised ring that pulses while it waits. */
function Ring({ x, y, z, r, color, pulse }: { x: number; y: number; z: number; r: number; color: string; pulse: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = pulse ? 1 + Math.sin(clock.elapsedTime * 3) * 0.04 : 1;
    ref.current.scale.set(s, s, 1);
  });
  return (
    <mesh ref={ref} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[r, 0.045, 12, 48]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

function PlotHere({ tk, tiles, changeDuties, label, counts, onHover }: { tk: Tokens; tiles: LiveTile[]; changeDuties: Set<string>; label: string; counts: Plot["counts"]; onHover: (h: { title: string; text: string } | null) => void }) {
  const unit = 0.075;
  const items = useMemo<BlockItem[]>(
    () =>
      tiles.map((t, k) => {
        const c = k % PLOT_COLS;
        const r = Math.floor(k / PLOT_COLS);
        const h = STATE_HEIGHT[t.state] * unit;
        const mine = t.dutyId && changeDuties.has(t.dutyId);
        return { x: PLOT[0] + (c - (PLOT_COLS - 1) / 2) * CELL, y: 0.08 + h / 2, z: PLOT[1] + (r - 4) * CELL, sy: h / unit, color: mine ? tk[STATE_VAR[t.state]] : mix(tk[STATE_VAR[t.state]], tk["--surface"], 0.35) };
      }),
    [tiles, changeDuties, tk],
  );
  const rows = Math.ceil(tiles.length / PLOT_COLS) || 1;
  return (
    <group>
      <Platform position={[PLOT[0], 0, PLOT[1] + ((rows - 1) / 2 - 4) * CELL]} size={[PLOT_COLS * CELL + 0.3, 0.06, rows * CELL + 0.3]} radius={0.06} color={tk["--surface2"]} />
      <Blocks
        count={items.length}
        items={items}
        size={[0.15, unit, 0.15]}
        radius={0.035}
        onHover={(i) => {
          const t = tiles[i];
          const d = t?.dutyId ? getDuty(t.dutyId) : undefined;
          const owner = d ? userById(d.owner_id)?.name : undefined;
          onHover(d ? { title: d.plain, text: `${t.state === "covered" ? "Covered" : t.state === "nothing_behind" ? "Nothing behind it" : t.state === "known_gap" ? "Known gap" : "Not yet confirmed"}${owner ? ` · owner ${owner}` : ""}` } : null);
        }}
        onOut={() => onHover(null)}
      />
      <Label position={[PLOT[0], 0.1, PLOT[1] - 4 * CELL - 0.3]} anchor="bottom" z={[10, 3]}>
        <div className="text-center whitespace-nowrap">
          <div className="text-[12.5px] font-medium text-ink">{label}</div>
          <div className="text-[11px] text-ink2">
            {counts.covered} covered · {counts.not_yet_confirmed} not yet · {counts.nothing_behind} nothing behind · {counts.known_gap} gap
          </div>
        </div>
      </Label>
    </group>
  );
}

function gateFill(st?: RunState | null, run?: Run) {
  if (!st || !run) return 1;
  const gate = run.stages.find((s) => STAGE_PLACE[run.id]?.[s.key] === "gate" || s.kind === "gate");
  if (!gate) return 0;
  const n = new Set(st.checks.filter((c) => gate.agents.includes(c.gate) || /^D\d$/.test(c.gate)).map((c) => (/^D\d$/.test(c.gate) ? c.gate : c.item_ref))).size;
  const total = run.id === "run-design-mfa" ? 7 : 8;
  return Math.min(1, n / total);
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
