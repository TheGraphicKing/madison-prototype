"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { agentById, driftFor, dutiesFor, getDuty, impactFor, institution, linksFor, policyById, procedureById, sectionsFor, userById, vendorsFor } from "@/data";
import type { Run } from "@/data/types";
import type { RunState } from "@/lib/player/derive";
import { useStore } from "@/lib/store";
import { stepResult, stepTitle } from "@/lib/run-steps";
import { Mark } from "@/components/core/mark";
import { Typed } from "@/components/core/typed";
import { Button, ButtonLink } from "@/components/core/button";
import { StepDetail } from "./step-detail";

const BANK = institution.name.split(" ")[0];
const DISCLAIMER = "Replay of a recorded run. Live runs take several minutes.";

/* ---------- who is who ---------- */

function memberName(id: string) {
  if (id.startsWith("person:")) return userById(id.slice(7))?.name ?? "A person";
  return agentById(id)?.name ?? "Madison";
}
const isPerson = (id: string) => id.startsWith("person:");

/* ---------- the answers on the right ---------- */

interface Proof {
  quote: string;
  source: string;
}
interface Answer {
  key: string;
  q: string;
  a?: string;
  /** when the answer became known, on the run clock (undefined: known before the run) */
  at?: number;
  agents: string[];
  evidence: Proof[];
  waitingText: string;
}

const done = (st: RunState, k: string) => st.stages[k]?.state === "done";
const doneAt = (st: RunState, k: string) => st.stages[k]?.doneAt;
const plainReason = (s: string) => s.replace(/\s*\((bank )?profile:[^)]*\)/i, "").replace(/consumer EFT/g, "consumer electronic transfers");

function answersFor(run: Run, st: RunState, coverageAnswered: boolean): Answer[] {
  if (run.id === "run-rule-1005") {
    const ds = dutiesFor(run.change_id);
    const inScope = ds.filter((d) => d.applicability === "in_scope");
    const excluded = ds.filter((d) => d.applicability === "excluded");
    const scope = st.checks.find((c) => c.gate === "RC-17");
    const held = st.checks.find((c) => c.gate === "RC-04" && c.result === "block");
    const imp = impactFor(run.change_id);
    const vs = vendorsFor(run.change_id);
    const gap = inScope.find((d) => d.id === "D-1005-E2");
    const drift = gap ? driftFor(gap.id)[0] : undefined;
    const sec = sectionsFor(run.change_id).find((s) => s.changed);
    const source = "eCFR · 12 CFR 1005.11, amended 30 Sep 2026";
    return [
      {
        key: "apply",
        q: "Does it apply?",
        a: done(st, "scope") ? `Yes. ${scope ? plainReason(scope.reason) : `${BANK} offers card and ACH transfers`}.` : undefined,
        at: doneAt(st, "scope"),
        agents: ["RC-17"],
        waitingText: "Madison checks it against the bank profile.",
        evidence: [
          ...(sec ? [{ quote: sec.after, source: `${source} · ${sec.section_number}` }] : []),
          { quote: "Consumer electronic transfers: yes · debit cards: yes · prepaid accounts: no", source: `${BANK} bank profile, 1 Oct 2026` },
        ],
      },
      {
        key: "ask",
        q: "What does it ask?",
        a: done(st, "checks") ? `${inScope.length} obligations. ${excluded.length} excluded (prepaid accounts, not offered here). ${held ? 1 : 0} held back by the double-check.` : undefined,
        at: doneAt(st, "checks"),
        agents: ["RC-03", "QC-01", "RC-04"],
        waitingText: "Madison is finding the obligations and double-checking each one.",
        evidence: [
          ...inScope.slice(0, 3).map((d) => ({ quote: d.source_text, source: `${d.citation} · ${d.plain}` })),
          ...(held ? [{ quote: held.reason, source: "Held back by the double-check" }] : []),
        ],
      },
      {
        key: "covered",
        q: "Are we covered?",
        a: done(st, "coverage") ? `${inScope.length - 2} of ${inScope.length} covered. 1 not yet confirmed. 1 gap: ${gap ? lowerFirst(gap.plain) : "provisional credit"}` : undefined,
        at: doneAt(st, "coverage"),
        agents: ["RC-11", "RC-12"],
        waitingText: "Madison matches each obligation to policies and controls.",
        evidence: drift
          ? [
              { quote: "within 5 business days of receiving the error notice", source: "Rule 12 CFR 1005.11(c)(2)" },
              { quote: drift.policy_quote, source: "Policy POL-DISP-01 4.2" },
              { quote: drift.procedure_quote, source: "Procedure PRC-DISP-06 step 4" },
            ]
          : [],
      },
      {
        key: "touches",
        q: "What does it touch?",
        a: done(st, "touches") && imp ? `${imp.policy_sections.length} policy sections, ${imp.procedure_sections.length} procedures, ${imp.controls.length} controls and ${vs.length} vendors: ${vs.map((v) => v.vendor.name).join(", ")}.` : undefined,
        at: doneAt(st, "touches"),
        agents: ["RC-14", "RC-13"],
        waitingText: "Madison works out the policies, controls and vendors it reaches.",
        evidence: vs.map((v) => ({ quote: v.why, source: `${v.vendor.name} · vendor` })),
      },
    ];
  }
  if (run.id === "run-coverage-1026") {
    const d = getDuty("D-1026-L2");
    const drift = driftFor("D-1026-L2")[0];
    const links = d ? linksFor(d.id) : [];
    const pol = links.map((l) => (l.policy_section_id ? policyById(l.policy_section_id) : undefined)).find(Boolean);
    const prc = drift ? procedureById(drift.procedure_section_id) : undefined;
    return [
      { key: "apply", q: "Does it apply?", a: `Yes. ${BANK} makes mortgage loans, so Loan Estimate timing applies.`, agents: [], waitingText: "", evidence: [{ quote: "Mortgage origination: yes", source: `${BANK} bank profile, 1 Oct 2026` }] },
      {
        key: "ask",
        q: "What does it ask?",
        a: done(st, "read") && d ? `${d.plain}` : undefined,
        at: doneAt(st, "read"),
        agents: ["RC-11"],
        waitingText: "Madison reads the obligation.",
        evidence: d ? [{ quote: d.source_text, source: d.citation }] : [],
      },
      {
        key: "touches",
        q: "What does it touch?",
        a: done(st, "search") ? `Policy ${pol ? `${pol.document_code} ${pol.section_number}` : "POL-MTG-02 3.1"} and procedure ${prc ? `${prc.document_code} ${prc.section_number.toLowerCase()}` : "PRC-MTG-03 step 2"}.` : undefined,
        at: doneAt(st, "search"),
        agents: ["RC-11"],
        waitingText: "Madison searches policies, procedures and controls.",
        evidence: pol ? [{ quote: pol.text, source: `Policy ${pol.document_code} ${pol.section_number}` }] : [],
      },
      {
        key: "covered",
        q: "Are we covered?",
        a: done(st, "compare") ? (coverageAnswered ? "Linked. The policy matches the rule, and the procedure drift is being fixed." : "Not yet. The policy matches (3 business days), but the procedure says 5.") : undefined,
        at: doneAt(st, "compare"),
        agents: ["RC-12"],
        waitingText: "Madison compares the numbers in rule, policy and procedure.",
        evidence: drift
          ? [
              { quote: d?.source_text ?? "", source: "Rule 12 CFR 1026.19(e)(4)(i)" },
              { quote: drift.policy_quote, source: "Policy POL-MTG-02 3.1" },
              { quote: drift.procedure_quote, source: "Procedure PRC-MTG-03 step 2" },
            ]
          : [],
      },
    ];
  }
  // control design for the MFA gap
  const d = getDuty("D-208-M1");
  const vs = vendorsFor(run.change_id);
  const d6 = st.checks.filter((c) => c.gate === "D6").pop();
  const passed = new Set(st.checks.filter((c) => /^D\d$/.test(c.gate) && c.result === "pass").map((c) => c.gate)).size;
  return [
    { key: "apply", q: "Does it apply?", a: `Yes. Staff and vendors at ${BANK} hold privileged access to customer systems.`, agents: [], waitingText: "", evidence: [{ quote: "Privileged access by service providers: yes", source: `${BANK} bank profile, 1 Oct 2026` }] },
    { key: "ask", q: "What does it ask?", a: d ? d.plain : undefined, agents: [], waitingText: "", evidence: d ? [{ quote: d.source_text, source: d.citation }] : [] },
    {
      key: "covered",
      q: "Are we covered?",
      a: done(st, "publish")
        ? "Yes. CTL-153 is in force, so the obligation has a control behind it."
        : done(st, "checks") || st.stages.checks?.state === "running"
          ? `Not yet. CTL-153 is drafted; ${passed} of 7 design checks pass${d6 && d6.result !== "pass" ? `, and one waits on ${userById("u-priya")?.name}` : ""}.`
          : undefined,
      at: doneAt(st, "publish") ?? doneAt(st, "checks"),
      agents: ["CD-1", "CD-2", "RC-11"],
      waitingText: "Madison drafts a control and checks its design.",
      evidence: d6 ? [{ quote: d6.reason, source: "Design check D6 · cannot be bypassed" }] : [],
    },
    {
      key: "touches",
      q: "What does it touch?",
      a: done(st, "handoff") ? `${vs.length} vendor reviews and a retest plan, handed to their owners.` : done(st, "draft") ? "Policy POL-ISP-01 3.1 and a new control, CTL-153." : undefined,
      at: doneAt(st, "handoff") ?? doneAt(st, "draft"),
      agents: ["CD-1", "RC-14"],
      waitingText: "Madison works out who else needs to act.",
      evidence: vs.map((v) => ({ quote: v.why, source: `${v.vendor.name} · vendor` })),
    },
  ];
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* ---------- the view ---------- */

export function AgentView({
  run,
  st,
  playing,
  selected,
  onSelect,
  checkpoint,
}: {
  run: Run;
  st: RunState;
  playing: boolean;
  selected: string | null;
  onSelect: (key: string | null) => void;
  checkpoint: ReactNode | null;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [hideDecision, setHideDecision] = useState<string | null>(null);
  const deciding = Boolean(checkpoint && st.pending && hideDecision !== st.pending.key);
  const touched = (agents: string[]) => !focus || agents.includes(focus);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[220px_minmax(0,1fr)_320px] gap-4 px-6 pt-5 pb-3 max-xl:grid-cols-[200px_minmax(0,1fr)_300px] max-lg:grid-cols-1 max-md:px-4">
        <Team run={run} st={st} focus={focus} onFocus={(id) => setFocus((f) => (f === id ? null : id))} />
        <section aria-label="The flow" className="relative flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-surface2/60 max-lg:min-h-0">
          <div className="flex items-baseline justify-between gap-4 px-6 pt-5">
            <h2 className="text-[17px] leading-6 font-medium tracking-[-0.01em]">{run.title}</h2>
            {focus ? (
              <button onClick={() => setFocus(null)} className="shrink-0 text-[13px] text-ink2 underline underline-offset-4 hover:text-ink">
                Showing {memberName(focus)} · clear
              </button>
            ) : (
              <span className="shrink-0 text-[12.5px] text-ink3 max-md:hidden">Click a step for its detail, or a team member to trace their work</span>
            )}
          </div>
          <Flow run={run} st={st} playing={playing} selected={selected} onSelect={onSelect} focus={focus} onOpenDecision={() => setHideDecision(null)} />
          <AnimatePresence>
            {deciding ? (
              <motion.div
                key="decide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-ground/85 p-6 max-md:p-3"
              >
                <motion.div initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 26 }} className="w-full max-w-[660px]">
                  <div className="mb-2 flex justify-end">
                    <Button variant="quiet" size={32} onClick={() => setHideDecision(st.pending!.key)}>
                      Back to the flow
                    </Button>
                  </div>
                  {checkpoint}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
        <Found run={run} st={st} playing={playing} selected={selected} onSelect={onSelect} touched={touched} onOpenDecision={() => setHideDecision(null)} />
      </div>
      <footer className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-6 pb-5 text-[12.5px] text-ink3 max-md:flex-col max-md:items-start max-md:px-4">
        <span className="min-w-0 flex-1 truncate text-ink2" aria-live="polite">
          {st.done ? "Finished. Every step stays open to inspect." : st.pending ? `Waiting for ${userById(st.pending.waiting_for)?.name}` : (st.narration?.text ?? "Ready to play")}
        </span>
        <span>{DISCLAIMER}</span>
      </footer>
    </div>
  );
}

/* ---------- left: Madison's team ---------- */

function Team({ run, st, focus, onFocus }: { run: Run; st: RunState; focus: string | null; onFocus: (id: string) => void }) {
  const persona = useStore((s) => s.persona);
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({});
  const body = (
    <ol className="flex flex-col gap-1">
      {run.stages.map((s, i) => {
        const state = st.stages[s.key].state;
        const fin = state === "done";
        const folded = fin && !unfolded[s.key] && !s.agents.includes(focus ?? "");
        return (
          <li key={s.key} className={cn("rounded-[12px] transition-opacity", focus && !s.agents.includes(focus) && "opacity-40")}>
            {folded ? (
              <button onClick={() => setUnfolded((u) => ({ ...u, [s.key]: true }))} className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left hover:bg-surface2" title="Show who worked on this step">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-surface">
                  <Mark kind="check" size={9} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink2">{stepTitle(run, s.key)}</span>
                {s.agents.length > 1 ? <span className="shrink-0 text-[11px] text-ink3">{s.agents.length}</span> : null}
              </button>
            ) : (
              <div className="px-1 py-1">
                <div className="flex items-center justify-between px-1.5 pb-1">
                  <span className={cn("text-[12px] font-medium", state === "waiting" ? "text-ink3" : "text-ink2")}>{stepTitle(run, s.key)}</span>
                  <span className="t-data text-[10.5px] text-ink3">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {s.agents.map((id) => {
                    const lit = st.activeAgents.includes(id) || (isPerson(id) && state === "waiting_person");
                    const you = isPerson(id) && id.slice(7) === persona;
                    return (
                      <li key={id}>
                        <button
                          onClick={() => onFocus(id)}
                          aria-pressed={focus === id}
                          className={cn(
                            "relative flex w-full items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 py-2 text-left text-[13.5px] transition-colors duration-300",
                            lit ? "bg-highlight text-highlight-ink" : focus === id ? "bg-surface shadow-[inset_0_0_0_1px_var(--ink)]" : "hover:bg-surface2",
                          )}
                        >
                          <span className={cn("relative block size-[7px] shrink-0 rounded-full", lit ? "bg-highlight-ink" : fin ? "bg-ink" : "bg-line-strong")}>
                            {lit ? <span className="ring-wait absolute inset-0 rounded-full" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{memberName(id)}</span>
                          {isPerson(id) ? <span className={cn("text-[11px]", lit ? "" : "text-ink3")}>{you ? "you" : "person"}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
  return (
    <aside aria-label="Madison's team" className="min-w-0 self-start rounded-[16px] border border-line bg-surface p-3 shadow-(--shadow-rest) lg:sticky lg:top-[88px]">
      <div className="max-lg:hidden">
        <div className="flex items-baseline justify-between px-1.5 pt-1 pb-3">
          <h2 className="text-[14px] font-medium">Madison&apos;s team</h2>
          <span className="text-[12px] text-ink3">{new Set(run.stages.flatMap((s) => s.agents).filter((a) => !isPerson(a))).size} agents</span>
        </div>
        {body}
      </div>
      <details className="lg:hidden">
        <summary className="cursor-pointer px-1.5 py-1 text-[14px] font-medium">Madison&apos;s team</summary>
        <div className="pt-2">{body}</div>
      </details>
    </aside>
  );
}

/* ---------- centre: the flow ---------- */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Bez = [number, number, number, number, number, number, number, number];

function bezPoint(b: Bez, t: number) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = b;
  const u = 1 - t;
  return {
    x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
    y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
  };
}

function Flow({
  run,
  st,
  playing,
  selected,
  onSelect,
  focus,
  onOpenDecision,
}: {
  run: Run;
  st: RunState;
  playing: boolean;
  selected: string | null;
  onSelect: (k: string | null) => void;
  focus: string | null;
  onOpenDecision: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [width, setWidth] = useState(900);
  const n = run.stages.length;
  const perRow = width < 560 ? 1 : n <= 4 ? n : Math.ceil(n / 2);
  const runningKey = run.stages.find((s) => st.stages[s.key].state === "running")?.key;

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      setBoxes(refs.current.map((r) => (r ? { x: r.offsetLeft, y: r.offsetTop, w: r.offsetWidth, h: r.offsetHeight } : { x: 0, y: 0, w: 0, h: 0 })));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    refs.current.forEach((r) => r && ro.observe(r));
    return () => ro.disconnect();
  }, [n, perRow, runningKey, st.done, Boolean(st.pending)]);

  const place = (i: number) => {
    const r = Math.floor(i / perRow);
    const c = r % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
    return { r, c };
  };

  // one curve per hop, from step i to step i + 1
  const edges: Bez[] = useMemo(() => {
    if (boxes.length !== n) return [];
    const out: Bez[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      const pa = place(i);
      const pb = place(i + 1);
      if (pa.r === pb.r) {
        const ltr = pb.c > pa.c;
        const x0 = ltr ? a.x + a.w : a.x;
        const x3 = ltr ? b.x : b.x + b.w;
        const y0 = a.y + 52;
        const y3 = b.y + 52;
        const mx = (x0 + x3) / 2;
        out.push([x0, y0, mx, y0, mx, y3, x3, y3]);
      } else {
        const x0 = a.x + a.w / 2;
        const y0 = a.y + a.h;
        const x3 = b.x + b.w / 2;
        const y3 = b.y;
        const my = (y0 + y3) / 2;
        out.push([x0, y0, x0, my, x3, my, x3, y3]);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes, n, perRow]);

  const idx = (k: string) => run.stages.findIndex((s) => s.key === k);
  // packets: real items in flight between steps, placed on the curve by their progress
  const packets = st.inFlight
    .map((it) => {
      const to = idx(it.to);
      if (to <= 0 || !edges[to - 1]) return null;
      return { key: it.key, ...bezPoint(edges[to - 1], Math.min(1, Math.max(0, it.progress))), agent: it.agentId };
    })
    .filter(Boolean) as { key: string; x: number; y: number; agent?: string }[];
  // while a step works and nothing is in flight, a soft packet loops into it, on the run clock
  const ri = runningKey ? idx(runningKey) : -1;
  if (playing && ri > 0 && packets.length === 0 && edges[ri - 1]) packets.push({ key: "ambient", ...bezPoint(edges[ri - 1], (st.t % 1600) / 1600) });

  const h = boxes.length ? Math.max(...boxes.map((b) => b.y + b.h)) + 8 : 0;

  return (
    <div className="flex flex-1 flex-col justify-center">
    <div ref={wrap} className="relative mx-6 my-8 max-md:mx-4">
      <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width="100%" height={h}>
        {edges.map((b, i) => {
          const from = run.stages[i];
          const to = run.stages[i + 1];
          const lit = st.stages[from.key].state === "done" && st.stages[to.key].state !== "waiting";
          const dim = focus && !(from.agents.includes(focus) || to.agents.includes(focus));
          return (
            <path
              key={i}
              d={`M${b[0]},${b[1]} C${b[2]},${b[3]} ${b[4]},${b[5]} ${b[6]},${b[7]}`}
              fill="none"
              stroke={lit ? "var(--ink)" : "var(--lineStrong)"}
              strokeOpacity={dim ? 0.15 : lit ? 0.55 : 1}
              strokeWidth={1}
              strokeDasharray={lit ? undefined : "3 4"}
              style={{ transition: "stroke 400ms, stroke-opacity 300ms" }}
            />
          );
        })}
        {packets.map((p) => (
          <g key={p.key} transform={`translate(${p.x},${p.y})`} opacity={focus && p.agent && p.agent !== focus ? 0.2 : 1}>
            <circle r={6} fill="var(--highlight)" opacity={0.45} />
            <circle r={3.2} fill="var(--ink)" />
          </g>
        ))}
      </svg>
      <ol className="relative grid gap-x-10 gap-y-14" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
        {run.stages.map((s, i) => {
          const { r, c } = place(i);
          return (
            <li key={s.key} ref={(el) => void (refs.current[i] = el as unknown as HTMLDivElement)} style={{ gridRow: r + 1, gridColumn: c + 1 }} className="min-w-0 self-start">
              <StepCard run={run} st={st} stageKey={s.key} index={i} selected={selected === s.key} onSelect={() => onSelect(selected === s.key ? null : s.key)} dim={Boolean(focus && !s.agents.includes(focus))} playing={playing} onOpenDecision={onOpenDecision} />
            </li>
          );
        })}
      </ol>
    </div>
    </div>
  );
}

function StepCard({
  run,
  st,
  stageKey,
  index,
  selected,
  onSelect,
  dim,
  playing,
  onOpenDecision,
}: {
  run: Run;
  st: RunState;
  stageKey: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
  dim: boolean;
  playing: boolean;
  onOpenDecision: () => void;
}) {
  const persona = useStore((s) => s.persona);
  const stage = run.stages.find((s) => s.key === stageKey)!;
  const s = st.stages[stageKey];
  const running = s.state === "running";
  const waitingPerson = s.state === "waiting_person";
  const fin = s.state === "done";
  const waiting = s.state === "waiting";
  const responder = st.responded.find((r) => r.event.stage === stageKey);
  const result = stepResult(run, stageKey, st, stage.kind === "person" && fin ? userById(responder?.event.waiting_for ?? "")?.name : undefined);
  const gate = stage.kind === "gate" ? gateCounts(run, st, stage.agents) : null;
  const who = stage.kind === "person" ? stage.agents[0].slice(7) : null;

  return (
    <motion.div
      animate={{ scale: running || waitingPerson ? 1.035 : 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className={cn("relative transition-opacity duration-300", dim && "opacity-30", (running || waitingPerson) && "z-10")}
    >
      <button
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex min-h-[148px] w-full flex-col rounded-[14px] border px-4 pt-3.5 pb-3.5 text-left transition-[background-color,border-color,box-shadow] duration-300",
          waitingPerson ? "border-transparent bg-highlight text-highlight-ink shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--ink)_35%,transparent)]" : "bg-surface",
          !waitingPerson && (selected ? "border-ink" : running ? "border-ink/30 shadow-[0_12px_32px_-14px_color-mix(in_oklab,var(--ink)_40%,transparent)]" : "border-line shadow-(--shadow-rest)"),
          waiting && "bg-surface/70",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Dot state={s.state} />
            <span className={cn("t-data text-[10.5px]", waitingPerson ? "" : "text-ink3")}>{String(index + 1).padStart(2, "0")}</span>
          </span>
          {fin ? <span className="text-[11.5px] text-ink3">Done</span> : running ? <span className="text-[11.5px] font-medium">Working</span> : waitingPerson ? <span className="text-[11.5px] font-medium">{who === persona ? "Waiting for you" : `Waiting for ${userById(who ?? "")?.name?.split(" ")[0]}`}</span> : null}
        </div>
        <div className={cn("mt-2 text-[15px] leading-[21px] font-medium", waiting && "text-ink3")}>{stepTitle(run, stageKey)}</div>

        {running && st.narration ? (
          <div className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-[18px] text-ink2">
            <span className="relative mt-[5px] block h-1.5 w-7 shrink-0 overflow-hidden" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="live-dot absolute top-0 block size-1.5 rounded-full bg-ink" style={{ animationDelay: `${d * 0.35}s` }} />
              ))}
            </span>
            <Typed key={st.narration.text} text={st.narration.text} elapsed={playing ? st.narration.elapsed : undefined} cps={70} caret="while" />
          </div>
        ) : null}

        {gate && (gate.passed || gate.held) ? (
          <div className="mt-2.5">
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: gate.total }).map((_, k) => (
                <span key={k} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", k < gate.passed ? "bg-ok" : k < gate.passed + gate.held ? "bg-warn" : "bg-surface3")} />
              ))}
            </div>
            <div className="mt-1.5 text-[12.5px] text-ink2">
              {gate.passed} passed{gate.held ? ` · ${gate.held} ${gate.heldWord}` : ""}
            </div>
            {gate.heldItem ? (
              <div className="mt-2 rounded-[10px] bg-warn-soft px-2.5 py-2 text-[12px] leading-[17px] text-warn">
                <span className="font-medium">{gate.heldItem.label}</span>
                <span className="line-clamp-3 block text-ink2">{gate.heldItem.reason}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {result && fin && !gate ? <div className="mt-1.5 line-clamp-2 text-[12.5px] leading-[18px] text-ink2">{result}</div> : null}
        {waitingPerson ? <div className="mt-1.5 text-[12.5px] leading-[18px] opacity-80">{st.pending?.prompt}</div> : null}
        <div className="mt-auto flex flex-wrap gap-1 pt-3">
          {stage.agents.map((id) => {
            const lit = st.activeAgents.includes(id);
            return (
              <span key={id} className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11px] transition-colors duration-300", lit ? "bg-highlight text-highlight-ink" : waitingPerson ? "bg-highlight-ink/10" : "bg-surface2 text-ink2")}>
                <span className={cn("block size-[5px] rounded-full", lit ? "bg-highlight-ink" : fin ? "bg-ink" : "bg-line-strong")} />
                {memberName(id)}
              </span>
            );
          })}
        </div>
      </button>
      {waitingPerson && who === persona ? (
        <div className="mt-2">
          <Button variant="primary" size={32} onClick={onOpenDecision} className="w-full">
            Open the decision
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}

function gateCounts(run: Run, st: RunState, agents: string[]) {
  const checks = st.checks.filter((c) => agents.includes(c.gate) || /^D\d$/.test(c.gate));
  const byItem = new Map<string, string>();
  for (const c of checks) {
    const key = /^D\d$/.test(c.gate) ? c.gate : c.item_ref;
    const prev = byItem.get(key);
    // a later pass on the same design check replaces "cannot tell"
    byItem.set(key, /^D\d$/.test(c.gate) ? c.result : prev === "block" ? "block" : c.result);
  }
  const vals = [...byItem.values()];
  const held = vals.filter((v) => v !== "pass").length;
  const passed = vals.length - held;
  const heldCheck = [...checks].reverse().find((c) => c.result !== "pass" && byItem.get(/^D\d$/.test(c.gate) ? c.gate : c.item_ref) !== "pass");
  const total = run.id === "run-design-mfa" ? 7 : Math.max(vals.length, dutyCount(run));
  return {
    passed,
    held,
    total,
    heldWord: run.id === "run-design-mfa" ? "waits on the owner" : "held back",
    heldItem: heldCheck ? { label: getDuty(heldCheck.item_ref)?.plain ?? heldCheck.label ?? "One proposed obligation", reason: heldCheck.reason.replace(/\s*Held back\.$/, "") } : null,
  };
}
const dutyCount = (run: Run) => dutiesFor(run.change_id).length + 1;

function Dot({ state }: { state: string }) {
  if (state === "done")
    return (
      <span className="grid size-[16px] place-items-center rounded-full bg-ink text-surface">
        <Mark kind="check" size={9} strokeWidth={1.8} />
      </span>
    );
  if (state === "running")
    return (
      <span className="relative grid size-[16px] place-items-center">
        <span className="absolute inset-0 rounded-full ring-[1.5px] ring-ink" />
        <span className="breathe absolute inset-[4px] rounded-full bg-ink" />
      </span>
    );
  if (state === "waiting_person")
    return (
      <span className="ring-wait relative grid size-[16px] place-items-center rounded-full bg-highlight-ink/15">
        <span className="block size-[6px] rounded-full bg-highlight-ink" />
      </span>
    );
  return <span className="block size-[16px] rounded-full shadow-[inset_0_0_0_1.5px_var(--lineStrong)]" />;
}

/* ---------- right: What Madison found ---------- */

function Found({
  run,
  st,
  playing,
  selected,
  onSelect,
  touched,
  onOpenDecision,
}: {
  run: Run;
  st: RunState;
  playing: boolean;
  selected: string | null;
  onSelect: (k: string | null) => void;
  touched: (agents: string[]) => boolean;
  onOpenDecision: () => void;
}) {
  const coverageAnswered = useStore((s) => Boolean(s.handoffs["H-118"]) || s.decisions.some((d) => d.runId === "run-coverage-1026"));
  const answers = answersFor(run, st, coverageAnswered);
  const [open, setOpen] = useState<string | null>(null);

  if (selected)
    return (
      <aside aria-label="Step detail" className="min-w-0 self-start rounded-[16px] border border-line bg-surface p-5 shadow-(--shadow-rest) lg:sticky lg:top-[88px]">
        <button onClick={() => onSelect(null)} className="mb-3 flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink">
          <Mark kind="chevron-left" size={11} /> What Madison found
        </button>
        <StepDetail run={run} stageKey={selected} st={st} />
      </aside>
    );

  return (
    <aside aria-label="What Madison found" className="min-w-0 self-start rounded-[16px] border border-line bg-surface p-5 shadow-(--shadow-rest) lg:sticky lg:top-[88px]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium">{st.done ? "Summary" : "What Madison found"}</h2>
        <span className="text-[12px] text-ink3">{answers.filter((a) => a.a).length} of {answers.length + 1}</span>
      </div>
      {st.done ? <p className="mt-3 rounded-[10px] bg-ok-soft px-3 py-2 text-[13px] text-ok">Finished. Every answer below links to the rule&apos;s own words.</p> : null}
      <ol className="mt-4 flex flex-col">
        {answers.map((a) => {
          const since = a.at !== undefined ? st.t - a.at : undefined;
          const fresh = playing && since !== undefined && since < 4000;
          return (
            <li key={a.key} className={cn("border-t border-line py-3.5 transition-opacity duration-300", !touched(a.agents) && "opacity-35")}>
              <div className="text-[12.5px] font-medium text-ink3">{a.q}</div>
              {a.a ? (
                <>
                  <p className="mt-1 text-[14.5px] leading-[22px] text-ink">{fresh ? <Typed key={a.a} text={a.a} elapsed={since} cps={90} caret="while" /> : a.a}</p>
                  {a.evidence.length ? (
                    <button onClick={() => setOpen(open === a.key ? null : a.key)} aria-expanded={open === a.key} className="mt-1.5 text-[12.5px] font-medium text-ink2 underline underline-offset-4 hover:text-ink">
                      {open === a.key ? "Hide evidence" : "See evidence"}
                    </button>
                  ) : null}
                  <AnimatePresence initial={false}>
                    {open === a.key ? (
                      <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                        {a.evidence.map((e, i) => (
                          <li key={i} className="mt-2 rounded-[10px] bg-surface2 px-3 py-2.5">
                            <p className="text-[13px] leading-[20px]">&ldquo;{e.quote}&rdquo;</p>
                            <p className="mt-1 text-[11.5px] text-ink3">{e.source}</p>
                          </li>
                        ))}
                      </motion.ul>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : (
                <p className="mt-1 flex items-center gap-2 text-[13.5px] leading-[21px] text-ink3">
                  <span className="block h-[3px] w-6 shrink-0 rounded-full bg-surface3" />
                  {a.waitingText}
                </p>
              )}
            </li>
          );
        })}
        <li className="border-t border-line pt-3.5">
          <div className="text-[12.5px] font-medium text-ink3">What do I do now?</div>
          <NowAction run={run} st={st} onOpenDecision={onOpenDecision} />
        </li>
      </ol>
    </aside>
  );
}

function NowAction({ run, st, onOpenDecision }: { run: Run; st: RunState; onOpenDecision: () => void }) {
  const persona = useStore((s) => s.persona);
  if (st.pending) {
    const mine = st.pending.waiting_for === persona;
    return (
      <div className="mt-1.5">
        <p className="text-[14.5px] leading-[22px]">{mine ? st.pending.prompt : `Nothing yet. ${userById(st.pending.waiting_for)?.name} has the next step.`}</p>
        {mine ? (
          <Button variant="primary" size={40} className="mt-3 w-full" onClick={onOpenDecision}>
            {run.id === "run-rule-1005" ? "Decide on the obligations" : run.id === "run-coverage-1026" ? "Confirm the links" : "Answer and continue"}
          </Button>
        ) : null}
      </div>
    );
  }
  if (st.done) {
    const next =
      run.id === "run-rule-1005"
        ? { text: "Fix the provisional credit gap: the policy and procedure still allow 10 days.", label: "Open what's left", href: `/rules/${run.change_id}/#card-whats_left` }
        : run.id === "run-coverage-1026"
          ? { text: "Nothing more here. The procedure fix is with its owner.", label: "Open the change room", href: `/rules/${run.change_id}/` }
          : { text: "Nothing more here. The vendor reviews and the retest are with their owners.", label: "Open the change room", href: `/rules/${run.change_id}/` };
    return (
      <div className="mt-1.5">
        <p className="text-[14.5px] leading-[22px]">{next.text}</p>
        <ButtonLink href={next.href} variant="primary" size={40} className="mt-3 w-full">
          {next.label}
        </ButtonLink>
      </div>
    );
  }
  return (
    <p className="mt-1 text-[13.5px] leading-[21px] text-ink3">
      Nothing yet. Madison asks you when there is something to decide.{" "}
      <Link href={`/rules/${run.change_id}/`} className="underline underline-offset-4 hover:text-ink">
        Change room
      </Link>
    </p>
  );
}
