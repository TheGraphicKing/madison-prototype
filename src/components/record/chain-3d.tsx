"use client";

// The record as a chain, on the shared scene kit: each entry is a block on a gentle curve,
// ordered by time. A rounded cube is a person, a flatter tile is an agent. A thin link joins each
// entry to the one before it; runs cluster and are labelled. Scrolling moves along time.
import { Line } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { CameraRig, Label, Platform, Stage, useSceneTokens, type Frame, type Tokens } from "@/components/scene";
import type { ChainEntry } from "./record";

const STEP = 1.15;
export const placeOf = (i: number): [number, number, number] => [i * STEP, 0, Math.sin(i * 0.35) * 1.1];

export function Chain3D({ entries, selected, onSelect, cursor }: { entries: ChainEntry[]; selected: string | null; onSelect: (id: string) => void; cursor: number }) {
  const tk = useSceneTokens();
  if (!tk) return <div className="h-full w-full" />;
  return (
    <Stage tk={tk} label="The record as a chain of entries, oldest to newest" extent={14} camera={[0, 7, 12]}>
      <ChainScene tk={tk} entries={entries} selected={selected} onSelect={onSelect} cursor={cursor} />
    </Stage>
  );
}

function ChainScene({ tk, entries, selected, onSelect, cursor }: { tk: Tokens; entries: ChainEntry[]; selected: string | null; onSelect: (id: string) => void; cursor: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const idx = useMemo(() => new Map(entries.map((e, i) => [e.id, i])), [entries]);
  // runs: consecutive entries from one run form a cluster with a label
  const clusters = useMemo(() => {
    const out: { runId: string; label: string; from: number; to: number }[] = [];
    entries.forEach((e, i) => {
      if (!e.runId) return;
      const last = out[out.length - 1];
      if (last && last.runId === e.runId && last.to === i - 1) last.to = i;
      else out.push({ runId: e.runId, label: e.runLabel ?? "Run", from: i, to: i });
    });
    return out;
  }, [entries]);

  const c = Math.max(0, Math.min(entries.length - 1, cursor));
  const focus: Frame = { center: [placeOf(c)[0], 0.3, 0], size: [STEP * 7, 1, 3.4] };

  return (
    <>
      <CameraRig overview={focus} focus={focus} azimuth={0} polar={58} padding={-0.1} drift={false} allowZoom={false} />
      {clusters.map((k) => {
        const a = placeOf(k.from);
        const b = placeOf(k.to);
        const w = b[0] - a[0] + STEP * 0.9;
        return (
          <group key={`${k.runId}-${k.from}`}>
            <Platform position={[(a[0] + b[0]) / 2, 0, 0]} size={[w, 0.04, 3.4]} radius={0.3} color={tk["--surface2"]} castShadow={false} />
            <Label position={[a[0] - STEP * 0.4, 0.05, -1.75]} anchor="left" z={[10, 5]}>
              <span className="text-[12px] font-medium whitespace-nowrap text-ink2">{k.label}</span>
            </Label>
          </group>
        );
      })}
      {entries.map((e, i) => {
        const p = placeOf(i);
        const prev = e.prev ? idx.get(e.prev) : undefined;
        const on = selected === e.id;
        const lit = hover === e.id || on;
        const person = e.kind === "person";
        const size: [number, number, number] = person ? [0.5, 0.5, 0.5] : [0.62, 0.16, 0.62];
        const color = e.live ? tk["--highlight"] : person ? mix(tk["--ink2"], tk["--surface"], 0.25) : mix(tk["--vizInfo"], tk["--surface"], 0.45);
        return (
          <group key={e.id}>
            {prev !== undefined ? (
              <Line points={[[placeOf(prev)[0], 0.12, placeOf(prev)[2]], [p[0], 0.12, p[2]]]} color={tk["--ink"]} lineWidth={1} transparent opacity={0.45} />
            ) : null}
            <Platform
              position={[p[0], lit ? 0.12 : 0, p[2]]}
              size={size}
              radius={person ? 0.12 : 0.06}
              color={color}
              onClick={(ev) => (ev.stopPropagation(), onSelect(e.id))}
              onOver={(ev) => (ev.stopPropagation(), setHover(e.id), (document.body.style.cursor = "pointer"))}
              onOut={() => (setHover(null), (document.body.style.cursor = ""))}
            />
            {on ? <Platform position={[p[0], 0, p[2]]} size={[size[0] + 0.18, 0.02, size[2] + 0.18]} radius={0.12} color={tk["--ink"]} castShadow={false} /> : null}
            {lit ? (
              <Label position={[p[0], size[1] + 0.3, p[2]]} anchor="bottom" z={[30, 20]} width={220}>
                <div className="rounded-[10px] bg-surface px-2.5 py-1.5 text-[12px] leading-[17px] shadow-(--overlay-shadow) ring-1 ring-line">
                  <span className="block font-medium">{e.text}</span>
                  <span className={cn("block", e.signed ? "text-ok" : "text-ink3")}>{e.signed ? "Signed" : "Not signed"} · {e.whoName}</span>
                </div>
              </Label>
            ) : null}
          </group>
        );
      })}
    </>
  );
}

function mix(a: string, b: string, k: number) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
}
