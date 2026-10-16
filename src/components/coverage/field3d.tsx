"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { coverageField, plotLayout, type Plot } from "@/lib/coverage-field";
import { getDuty } from "@/data";

const STATE_VAR: Record<string, string> = {
  covered: "--ok",
  not_yet_confirmed: "--warn",
  nothing_behind: "--risk",
  known_gap: "--info",
};
const STATE_WORD: Record<string, string> = {
  covered: "Covered",
  not_yet_confirmed: "Not yet confirmed",
  nothing_behind: "Nothing behind it",
  known_gap: "Known gap",
};

function useTokens() {
  const palette = useStore((s) => s.palette);
  const [t, setT] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement);
      const keys = ["--ground", "--surface", "--surface2", "--surface3", "--line", "--lineStrong", "--ink", "--ink2", "--ink3", "--ok", "--warn", "--risk", "--info", "--okSoft", "--highlight"];
      setT(Object.fromEntries(keys.map((k) => [k, cs.getPropertyValue(k).trim()])));
    });
    return () => cancelAnimationFrame(id);
  }, [palette]);
  return t;
}

export type HoverInfo = { kind: "tile"; plot: Plot; tileIndex: number; state: string; dutyId?: string; k: number } | null;

/**
 * All 1,894 applicable duties as small matte tiles on an isometric plane, one plot per
 * regulation. Known gaps are raised a little; nothing-behind tiles sit slightly lower.
 */
export function CoverageField({
  selected,
  onSelectPlot,
  highlightState,
}: {
  selected: number | null;
  onSelectPlot: (i: number | null) => void;
  highlightState?: string | null;
}) {
  const tk = useTokens();
  const [hover, setHover] = useState<HoverInfo>(null);
  if (!tk) return <div className="h-full w-full" />;
  return (
    <div className="relative h-full w-full" style={{ background: tk["--ground"] }}>
      <Canvas shadows dpr={[1, 2]} aria-label="Coverage field: every applicable duty as a tile, grouped by regulation">
        <FieldScene tk={tk} selected={selected} onSelectPlot={onSelectPlot} onHover={setHover} highlightState={highlightState} />
      </Canvas>
      {hover ? (
        <div className="pointer-events-none absolute top-4 left-4 max-w-[320px] rounded-[2px] bg-surface px-3 py-2 shadow-[0_0_0_1px_var(--line)]">
          <div className="t-label">{hover.plot.citation} · tile {hover.k + 1} of {hover.plot.total}</div>
          <div className="mt-1 text-[13px] leading-5">{hover.dutyId ? getDuty(hover.dutyId)?.plain : `A ${hover.plot.short} duty`}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-ink2">
            <span className="block size-[6px]" style={{ background: `var(${STATE_VAR[hover.state]})` }} />
            {STATE_WORD[hover.state]}
            {hover.dutyId ? <span className="t-data text-[11px] text-ink3">{hover.dutyId}</span> : null}
          </div>
        </div>
      ) : null}
      <div className="t-label pointer-events-none absolute bottom-3 left-4">/ Drag to orbit · scroll to zoom · click a plot</div>
    </div>
  );
}

function FieldScene({
  tk,
  selected,
  onSelectPlot,
  onHover,
  highlightState,
}: {
  tk: Record<string, string>;
  selected: number | null;
  onSelectPlot: (i: number | null) => void;
  onHover: (h: HoverInfo) => void;
  highlightState?: string | null;
}) {
  const { plots, tiles } = useMemo(() => coverageField(), []);
  const lay = useMemo(() => plotLayout(plots), [plots]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const interacted = useRef(false);
  const { size, camera } = useThree();
  const baseZoom = Math.min(size.width / (lay.width * 0.92), size.height / (lay.depth * 1.05));
  const cx = lay.width / 2;
  const cz = lay.depth / 2;
  const [hoverPlot, setHoverPlot] = useState<number | null>(null);

  // place tiles once; recolour when palette, selection or hover change
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (const t of tiles) {
      const p = lay.pos[t.plot];
      const col = t.k % p.cols;
      const row = Math.floor(t.k / p.cols);
      const h = t.state === "known_gap" ? 0.11 : t.state === "nothing_behind" ? 0.025 : 0.05;
      o.position.set(p.x + col * lay.cell - cx + lay.tile / 2, h / 2 + (t.state === "nothing_behind" ? -0.012 : 0), p.z + row * lay.cell - cz + lay.tile / 2);
      o.scale.set(1, h / 0.05, 1);
      o.updateMatrix();
      m.setMatrixAt(t.i, o.matrix);
      const dim = (selected !== null && t.plot !== selected) || (highlightState && t.state !== highlightState);
      c.set(tk[STATE_VAR[t.state]]);
      if (dim) c.lerp(new THREE.Color(tk["--surface3"]), 0.78);
      else if (hoverPlot === t.plot && selected === null) c.lerp(new THREE.Color(tk["--ink"]), 0.12);
      m.setColorAt(t.i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tiles, lay, tk, selected, hoverPlot, highlightState, cx, cz]);

  // fly the camera to a selected plot
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const zoomTo = useRef(baseZoom);
  useEffect(() => {
    if (selected === null) {
      target.current.set(0, 0, 0);
      zoomTo.current = baseZoom;
    } else {
      const p = lay.pos[selected];
      target.current.set(p.x + p.w / 2 - cx, 0, p.z + p.d / 2 - cz);
      zoomTo.current = Math.min(size.width / (p.w * 3.2), size.height / (p.d * 3.6), baseZoom * 4);
    }
  }, [selected, lay, cx, cz, baseZoom, size]);

  useFrame(({ clock }, dt) => {
    const c = controls.current;
    if (!c) return;
    const k = 1 - Math.pow(0.002, dt);
    c.target.lerp(target.current, k);
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom += (zoomTo.current - cam.zoom) * k;
    cam.updateProjectionMatrix();
    if (!interacted.current) c.setAzimuthalAngle(Math.PI / 4 + Math.sin(clock.elapsedTime * 0.12) * 0.1);
    c.update();
  });

  const tileAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId !== undefined ? tiles[e.instanceId] : undefined);

  return (
    <>
      <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={baseZoom} near={-200} far={200} />
      <OrbitControls
        ref={controls}
        enableDamping
        minPolarAngle={0.35}
        maxPolarAngle={1.2}
        minZoom={baseZoom * 0.6}
        maxZoom={baseZoom * 8}
        onStart={() => (interacted.current = true)}
        screenSpacePanning={false}
      />
      <ambientLight intensity={1.7} />
      <directionalLight position={[5, 10, 4]} intensity={1.3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow onClick={() => onSelectPlot(null)}>
        <planeGeometry args={[lay.width + 2, lay.depth + 2]} />
        <meshStandardMaterial color={tk["--surface"]} roughness={1} />
      </mesh>
      <ContactShadows position={[0, -0.015, 0]} opacity={0.18} scale={Math.max(lay.width, lay.depth) + 2} blur={1.8} far={1} resolution={1024} color={tk["--ink"]} />

      {/* plot bases, labels */}
      {plots.map((p, i) => {
        const q = lay.pos[i];
        const lit = hoverPlot === i || selected === i;
        return (
          <group key={p.regulationId}>
            <mesh
              position={[q.x + q.w / 2 - cx - lay.cell / 2 + lay.tile / 2, -0.012, q.z + q.d / 2 - cz - lay.cell / 2 + lay.tile / 2]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoverPlot(i);
              }}
              onPointerOut={() => setHoverPlot((h) => (h === i ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlot(selected === i ? null : i);
              }}
              receiveShadow
            >
              <boxGeometry args={[q.w + 0.12, 0.012, q.d + 0.12]} />
              <meshStandardMaterial color={lit ? tk["--surface3"] : tk["--surface2"]} roughness={1} />
            </mesh>
            <Html position={[q.x - cx, 0.02, q.z - cz - 0.18]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap" style={{ transform: "translate(0, -100%)" }}>
                <div className={lit ? "rounded-[2px] bg-ink px-1.5 py-0.5 font-mono text-[9.5px] font-medium tracking-[0.12em] text-surface uppercase" : "font-mono text-[9.5px] font-medium tracking-[0.12em] text-ink2 uppercase"}>
                  / {p.citation}
                  {lit ? ` · ${p.short}` : ""}
                </div>
                {lit ? (
                  <div className="mt-1 rounded-[2px] bg-surface px-1.5 py-1 font-mono text-[9.5px] leading-[14px] text-ink shadow-[0_0_0_1px_var(--line)]">
                    {p.counts.covered} covered · {p.counts.not_yet_confirmed} not yet · {p.counts.nothing_behind} nothing · {p.counts.known_gap} gap
                  </div>
                ) : null}
              </div>
            </Html>
          </group>
        );
      })}

      <instancedMesh
        ref={ref}
        args={[undefined, undefined, tiles.length]}
        castShadow
        receiveShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          const t = tileAt(e);
          if (!t) return;
          setHoverPlot(t.plot);
          onHover({ kind: "tile", plot: plots[t.plot], tileIndex: t.i, state: t.state, dutyId: t.dutyId, k: t.k });
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const t = tileAt(e);
          if (t) onSelectPlot(t.plot);
        }}
      >
        <boxGeometry args={[lay.tile, 0.05, lay.tile]} />
        <meshStandardMaterial roughness={0.95} metalness={0} />
      </instancedMesh>
    </>
  );
}
