"use client";

// What stands behind one obligation: six layers from the rule's text down to the evidence.
// The 3D stack is built on the shared scene kit; the 2D chain shows the same thing flat.
import { Line } from "@react-three/drei";
import { useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { controlById, driftFor, getChange, linksFor, policyById, procedureSections, procedureById, ruleSections } from "@/data";
import type { CoverageState, Duty } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { CameraRig, Label, Platform, Stage, STATE_VAR, useSceneTokens, type Tokens } from "@/components/scene";

export interface Layer {
  key: "rule" | "obligation" | "policy" | "procedure" | "control" | "evidence";
  kind: string;
  item: { title: string; sub?: string; text: string; href?: string } | null;
  tone: "ok" | "warn" | "risk" | "info" | "plain";
}
export interface Break {
  policy: string;
  procedure: string;
  limit: string;
}

export function lineageOf(d: Duty, state: CoverageState): { layers: Layer[]; brk: Break | null } {
  const sec = d.rule_section_id ? ruleSections.find((s) => s.id === d.rule_section_id) : undefined;
  const links = linksFor(d.id);
  const pl = links.find((l) => l.policy_section_id);
  const pol = pl ? policyById(pl.policy_section_id!) : undefined;
  const drift = driftFor(d.id)[0];
  const family = pol?.document_code.split("-")[1];
  const prc = drift ? procedureById(drift.procedure_section_id) : family ? procedureSections.find((p) => p.document_code.split("-")[1] === family) : undefined;
  const cl = links.find((l) => l.control_id);
  const ctl = cl ? controlById(cl.control_id!) : undefined;
  const fresh = ctl?.freshness_status === "fresh";
  const layers: Layer[] = [
    { key: "rule", kind: "Rule text", tone: "plain", item: { title: sec ? `${sec.section_number} ${sec.heading}` : d.citation, sub: getChange(d.change_id)?.citation, text: sec?.after ?? d.source_text, href: `/rules/${d.change_id}/` } },
    { key: "obligation", kind: "Obligation", tone: state === "covered" ? "ok" : state === "not_yet_confirmed" ? "warn" : state === "known_gap" ? "info" : "risk", item: { title: d.plain, sub: d.citation, text: `“${d.source_text}”` } },
    { key: "policy", kind: "Policy section", tone: pl ? (pl.strength === "full" ? "ok" : "warn") : "risk", item: pol ? { title: `${pol.document_code} ${pol.section_number} ${pol.heading}`, sub: `${pl!.strength === "full" ? "Fully" : "Partly"} meets it`, text: pol.text, href: `/coverage/?view=documents&doc=${pol.id}` } : null },
    { key: "procedure", kind: "Procedure step", tone: drift ? "risk" : prc ? "ok" : "risk", item: prc ? { title: `${prc.document_code} ${prc.section_number.toLowerCase()} ${prc.heading}`, sub: drift ? "Disagrees with the policy" : "Follows the policy", text: prc.text, href: `/coverage/?view=documents&doc=${prc.id}` } : null },
    { key: "control", kind: "Control", tone: ctl ? (fresh ? "ok" : "warn") : "risk", item: ctl ? { title: `${ctl.id} ${ctl.name}`, sub: `${ctl.cadence ?? "No cadence"} · ${ctl.control_type}`, text: `${ctl.name}. ${ctl.nature} control, ${ctl.cadence ?? "no set cadence"}.`, href: `/obligations/?control=${ctl.id}` } : null },
    {
      key: "evidence",
      kind: "Evidence",
      tone: ctl?.last_artifact_date ? (fresh ? "ok" : "warn") : "risk",
      item: ctl?.last_artifact_date ? { title: `Last evidence ${fmtDate(ctl.last_artifact_date)}`, sub: ctl.freshness_status === "quiet" ? `Quiet for ${ctl.quiet_days} days` : "Fresh", text: `The latest artifact from ${ctl.id} is dated ${fmtDate(ctl.last_artifact_date)}.` } : null,
    },
  ];
  const brk = drift ? { policy: drift.policy_values.join(", "), procedure: drift.procedure_values.join(", "), limit: drift.duty_limit } : null;
  return { layers, brk };
}

const TONE_VAR: Record<Layer["tone"], string> = { ok: STATE_VAR.covered, warn: STATE_VAR.not_yet_confirmed, risk: STATE_VAR.nothing_behind, info: STATE_VAR.known_gap, plain: "--surface" };
const GAP = 1.4;
const SIZE: [number, number, number] = [4.4, 0.06, 2.6];

export function Lineage3D({ layers, brk, selected, onSelect }: { layers: Layer[]; brk: Break | null; selected: Layer["key"]; onSelect: (k: Layer["key"]) => void }) {
  const tk = useSceneTokens();
  if (!tk) return <div className="h-full w-full" />;
  return (
    <Stage tk={tk} label="What stands behind this obligation, as six stacked layers" extent={6} camera={[6, 6, 9]} ground={false}>
      <LineageScene tk={tk} layers={layers} brk={brk} selected={selected} onSelect={onSelect} />
    </Stage>
  );
}

function LineageScene({ tk, layers, brk, selected, onSelect }: { tk: Tokens; layers: Layer[]; brk: Break | null; selected: Layer["key"]; onSelect: (k: Layer["key"]) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const n = layers.length;
  const y = (i: number) => (n - 1 - i) * GAP + (hover === layers[i].key ? 0.14 : 0);
  return (
    <>
      <CameraRig overview={{ center: [2.2, (n - 1) * GAP * 0.5 + 0.3, 0], size: [12.5, n * GAP + 0.6, 3] }} azimuth={20} polar={70} padding={-0.34} />
      {layers.map((l, i) => {
        const missing = !l.item;
        // soft tints of the state colours, so the cards stay the loudest thing
        const col = l.tone === "plain" ? tk["--surface"] : "#" + new THREE.Color(tk[TONE_VAR[l.tone] as keyof Tokens]).lerp(new THREE.Color(tk["--surface"]), 0.55).getHexString();
        const on = selected === l.key;
        return (
          <group key={l.key}>
            <Platform
              position={[0, y(i), 0]}
              size={SIZE}
              radius={0.03}
              color={missing ? tk["--surface3"] : col}
              opacity={missing ? 0.18 : on ? 0.95 : 0.78}
              onOver={(e) => (e.stopPropagation(), setHover(l.key), (document.body.style.cursor = "pointer"))}
              onOut={() => (setHover(null), (document.body.style.cursor = ""))}
              onClick={(e) => (e.stopPropagation(), onSelect(l.key))}
            />
            {missing ? (
              <Line
                points={[
                  [-SIZE[0] / 2, y(i) + 0.07, -SIZE[2] / 2],
                  [SIZE[0] / 2, y(i) + 0.07, -SIZE[2] / 2],
                  [SIZE[0] / 2, y(i) + 0.07, SIZE[2] / 2],
                  [-SIZE[0] / 2, y(i) + 0.07, SIZE[2] / 2],
                  [-SIZE[0] / 2, y(i) + 0.07, -SIZE[2] / 2],
                ]}
                color={tk["--ink3"]}
                lineWidth={1.2}
                dashed
                dashSize={0.14}
                gapSize={0.1}
              />
            ) : null}
            <Label position={[SIZE[0] / 2 + 0.25, y(i) + 0.05, SIZE[2] / 2]} anchor="left" interactive width={300} z={[40, 20]}>
              <button
                onClick={() => onSelect(l.key)}
                onMouseEnter={() => setHover(l.key)}
                onMouseLeave={() => setHover(null)}
                className={cn("block w-full rounded-[10px] px-3 py-1.5 text-left shadow-[0_0_0_1px_var(--line)] transition-colors", on ? "bg-ink text-surface" : "bg-surface hover:bg-surface2", missing && !on && "border border-dashed border-line-strong bg-transparent shadow-none")}
              >
                <span className="block text-[12.5px] leading-[17px]">
                  <span className={cn("font-medium", on ? "text-surface/70" : "text-ink3")}>{l.kind} · </span>
                  {l.item ? l.item.title : "Nothing here yet"}
                </span>
              </button>
            </Label>
          </group>
        );
      })}
      {/* vertical connectors; a drift breaks the line between policy and procedure */}
      {layers.slice(0, -1).map((l, i) => {
        const a = y(i);
        const b = y(i + 1) + SIZE[1];
        const isBreak = brk && l.key === "policy";
        const missing = !l.item || !layers[i + 1].item;
        if (isBreak) {
          const mid = (a + b) / 2;
          return (
            <group key={`c-${l.key}`}>
              <Line points={[[0, a, 0], [0, mid + 0.16, 0]]} color={tk["--risk"]} lineWidth={2} />
              <Line points={[[0, mid - 0.16, 0], [0, b, 0]]} color={tk["--risk"]} lineWidth={2} />
              <Label position={[-SIZE[0] / 2 + 0.2, mid, SIZE[2] / 2]} anchor="left" z={[13, 0]}>
                <div className="rounded-[10px] bg-risk-soft px-2.5 py-1.5 text-[12px] leading-[17px] whitespace-nowrap text-risk">
                  Break: policy {brk.policy} · procedure {brk.procedure}
                  <span className="block text-ink2">The rule now says {brk.limit}</span>
                </div>
              </Label>
            </group>
          );
        }
        return <Line key={`c-${l.key}`} points={[[0, a, 0], [0, b, 0]]} color={missing ? tk["--ink3"] : tk["--ink"]} lineWidth={1.4} dashed={missing} dashSize={0.08} gapSize={0.08} transparent opacity={missing ? 0.5 : 0.7} />;
      })}
    </>
  );
}

/** The same lineage as a clean horizontal chain. */
export function LineageChain({ layers, brk, selected, onSelect }: { layers: Layer[]; brk: Break | null; selected: Layer["key"]; onSelect: (k: Layer["key"]) => void }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-y-3">
      {layers.map((l, i) => (
        <li key={l.key} className="flex items-stretch">
          <button
            onClick={() => onSelect(l.key)}
            className={cn(
              "w-[176px] rounded-[14px] border px-3.5 py-3 text-left transition-colors",
              selected === l.key ? "border-ink bg-surface" : l.item ? "border-line bg-surface hover:bg-surface2" : "border-dashed border-line-strong bg-transparent",
            )}
          >
            <span className="flex items-center gap-2 text-[11.5px] font-medium text-ink3">
              <span className="block size-[7px] rounded-[2px]" style={{ background: l.tone === "plain" ? "var(--ink3)" : `var(${TONE_VAR[l.tone]})` }} />
              {l.kind}
            </span>
            <span className="mt-1 block text-[13px] leading-[18px]">{l.item ? l.item.title : "Nothing here yet"}</span>
            {l.item?.sub ? <span className="mt-1 block text-[12px] text-ink2">{l.item.sub}</span> : null}
          </button>
          {i < layers.length - 1 ? (
            <span aria-hidden className="flex w-8 items-center justify-center">
              {brk && l.key === "policy" ? <span className="text-[16px] leading-none font-medium text-risk">≠</span> : <span className={cn("block h-px w-full", layers[i + 1].item && l.item ? "bg-ink/50" : "border-t border-dashed border-line-strong")} />}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
