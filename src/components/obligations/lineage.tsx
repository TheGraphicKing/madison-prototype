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
import { CameraRig, Label, OverviewButton, Platform, Stage, STATE_VAR, useSceneTokens, useZoom, ZoomButtons, type Tokens, type ZoomSignal } from "@/components/scene";

export interface Layer {
  key: "rule" | "obligation" | "policy" | "procedure" | "control" | "evidence";
  kind: string;
  item: { title: string; sub?: string; text: string; href?: string; code?: string; owner?: string; date?: string } | null;
  tone: "ok" | "warn" | "risk" | "info" | "plain";
}
export interface Break {
  policy: string;
  procedure: string;
  limit: string;
  /** "Policy: 10 days · Procedure: day 7 · Rule: 5" */
  short: string;
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
    { key: "rule", kind: "Rule text", tone: "plain", item: { code: sec?.section_number ?? d.citation, date: `Effective ${fmtDate(getChange(d.change_id)?.effective_date)}`, title: sec ? `${sec.section_number} ${sec.heading}` : d.citation, sub: getChange(d.change_id)?.citation, text: sec?.after ?? d.source_text, href: `/rules/${d.change_id}/` } },
    { key: "obligation", kind: "Obligation", tone: state === "covered" ? "ok" : state === "not_yet_confirmed" ? "warn" : state === "known_gap" ? "info" : "risk", item: { code: d.citation.replace(/^12 CFR |^31 CFR /, ""), owner: d.owner_id, date: `Deadline in the rule: ${d.deadline_text}`, title: d.plain, sub: d.citation, text: `“${d.source_text}”` } },
    { key: "policy", kind: "Policy section", tone: pl ? (pl.strength === "full" ? "ok" : "warn") : "risk", item: pol ? { code: `${pol.document_code} ${pol.section_number}`, owner: pol.owner_id, date: `Version ${pol.doc_version}`, title: `${pol.document_code} ${pol.section_number} ${pol.heading}`, sub: `${pl!.strength === "full" ? "Fully" : "Partly"} meets it`, text: pol.text, href: `/coverage/?view=documents&doc=${pol.id}` } : null },
    { key: "procedure", kind: "Procedure step", tone: drift ? "risk" : prc ? "ok" : "risk", item: prc ? { code: `${prc.document_code} ${prc.section_number.toLowerCase()}`, owner: prc.owner_id, date: `Version ${prc.doc_version}`, title: `${prc.document_code} ${prc.section_number.toLowerCase()} ${prc.heading}`, sub: drift ? "Disagrees with the policy" : "Follows the policy", text: prc.text, href: `/coverage/?view=documents&doc=${prc.id}` } : null },
    { key: "control", kind: "Control", tone: ctl ? (fresh ? "ok" : "warn") : "risk", item: ctl ? { code: ctl.id, owner: ctl.owner_id, date: ctl.last_artifact_date ? `Last evidence ${fmtDate(ctl.last_artifact_date)}` : "No evidence yet", title: `${ctl.id} ${ctl.name}`, sub: `${ctl.cadence ?? "No cadence"} · ${ctl.control_type}`, text: `${ctl.name}. ${ctl.nature} control, ${ctl.cadence ?? "no set cadence"}.`, href: `/obligations/?control=${ctl.id}` } : null },
    {
      key: "evidence",
      kind: "Evidence",
      tone: ctl?.last_artifact_date ? (fresh ? "ok" : "warn") : "risk",
      item: ctl?.last_artifact_date ? { code: fmtDate(ctl.last_artifact_date), owner: ctl.owner_id, date: ctl.freshness_status === "quiet" ? `Quiet for ${ctl.quiet_days} days` : "Within its cadence", title: `Last evidence ${fmtDate(ctl.last_artifact_date)}`, sub: ctl.freshness_status === "quiet" ? `Quiet for ${ctl.quiet_days} days` : "Fresh", text: `The latest artifact from ${ctl.id} is dated ${fmtDate(ctl.last_artifact_date)}.` } : null,
    },
  ];
  // CTL-153 exists only once the demo has put it in force
  if (!ctl && d.id === "D-208-M1" && state === "covered") {
    layers[4] = { key: "control", kind: "Control", tone: "ok", item: { title: "CTL-153 Phishing-resistant MFA for privileged access", sub: "Monthly · in force today", text: "Phishing-resistant multi-factor authentication for every privileged user, including vendors, checked monthly. Signed off by the CCO today." } };
    layers[5] = { key: "evidence", kind: "Evidence", tone: "warn", item: { title: "First evidence due at the first monthly check", sub: "Not yet collected", text: "The control is new; its first evidence arrives with the first monthly check." } };
  }
  const num = (v: string) => v.replace(/ business days?/, " days");
  const brk = drift
    ? {
        policy: drift.policy_values.join(", "),
        procedure: drift.procedure_values.join(", "),
        limit: drift.duty_limit,
        short: `Policy: ${num(drift.policy_values[0])} · Procedure: ${drift.procedure_values[0].replace(/^(\d+) days?$/, "day $1")} · Rule: ${drift.duty_limit.split(" ")[0]}`,
      }
    : null;
  return { layers, brk };
}

const TONE_VAR: Record<Layer["tone"], string> = { ok: STATE_VAR.covered, warn: STATE_VAR.not_yet_confirmed, risk: STATE_VAR.nothing_behind, info: STATE_VAR.known_gap, plain: "--surface" };
const GAP = 1.4;
const SIZE: [number, number, number] = [4.4, 0.06, 2.6];

export function Lineage3D({ layers, brk, selected, onSelect }: { layers: Layer[]; brk: Break | null; selected: Layer["key"]; onSelect: (k: Layer["key"]) => void }) {
  const tk = useSceneTokens();
  const { zoom, zoomIn, zoomOut } = useZoom();
  const [reset, setReset] = useState(0);
  if (!tk) return <div className="h-full w-full" />;
  return (
    <div className="relative h-full w-full">
      <Stage tk={tk} label="What stands behind this obligation: rule text, obligation, policy, procedure, control and evidence" extent={8} camera={[0, 8, 11]}>
        <ChainScene tk={tk} layers={layers} brk={brk} selected={selected} onSelect={onSelect} zoom={zoom} reset={reset} />
      </Stage>
      <div className="absolute right-3 bottom-3 flex items-center gap-2">
        <ZoomButtons onIn={zoomIn} onOut={zoomOut} />
        <OverviewButton onClick={() => setReset((r) => r + 1)} />
      </div>
    </div>
  );
}

/** Six platforms on a gentle arc, left to right, joined by connectors, in the change map's language. */
const STEP_X = 3.0;
const at = (i: number): [number, number] => [(i - 2.5) * STEP_X, -Math.sin((i / 5) * Math.PI) * 1.1];
const PW = 2.2;
const PD = 1.5;

function ChainScene({ tk, layers, brk, selected, onSelect, zoom, reset }: { tk: Tokens; layers: Layer[]; brk: Break | null; selected: Layer["key"]; onSelect: (k: Layer["key"]) => void; zoom: ZoomSignal; reset: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const tone = (l: Layer) => (l.tone === "plain" ? tk["--ink3"] : tk[TONE_VAR[l.tone] as keyof Tokens]);
  return (
    <>
      <CameraRig overview={{ center: [0, 0.3, 0.35], size: [6 * STEP_X + 0.6, 1, 3.6] }} resetKey={reset} zoom={zoom} azimuth={0} polar={42} padding={0.04} fitMode="box" drift={false} />
      {layers.map((l, i) => {
        const [x, z] = at(i);
        const missing = !l.item;
        const on = selected === l.key;
        const lift = hover === l.key || on ? 0.12 : 0;
        const pick = (e: { stopPropagation: () => void }) => (e.stopPropagation(), onSelect(l.key));
        const over = (e: { stopPropagation: () => void }) => (e.stopPropagation(), setHover(l.key), (document.body.style.cursor = "pointer"));
        const out = () => (setHover(null), (document.body.style.cursor = ""));
        return (
          <group key={l.key}>
            {missing ? (
              <>
                <Platform position={[x, 0, z]} size={[PW, 0.1, PD]} radius={0.16} color={tk["--surface2"]} opacity={0.3} onClick={pick} onOver={over} onOut={out} />
                <Line points={[[x - PW / 2, 0.02, z - PD / 2], [x + PW / 2, 0.02, z - PD / 2], [x + PW / 2, 0.02, z + PD / 2], [x - PW / 2, 0.02, z + PD / 2], [x - PW / 2, 0.02, z - PD / 2]]} color={tk["--ink3"]} lineWidth={1.2} dashed dashSize={0.14} gapSize={0.1} />
              </>
            ) : (
              <>
                <Platform position={[x, 0, z]} size={[PW + 0.1, 0.035, PD + 0.1]} radius={0.2} color={on ? tk["--ink"] : tk["--lineStrong"]} castShadow={false} />
                <Platform position={[x, lift, z]} size={[PW, 0.14, PD]} radius={0.16} color={on ? mix(tk["--surface"], tk["--highlight"], 0.45) : tk["--surface"]} onClick={pick} onOver={over} onOut={out} />
                {/* what each layer is, as an object on its platform */}
                {l.key === "rule"
                  ? [0, 1, 2].map((k) => <Platform key={k} position={[x - 0.1 + k * 0.03, lift + 0.15 + k * 0.08, z - k * 0.02]} size={[1.1, 0.06, 0.8]} radius={0.03} color={tk["--surface2"]} onClick={pick} onOver={over} onOut={out} />)
                  : l.key === "obligation"
                    ? <Platform position={[x, lift + 0.15, z]} size={[0.5, 0.36, 0.5]} radius={0.12} color={tone(l)} onClick={pick} onOver={over} onOut={out} />
                    : <Platform position={[x, lift + 0.15, z]} size={[1.2, 0.08, 0.8]} radius={0.05} color={mix(tone(l), tk["--surface"], 0.5)} onClick={pick} onOver={over} onOut={out} />}
              </>
            )}
            <Label position={[x, lift, z + PD / 2 + 0.12]} anchor="top" interactive width={130} z={[14, 4]}>
              <button onClick={() => onSelect(l.key)} onMouseEnter={() => setHover(l.key)} onMouseLeave={() => setHover(null)} className="block w-full text-center">
                <span className={cn("inline-block rounded-[8px] px-1.5 py-0.5 text-[12.5px] leading-[17px] font-medium", on ? "bg-ink text-surface" : missing ? "text-ink3" : "text-ink")}>{l.kind}</span>
                <span className={cn("mt-0.5 block text-[11.5px] leading-[15px] whitespace-nowrap", missing ? "text-ink3" : "text-ink2")}>{l.item ? (l.item.code ?? l.item.title) : "Nothing here"}</span>
              </button>
            </Label>
          </group>
        );
      })}
      {/* connectors; a drift is a red break between Policy and Procedure */}
      {layers.slice(0, -1).map((l, i) => {
        const [ax, az] = at(i);
        const [bx, bz] = at(i + 1);
        const a: [number, number, number] = [ax + PW / 2 + 0.05, 0.08, az];
        const b: [number, number, number] = [bx - PW / 2 - 0.05, 0.08, bz];
        const missing = !l.item || !layers[i + 1].item;
        if (brk && l.key === "policy") {
          const m1: [number, number, number] = [a[0] + (b[0] - a[0]) * 0.38, 0.08, a[2] + (b[2] - a[2]) * 0.38];
          const m2: [number, number, number] = [a[0] + (b[0] - a[0]) * 0.62, 0.08, a[2] + (b[2] - a[2]) * 0.62];
          return (
            <group key={`c-${l.key}`}>
              <Line points={[a, m1]} color={tk["--risk"]} lineWidth={2.4} />
              <Line points={[m2, b]} color={tk["--risk"]} lineWidth={2.4} />
              <Label position={[(a[0] + b[0]) / 2, 0.1, (a[2] + b[2]) / 2 - 0.25]} anchor="bottom" z={[16, 6]}>
                <div className="rounded-[10px] bg-risk-soft px-2.5 py-1 text-center text-[11.5px] leading-[16px] whitespace-nowrap text-risk shadow-[0_0_0_1px_var(--line)]">
                  <span className="block font-medium">Drift</span>
                  {brk.short}
                </div>
              </Label>
            </group>
          );
        }
        return <Line key={`c-${l.key}`} points={[a, b]} color={missing ? tk["--ink3"] : tk["--ink"]} lineWidth={1.4} dashed={missing} dashSize={0.12} gapSize={0.1} transparent opacity={missing ? 0.6 : 0.55} />;
      })}
    </>
  );
}


function mix(a: string, b: string, k: number) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
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
