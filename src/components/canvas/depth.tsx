"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Run } from "@/data/types";
import type { RunState } from "@/lib/player/derive";
import { useStore } from "@/lib/store";
import { pointOnPath } from "@/components/core/packet";
import { agentById } from "@/data";
import { pathFor, W, type Layout } from "./layout";

/** Design units (x right, y down) to world units (x right, z towards the viewer). */
const S = 0.01;
const toWorld = (x: number, y: number, H: number): [number, number] => [(x - W / 2) * S, (y - H / 2) * S];

function useTokens() {
  const palette = useStore((s) => s.palette);
  const [t, setT] = useState<Record<string, string>>({});
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const get = (k: string) => cs.getPropertyValue(k).trim() || "#888";
    const keys = ["--ground", "--surface", "--surface2", "--surface3", "--line", "--lineStrong", "--ink", "--ink2", "--ink3", "--highlight", "--person", "--risk", "--ok"];
    for (let i = 1; i <= 6; i++) keys.push(`--agent-${i}`);
    const id = requestAnimationFrame(() => setT(Object.fromEntries(keys.map((k) => [k, get(k)]))));
    return () => cancelAnimationFrame(id);
  }, [palette]);
  return t;
}

export function Depth({ run, state, layout }: { run: Run; state: RunState; layout: Layout }) {
  const tk = useTokens();
  if (!tk["--ground"]) return <div className="h-full w-full" />;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[10px]" style={{ background: tk["--ground"] }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} aria-label="Depth view of the run">
        <Scene run={run} state={state} layout={layout} tk={tk} />
      </Canvas>
      <div className="t-label pointer-events-none absolute bottom-3 left-4">/ Depth · drag to orbit · scroll to zoom</div>
    </div>
  );
}

function Scene({ run, state, layout, tk }: { run: Run; state: RunState; layout: Layout; tk: Record<string, string> }) {
  const H = layout.H;
  const interacted = useRef(false);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { size } = useThree();
  const zoom = Math.min(size.width / 10.5, size.height / 7.2);

  // a gentle idle drift that stops as soon as you interact
  useFrame(({ clock }) => {
    const c = controls.current;
    if (!c || interacted.current) return;
    const base = Math.PI / 4;
    c.setAzimuthalAngle(base + Math.sin(clock.elapsedTime * 0.18) * 0.12);
    c.update();
  });

  const hue = (agent: string) => {
    const h = agentById(agent)?.hue ?? 0;
    return h ? tk[`--agent-${h}`] : tk["--ink3"];
  };

  return (
    <>
      <OrthographicCamera makeDefault position={[8, 8, 8]} zoom={zoom} near={-100} far={100} />
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableDamping
        minAzimuthAngle={Math.PI / 4 - (25 * Math.PI) / 180}
        maxAzimuthAngle={Math.PI / 4 + (25 * Math.PI) / 180}
        minPolarAngle={0.55}
        maxPolarAngle={1.05}
        minZoom={zoom * 0.6}
        maxZoom={zoom * 2.4}
        onStart={() => (interacted.current = true)}
      />
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 9, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />

      {/* ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[W * S + 0.6, H * S + 0.6]} />
        <meshStandardMaterial color={tk["--surface"]} roughness={1} metalness={0} />
      </mesh>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.22} scale={14} blur={2.4} far={2} resolution={512} color={tk["--ink"]} />

      {/* ground lines: the chain and every move */}
      {[...layout.chain.map((c) => c.d), ...layout.sourceLinks.map((l) => l.d)].map((d, i) => (
        <GroundLine key={i} d={d} H={H} color={tk["--lineStrong"]} />
      ))}

      {/* sources: flat tiles */}
      {run.sources.map((s) => {
        const b = layout.sources[s.id];
        const [x, z] = toWorld(b.x + b.w / 2, b.y + b.h / 2, H);
        return (
          <group key={s.id} position={[x, 0, z]}>
            <mesh position={[0, 0.02, 0]} castShadow>
              <boxGeometry args={[b.w * S, 0.04, b.h * S]} />
              <meshStandardMaterial color={tk["--surface"]} roughness={0.95} />
            </mesh>
            <Html position={[0, 0.06, 0]} center distanceFactor={undefined} zIndexRange={[10, 0]}>
              <span className="t-label pointer-events-none whitespace-nowrap text-[9px] text-ink2">{s.label}</span>
            </Html>
          </group>
        );
      })}

      {/* stages */}
      {run.stages.map((st) => {
        const g = layout.nodes[st.key];
        const s = state.stages[st.key];
        const [x, z] = toWorld(g.x + g.w / 2, g.y + g.h / 2, H);
        const held = (state.byPlace[st.key] ?? []).length;
        const height = 0.05 + Math.min(0.22, held * 0.016);
        const live = s.state === "running" || s.state === "waiting_person";
        const done = s.state === "done";
        const color = live ? tk["--highlight"] : done ? tk["--surface"] : tk["--surface3"];
        if (st.kind === "person") {
          return (
            <group key={st.key} position={[x, 0, z]}>
              <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
                <boxGeometry args={[g.w * S, 0.06, g.h * S]} />
                <meshStandardMaterial color={tk["--surface"]} roughness={0.95} />
              </mesh>
              <mesh position={[0, 0.16 + (live ? 0.06 : 0), 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[0.32, 0.045, 16, 48]} />
                <meshStandardMaterial color={live ? tk["--highlight"] : tk["--person"]} roughness={0.9} />
              </mesh>
              <StageLabel title={st.title} sub={s.state === "waiting_person" ? "waiting for a person" : s.state} y={0.5} />
            </group>
          );
        }
        if (st.kind === "gate") {
          const fill = s.state === "running" ? 0.35 + 0.5 * ((state.t % 800) / 800) : done ? 1 : 0;
          const gh = 0.42;
          return (
            <group key={st.key} position={[x, 0, z]}>
              <mesh position={[0, gh / 2, 0]}>
                <boxGeometry args={[g.w * S, gh, g.h * S]} />
                <meshStandardMaterial color={tk["--surface"]} transparent opacity={0.28} roughness={1} depthWrite={false} />
              </mesh>
              <lineSegments position={[0, gh / 2, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(g.w * S, gh, g.h * S)]} />
                <lineBasicMaterial color={tk["--ink"]} />
              </lineSegments>
              {fill > 0 ? (
                <mesh position={[0, (gh * fill) / 2, 0]}>
                  <boxGeometry args={[g.w * S * 0.96, gh * fill, g.h * S * 0.96]} />
                  <meshStandardMaterial color={done ? tk["--surface3"] : tk["--highlight"]} transparent opacity={0.55} roughness={1} />
                </mesh>
              ) : null}
              <StageLabel title={st.title} sub={s.detail ?? s.state} y={gh + 0.25} />
            </group>
          );
        }
        return (
          <group key={st.key} position={[x, 0, z]}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[g.w * S, height, g.h * S]} />
              <meshStandardMaterial color={color} roughness={0.92} metalness={0} />
            </mesh>
            <lineSegments position={[0, height / 2, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(g.w * S, height, g.h * S)]} />
              <lineBasicMaterial color={done || live ? tk["--ink"] : tk["--lineStrong"]} />
            </lineSegments>
            <mesh position={[-(g.w * S) / 2 + 0.1, height + 0.02, -(g.h * S) / 2 + 0.1]}>
              <boxGeometry args={[0.07, 0.04, 0.07]} />
              <meshStandardMaterial color={hue(st.agents[0])} />
            </mesh>
            <StageLabel title={st.title} sub={s.state === "done" && held ? `done · holds ${held}` : s.state} y={height + 0.22} />
          </group>
        );
      })}

      <Packets run={run} state={state} layout={layout} tk={tk} />
    </>
  );
}

function StageLabel({ title, sub, y }: { title: string; sub?: string; y: number }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[10, 0]}>
      <div className="pointer-events-none flex flex-col items-center whitespace-nowrap">
        <span className="rounded-[10px] bg-surface px-1.5 py-0.5 text-[11.5px] leading-4 text-ink shadow-[inset_0_0_0_1px_var(--line)]">{title}</span>
        {sub ? <span className="t-label mt-0.5 text-[8.5px]">/ {sub.replace("_", " ")}</span> : null}
      </div>
    </Html>
  );
}

function GroundLine({ d, H, color }: { d: string; H: number; color: string }) {
  const pts = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const [px, py] = pointOnPath(d, i / 40);
      const [x, z] = toWorld(px, py, H);
      out.push([x, 0.004, z]);
    }
    return out;
  }, [d, H]);
  return <Line points={pts} color={color} lineWidth={1} />;
}

/** 6 px cubes as one instanced mesh, gliding along the ground lines in the agent's hue. */
function Packets({ run, state, layout, tk }: { run: Run; state: RunState; layout: Layout; tk: Record<string, string> }) {
  const MAX = 96;
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const list = state.inFlight.slice(0, MAX);
    list.forEach((it, i) => {
      const d = pathFor(layout, it.from, it.to);
      const [px, py] = pointOnPath(d, it.progress);
      const [x, z] = toWorld(px, py, layout.H);
      tmp.position.set(x, 0.06, z);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      const h = it.agentId ? agentById(it.agentId)?.hue : 0;
      const stage = run.stages.find((s) => s.key === it.to);
      col.set(stage?.kind === "person" ? tk["--highlight"] : h ? tk[`--agent-${h}`] : tk["--ink"]);
      m.setColorAt(i, col);
    });
    for (let i = list.length; i < MAX; i++) {
      tmp.position.set(0, -10, 0);
      tmp.scale.setScalar(0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.count = MAX;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [state, layout, run, tk, tmp, col]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX]} castShadow>
      <boxGeometry args={[0.07, 0.07, 0.07]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
}
