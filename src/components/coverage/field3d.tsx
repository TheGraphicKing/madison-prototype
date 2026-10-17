"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { plotLayout, useLiveField, type Plot, type Tile } from "@/lib/coverage-field";
import { getDuty, userById } from "@/data";
import { deadlineBand, ownersInField, plotDaysLeft, plotOwner, plotShortLabel, tileOwner, type Lens } from "@/lib/lens";
import { Blocks, CameraRig, Label, OverviewButton, Platform, Stage, STATE_HEIGHT, STATE_VAR, STATE_WORD, useSceneTokens, useZoom, ZoomButtons, categoryColours, type Frame, type Tokens, type ZoomSignal } from "@/components/scene";

export type HoverInfo = { plot: Plot; state: string; dutyId?: string; k: number } | null;

const UNIT = 0.055; // height of a covered block
const RISE_MS = 800;

/**
 * Every applicable obligation as a small rounded block, one plot per regulation, built on the
 * shared scene kit. Height encodes urgency. `mini` is the compact Today version.
 */
export function CoverageField({
  selected,
  onSelectPlot,
  highlightState,
  mini = false,
  onHoverPlot,
  lens = "state",
}: {
  selected: number | null;
  onSelectPlot: (i: number | null) => void;
  highlightState?: string | null;
  mini?: boolean;
  onHoverPlot?: (p: Plot | null) => void;
  lens?: Lens;
}) {
  const tk = useSceneTokens();
  const [hover, setHover] = useState<HoverInfo>(null);
  const [reset, setReset] = useState(0);
  const { zoom, zoomIn, zoomOut } = useZoom();
  if (!tk) return <div className="h-full w-full bg-surface" />;
  return (
    <div className="relative h-full w-full">
      <Stage tk={tk} label="Coverage field: every applicable obligation as a block, grouped by regulation" extent={7} camera={[8, 9, 10]} ao={!mini} onMissed={() => onSelectPlot(null)}>
        <FieldScene tk={tk} selected={selected} onSelectPlot={onSelectPlot} onHover={(h) => (setHover(h), onHoverPlot?.(h?.plot ?? null))} highlightState={highlightState} mini={mini} reset={reset} zoom={zoom} lens={lens} />
      </Stage>
      {hover && !mini ? (
        <div className="pointer-events-none absolute top-4 left-4 max-w-[320px] rounded-[12px] bg-surface px-3.5 py-2.5 shadow-(--overlay-shadow) ring-1 ring-line">
          <div className="text-[12px] text-ink3">
            {hover.plot.citation} · {hover.plot.short}
          </div>
          <div className="mt-1 text-[13.5px] leading-5">{hover.dutyId ? getDuty(hover.dutyId)?.plain : `One of ${hover.plot.total} obligations in ${hover.plot.short}`}</div>
          <div className="mt-1.5 flex items-center gap-2 text-[12.5px] text-ink2">
            <span className="block size-[8px] rounded-[2px]" style={{ background: `var(${STATE_VAR[hover.state as keyof typeof STATE_VAR]})` }} />
            {STATE_WORD[hover.state as keyof typeof STATE_WORD]}
          </div>
          <div className="mt-1 text-[12.5px] text-ink2">Owner {userById(tileOwner(hover.plot, hover.dutyId))?.name}</div>
        </div>
      ) : null}
      {!mini ? (
        <div className="absolute right-4 bottom-4 flex items-center gap-3">
          <span className="text-[12px] text-ink3 max-md:hidden">Drag to orbit · Ctrl and scroll to zoom · click a plot</span>
          <ZoomButtons onIn={zoomIn} onOut={zoomOut} />
          <OverviewButton
            onClick={() => {
              onSelectPlot(null);
              setReset((r) => r + 1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function FieldScene({
  tk,
  selected,
  onSelectPlot,
  onHover,
  highlightState,
  mini,
  reset,
  zoom,
  lens,
}: {
  tk: Tokens;
  selected: number | null;
  onSelectPlot: (i: number | null) => void;
  onHover: (h: HoverInfo) => void;
  highlightState?: string | null;
  mini: boolean;
  reset: number;
  zoom: ZoomSignal;
  lens: Lens;
}) {
  const { plots, tiles } = useLiveField();
  const lay = useMemo(() => plotLayout(plots), [plots]);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const cx = lay.width / 2;
  const cz = lay.depth / 2;
  const [hoverPlot, setHoverPlot] = useState<number | null>(null);
  const start = useRef<number | null>(null);
  const gaps = useMemo(() => tiles.filter((t) => t.state === "known_gap"), [tiles]);

  const place = (t: Tile) => {
    const p = lay.pos[t.plot];
    const col = t.k % p.cols;
    const row = Math.floor(t.k / p.cols);
    return { x: p.x + col * lay.cell - cx + lay.tile / 2, z: p.z + row * lay.cell - cz + lay.tile / 2, row, rows: p.rows };
  };
  const colours = useMemo(() => {
    const base: Record<string, THREE.Color> = {};
    const dim = new THREE.Color(tk["--surface3"]);
    for (const [s, v] of Object.entries(STATE_VAR)) base[s] = new THREE.Color(tk[v]);
    // owner and deadline colours, per tile
    const cats = categoryColours(tk);
    const owners = ownersInField(plots).map((o) => o.id);
    const band: Record<string, THREE.Color> = { late: new THREE.Color(tk["--vizRisk"]), soon: new THREE.Color(tk["--vizWarn"]), later: new THREE.Color(tk["--vizOk"]), none: new THREE.Color(tk["--vizMuted"]) };
    const plotBand = plots.map((p) => deadlineBand(plotDaysLeft(p)));
    const perTile = tiles.map((t) => {
      if (lens === "owner") return new THREE.Color(cats[owners.indexOf(tileOwner(plots[t.plot], t.dutyId)) % cats.length]);
      if (lens === "deadline") return band[plotBand[t.plot]];
      return base[t.state];
    });
    return { base, dim, perTile, ink: new THREE.Color(tk["--ink"]) };
  }, [tk, lens, plots, tiles]);

  const sel = useRef(selected);
  sel.current = selected;
  const hl = useRef(highlightState);
  hl.current = highlightState;
  const hp = useRef(hoverPlot);
  hp.current = hoverPlot;

  const animate = (i: number, o: THREE.Object3D, c: THREE.Color, now: number) => {
    const t = tiles[i];
    const q = place(t);
    if (start.current === null) start.current = now;
    // rise row by row on first load
    const delay = (q.row / Math.max(1, q.rows)) * RISE_MS * 0.6;
    const k = Math.min(1, Math.max(0, ((now - start.current) * 1000 - delay) / (RISE_MS * 0.4)));
    const e = 1 - Math.pow(1 - k, 3);
    const h = STATE_HEIGHT[t.state] * UNIT * Math.max(0.02, e);
    const lift = hp.current === t.plot && sel.current === null ? 0.03 : 0;
    o.position.set(q.x, h / 2 + 0.05 + lift, q.z);
    o.scale.set(1, h / UNIT, 1);
    const dim = (sel.current !== null && t.plot !== sel.current) || (hl.current && t.state !== hl.current);
    c.copy(colours.perTile[i] ?? colours.base[t.state]);
    if (dim) c.lerp(colours.dim, 0.75);
  };

  const overview: Frame = { center: [0, 0, 0], size: [lay.width + 0.4, 0.4, lay.depth + 0.4] };
  // labels: biggest plots first; a label that would overlap one already placed waits for hover
  const [visibleLabels, setVisible] = useState<Set<number>>(new Set());
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (mini || clock.elapsedTime - last.current < 0.3) return;
    last.current = clock.elapsedTime;
    const order = plots.map((_, i) => i).sort((a, b) => plots[b].total - plots[a].total);
    const boxes: [number, number, number, number][] = [];
    const next = new Set<number>();
    const v = new THREE.Vector3();
    for (const i of order) {
      const q = lay.pos[i];
      v.set(q.x - cx - 0.04, 0.08, q.z - cz - 0.12).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      const w = plotShortLabel(plots[i]).length * 6.2 + 6;
      const box: [number, number, number, number] = [x, y - 18, x + w, y];
      if (v.z > 1 || x < -20 || x > size.width) continue;
      if (boxes.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
      boxes.push(box);
      next.add(i);
    }
    if (next.size !== visibleLabels.size || [...next].some((i) => !visibleLabels.has(i))) setVisible(next);
  });
  const focus: Frame | null =
    selected !== null ? { center: [lay.pos[selected].x + lay.pos[selected].w / 2 - cx, 0.1, lay.pos[selected].z + lay.pos[selected].d / 2 - cz], size: [lay.pos[selected].w * 1.6, 0.4, lay.pos[selected].d * 1.6] } : null;

  return (
    <>
      <CameraRig overview={overview} focus={focus} resetKey={reset} drift={!mini} padding={mini ? (aspect > 1.6 ? -0.48 : -0.22) : -0.2} allowZoom={!mini} zoom={zoom} />

      {plots.map((p, i) => {
        const q = lay.pos[i];
        const lit = hoverPlot === i || selected === i;
        const w = q.w + 0.14;
        const d = q.d + 0.14;
        return (
          <group key={p.regulationId}>
            <Platform
              position={[q.x + q.w / 2 - cx - lay.cell / 2 + lay.tile / 2, lit && selected === null ? 0.012 : 0, q.z + q.d / 2 - cz - lay.cell / 2 + lay.tile / 2]}
              size={[w, 0.05, d]}
              radius={0.04}
              color={lit ? tk["--surface3"] : tk["--surface2"]}
              onOver={(e) => (e.stopPropagation(), setHoverPlot(i), mini && onHover({ plot: p, state: "covered", k: 0 }))}
              onOut={() => (setHoverPlot((h) => (h === i ? null : h)), mini && onHover(null))}
              onClick={(e) => (e.stopPropagation(), onSelectPlot(selected === i ? null : i))}
            />
            {!mini && (lit || visibleLabels.has(i)) ? (
              <Label position={[q.x - cx - 0.04, 0.08, q.z - cz - 0.12]} anchor="bottom" z={[10, 0]}>
                <div style={{ transform: "translateX(50%)" }} className="whitespace-nowrap">
                  <div className={lit ? "inline-block rounded-[8px] bg-ink px-1.5 py-0.5 text-[11px] font-medium text-surface" : "text-[11px] font-medium text-ink2"}>{lit ? `${p.citation} · ${p.title}` : plotShortLabel(p)}</div>
                  {lit ? (
                    <div className="mt-1 rounded-[8px] bg-surface px-2 py-1 text-[11px] leading-4 text-ink shadow-(--overlay-shadow) ring-1 ring-line">
                      {p.counts.covered} covered · {p.counts.not_yet_confirmed} not yet confirmed · {p.counts.nothing_behind} nothing behind it · {p.counts.known_gap} known gaps · owner {userById(plotOwner(p))?.name}
                    </div>
                  ) : null}
                </div>
              </Label>
            ) : null}
          </group>
        );
      })}

      <Blocks
        count={tiles.length}
        size={[lay.tile, UNIT, lay.tile]}
        radius={lay.tile * 0.22}
        animate={animate}
        onHover={(i) => {
          const t = tiles[i];
          setHoverPlot(t.plot);
          onHover({ plot: plots[t.plot], state: t.state, dutyId: t.dutyId, k: t.k });
        }}
        onOut={() => onHover(null)}
        onClick={(i) => onSelectPlot(tiles[i].plot)}
      />
      {/* a thin ring on top of every known gap */}
      <Ring gaps={gaps} place={place} tk={tk} tile={lay.tile} />
    </>
  );
}

function Ring({ gaps, place, tk, tile }: { gaps: Tile[]; place: (t: Tile) => { x: number; z: number }; tk: Tokens; tile: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.TorusGeometry(tile * 0.32, tile * 0.06, 6, 20), [tile]);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    gaps.forEach((t, i) => {
      const q = place(t);
      o.position.set(q.x, 0.05 + STATE_HEIGHT.known_gap * UNIT + 0.006, q.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, Math.max(1, gaps.length)]} castShadow>
      <meshStandardMaterial color={tk["--ink"]} roughness={0.8} />
    </instancedMesh>
  );
}
