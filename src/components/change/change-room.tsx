"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { CoverageState, Duty, RuleChange } from "@/data/types";
import {
  controlById,
  driftFlags,
  dutiesFor,
  getDuty,
  impactFor,
  institution,
  knownGaps,
  linksFor,
  policyById,
  procedureById,
  run as getRun,
  tasks,
  userById,
  vendors,
  vendorsFor,
} from "@/data";
import { useStore } from "@/lib/store";
import { STEPS, STEP_LABEL, stepsDone, STATE_WORD, useChange, useCoverage } from "@/lib/use-change";
import { daysFrom, fmtDate, relDays } from "@/lib/dates";
import { Page } from "@/components/layout/page";
import { MonoLabel, MetaList } from "@/components/core/labels";
import { PersonTag, AgentTag } from "@/components/core/tags";
import { CertaintyWord, certaintyFrom, FOUR_STATES, StatusChip } from "@/components/core/status";
import { Mark, Square } from "@/components/core/mark";
import { Button, ButtonLink } from "@/components/core/button";
import { SlideOver } from "@/components/core/overlays";
import { Count } from "@/components/core/labels";
import { RunStrip } from "@/components/canvas/strip";
import { usePlayback } from "@/lib/player/engine";
import { TaskNow } from "./task-now";
import { DriftPair } from "./drift-pair";

type Step = (typeof STEPS)[number];
const SECTION_STEPS: Step[] = ["applies", "duties", "linked", "covered", "whats_left"];

export function ChangeRoom({ id }: { id: string }) {
  const c = useChange(id)!;
  const sp = useSearchParams();
  const router = useRouter();
  const finished = useStore((s) => s.finishedRuns);
  const runId = c.run_id ?? (id === "RC-2026-016" ? "run-coverage-1026" : undefined);
  const r = runId ? getRun(runId) : undefined;
  const revealed = runId ? Boolean(finished[runId]) : true;
  const done = stepsDone(c);
  const currentStep: Step = done >= 5 ? "whats_left" : (STEPS[done] as Step);
  const [open, setOpen] = useState<Step>(currentStep);
  const [touches, setTouches] = useState(false);

  useEffect(() => {
    const st = sp.get("step") as Step | null;
    if (st && SECTION_STEPS.includes(st)) setOpen(st);
    else setOpen(currentStep);
    if (sp.get("touches")) setTouches(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, c.state]);

  const inst = usePlayback((s) => (runId ? s.instances[runId] : undefined));
  const running = Boolean(inst && inst.mode === "live" && !inst.completed && (inst.playing || inst.t > 0));

  const effDays = daysFrom(c.effective_date);
  return (
    <Page>
      {running && runId ? (
        <div className="mb-10">
          <RunStrip runId={runId} instanceKey={runId} href={`/runs/${runId}/?mode=live&from=/rules/${id}/`} />
        </div>
      ) : null}

      <header className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="t-data text-ink">{c.citation}</span>
            <span className="t-label">{c.agency} · {c.kind}</span>
            <StateWord change={c} />
          </div>
          <h1 className="t-page mt-3 max-w-[30ch]">{c.title}</h1>
          <p className="mt-3 max-w-[68ch] text-ink2">{c.summary}</p>
          {c.synthetic_note ? <p className="t-label mt-3">{c.synthetic_note}</p> : null}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 self-end lg:col-span-4">
          <div>
            <dt className="t-label">Effective</dt>
            <dd className="mt-1 text-[15px]">
              {fmtDate(c.effective_date)} <span className="text-ink3">· {effDays >= 0 ? relDays(c.effective_date) : `${-effDays} days ago`}</span>
            </dd>
          </div>
          <div>
            <dt className="t-label">Published</dt>
            <dd className="mt-1 text-[15px]">{fmtDate(c.published_at)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="t-label">Owner</dt>
            <dd className="mt-1.5">
              <PersonTag id={c.owner_id} showRole />
            </dd>
          </div>
        </dl>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-8">
          <TaskNow change={c} />

          <StepTrack change={c} open={open} onOpen={setOpen} revealed={revealed} />

          <div className="flex flex-col border-t border-line">
            {SECTION_STEPS.map((s) => (
              <SectionRow key={s} step={s} change={c} open={open === s} onToggle={() => setOpen(open === s ? currentStep : s)} revealed={revealed} runId={runId} />
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-10 lg:col-span-4">
          <WhoHasThis change={c} />
          <div className="flex flex-col gap-3">
            <MonoLabel>What it touches</MonoLabel>
            <TouchSummary change={c} revealed={revealed} />
            <Button variant="quiet" size={40} className="self-start" onClick={() => setTouches(true)} disabled={!revealed && c.id === "RC-2026-014"}>
              Open what it touches
            </Button>
          </div>
          {r ? (
            <div className="flex flex-col gap-3">
              <MonoLabel>How Madison got here</MonoLabel>
              <p className="text-[14px] leading-[22px] text-ink2">
                {revealed ? `${r.title}. Every step is in the record; replay it to see what was read and why.` : "Madison has not run on this change in this session. The replay opens after the first run."}
              </p>
              <ButtonLink href={`/runs/${r.id}/?mode=replay&from=/rules/${id}/`} variant="text" size={40} className={cn("self-start", !revealed && "pointer-events-none opacity-40")} aria-disabled={!revealed}>
                Replay the run
              </ButtonLink>
            </div>
          ) : null}
        </aside>
      </div>

      <TouchesOver change={c} open={touches} onOpenChange={(o) => {
        setTouches(o);
        if (!o && sp.get("touches")) router.replace(`/rules/${id}/`, { scroll: false });
      }} />
    </Page>
  );
}

function StateWord({ change }: { change: RuleChange }) {
  const color =
    change.state === "closed" || change.state === "covered"
      ? "var(--ok)"
      : change.state === "whats_left"
        ? "var(--warn)"
        : change.state === "screened_out"
          ? "var(--ink3)"
          : change.state === "new"
            ? "var(--highlight)"
            : "var(--ink)";
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink2">
      <Square size={6} color={color} style={change.state === "new" ? { boxShadow: "0 0 0 1px var(--ink)" } : undefined} />
      {STATE_WORD[change.state]}
    </span>
  );
}

/** Applies, Duties, Linked, Covered, What's left, Close: squares and hairlines, every step clickable. */
function StepTrack({ change, open, onOpen, revealed }: { change: RuleChange; open: Step; onOpen: (s: Step) => void; revealed: boolean }) {
  const done = stepsDone(change);
  const summaries = useStepSummaries(change, revealed);
  return (
    <nav aria-label="Journey" className="relative">
      <ol className="grid grid-cols-6 max-md:grid-cols-3 max-md:gap-y-6">
        {STEPS.map((s, i) => {
          const isDone = i < done;
          const isCur = i === done && done < 6;
          const clickable = s !== "close";
          return (
            <li key={s} className="relative">
              {i > 0 ? <span aria-hidden className={cn("absolute top-[5px] right-[calc(100%-6px)] left-[-100%] h-px max-md:hidden", i <= done ? "bg-ink" : "bg-lineStrong")} /> : null}
              <button
                disabled={!clickable}
                onClick={() => clickable && onOpen(s as Step)}
                aria-current={isCur ? "step" : undefined}
                className={cn("group relative flex w-full flex-col items-start gap-2 pr-3 text-left", open === s && "text-ink")}
              >
                <span
                  className="relative z-[1] block size-[11px]"
                  style={{
                    background: isDone ? "var(--ink)" : isCur ? "var(--highlight)" : "var(--ground)",
                    boxShadow: `0 0 0 3px var(--ground), inset 0 0 0 1px ${isDone || isCur ? "var(--ink)" : "var(--lineStrong)"}`,
                  }}
                />
                <span className={cn("text-[14px] leading-5", open === s ? "font-medium text-ink underline underline-offset-4" : isDone || isCur ? "text-ink" : "text-ink3", clickable && "group-hover:text-ink")}>
                  {STEP_LABEL[s]}
                </span>
                <span className="text-[12px] leading-[17px] text-ink2">{summaries[s]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function useStepSummaries(c: RuleChange, revealed: boolean): Record<Step, string> {
  const ds = dutiesFor(c.id).filter((d) => d.applicability === "in_scope");
  const k = c.counts;
  const done = stepsDone(c);
  const linkCount = ds.reduce((n, d) => n + linksFor(d.id).length, 0);
  const s = (i: number, text: string, waiting = "Not yet") => (done > i ? text : done === i ? "Now" : waiting);
  if (c.state === "screened_out") return { applies: "Doesn't apply", duties: "", linked: "", covered: "", whats_left: "", close: "" };
  if (c.state === "uncertain") return { applies: "Needs one bank fact", duties: "", linked: "", covered: "", whats_left: "", close: "" };
  if (!revealed && c.id === "RC-2026-014") return { applies: "Now", duties: "Not yet", linked: "Not yet", covered: "Not yet", whats_left: "Not yet", close: "Not yet" };
  return {
    applies: s(0, "Applies · Clear"),
    duties: s(1, `${k?.duties ?? ds.length} obligations${c.after_run?.excluded && revealed ? ` · ${c.after_run.excluded} excluded` : ""}`),
    linked: s(2, `${linkCount} links`),
    covered: s(3, k ? `${k.covered} of ${k.duties} covered` : "Covered"),
    whats_left: s(4, "Nothing left"),
    close: done >= 6 ? (c.closed_at ? `Closed ${fmtDate(c.closed_at)}` : "Closed") : "Not yet",
  };
}

function SectionRow({ step, change, open, onToggle, revealed, runId }: { step: Step; change: RuleChange; open: boolean; onToggle: () => void; revealed: boolean; runId?: string }) {
  const summaries = useStepSummaries(change, revealed);
  const done = stepsDone(change);
  const i = STEPS.indexOf(step);
  const state = i < done ? "done" : i === done ? "now" : "later";
  return (
    <section id={`step-${step}`} className="border-b border-line">
      <button onClick={onToggle} aria-expanded={open} className="group flex w-full items-center gap-4 py-5 text-left">
        <Square size={7} filled={state !== "later"} color={state === "now" ? "var(--highlight)" : "var(--ink)"} style={state === "now" ? { boxShadow: "0 0 0 1px var(--ink)" } : undefined} />
        <span className="t-section w-[150px] shrink-0">{STEP_LABEL[step]}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] text-ink2">{summaries[step]}</span>
        <Mark kind={open ? "chevron-up" : "chevron-down"} className="text-ink3 group-hover:text-ink" />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-8 pl-[23px]">
              {step === "applies" ? <AppliesBody change={change} revealed={revealed} runId={runId} /> : null}
              {step === "duties" ? <DutiesBody change={change} revealed={revealed} runId={runId} /> : null}
              {step === "linked" ? <LinkedBody change={change} revealed={revealed} /> : null}
              {step === "covered" ? <CoveredBody change={change} revealed={revealed} /> : null}
              {step === "whats_left" ? <WhatsLeftBody change={change} revealed={revealed} /> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function NotYet({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[60ch] text-[14px] leading-[22px] text-ink3">{children}</p>;
}

const FLAG_LABEL: Record<string, string> = {
  consumer_eft: "Consumer EFT",
  debit_cards: "Debit cards",
  prepaid_cards: "Prepaid cards",
  wires: "Wires",
  mortgage_origination: "Mortgage origination",
  flood_zone_lending: "Flood zone lending",
  consumer_deposits: "Consumer deposits",
  brokered_deposits: "Brokered deposits",
};
const FACTS_FOR: Record<string, string[]> = {
  "RC-2026-014": ["consumer_eft", "debit_cards", "prepaid_cards"],
  "RC-2026-011": ["consumer_deposits", "wires"],
  "RC-2026-016": ["mortgage_origination"],
  "RC-2026-013": ["consumer_deposits"],
  "RC-2026-018": ["prepaid_cards"],
  "RC-2026-019": ["flood_zone_lending", "mortgage_origination"],
  "RC-2026-009": ["brokered_deposits"],
  "RC-2026-012": ["wires"],
  "RC-2026-017": ["consumer_deposits"],
};

function AppliesBody({ change, revealed, runId }: { change: RuleChange; revealed: boolean; runId?: string }) {
  const r = runId ? getRun(runId) : undefined;
  const scope = r?.events.find((e) => e.type === "check" && e.gate === "RC-17");
  const facts = FACTS_FOR[change.id] ?? [];
  const answered = useStore((s) => s.facts);
  const before = change.id === "RC-2026-014" && !revealed;
  const result = before ? "Not checked yet" :
    change.state === "screened_out" ? "Doesn't apply" : change.state === "uncertain" && !answered.flood_zone_lending ? "Unsure: needs one bank fact" : "Applies to Northgate";
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="text-[18px] leading-[26px]">{result}</div>
        <p className="text-[14px] leading-[22px] text-ink2">
          {before ? "Madison checks scope as the first step of its run, against these bank facts." : scope && scope.type === "check" ? scope.reason : change.screen_reason ?? "Checked against the bank profile."}
        </p>
        {!before ? <CertaintyWord value={change.state === "uncertain" ? "Unsure" : "Clear"} /> : null}
        {scope && !before ? <AgentTag id="RC-17" /> : null}
      </div>
      <div>
        <MonoLabel>Bank facts used · profile {fmtDate(institution.profile_retrieved_at)}</MonoLabel>
        <ul className="mt-2 flex flex-col">
          {facts.map((f) => {
            const v = f === "flood_zone_lending" && answered.flood_zone_lending ? answered.flood_zone_lending.value === "Yes" : institution.product_flags[f];
            return (
              <li key={f} className="flex items-center justify-between border-b border-line py-2 text-[14px] last:border-b-0">
                <span>{FLAG_LABEL[f] ?? f}</span>
                <span className="t-data text-[12px] text-ink2">{v === null || v === undefined ? "no answer" : v ? "yes" : "no"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function DutiesBody({ change, revealed, runId }: { change: RuleChange; revealed: boolean; runId?: string }) {
  const all = dutiesFor(change.id);
  if (change.id === "RC-2026-014" && !revealed) return <NotYet>Not found yet. Run Madison on this rule and the obligations appear here, each with the exact sentence it came from.</NotYet>;
  if (!all.length) return <NotYet>No obligations yet.</NotYet>;
  const inScope = all.filter((d) => d.applicability === "in_scope");
  const excluded = all.filter((d) => d.applicability === "excluded");
  const r = runId ? getRun(runId) : undefined;
  const heldEv = r?.events.filter((e) => e.type === "check" && e.result === "block" && e.gate === "RC-04") ?? [];
  const held = heldEv.map((e) => {
    const it = r!.events.find((x) => x.type === "item" && x.id === (e.type === "check" ? e.item_ref : ""));
    return { id: e.type === "check" ? e.item_ref : "", label: it && it.type === "item" ? it.label : "", reason: e.type === "check" ? e.reason : "" };
  });
  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col">
        {inScope.map((d) => (
          <DutyLine key={d.id} d={d} />
        ))}
      </ul>
      {excluded.length ? (
        <div>
          <MonoLabel>Excluded · {excluded.length}</MonoLabel>
          <ul className="mt-2 flex flex-col">
            {excluded.map((d) => (
              <li key={d.id} className="flex items-start gap-4 border-b border-line py-3 last:border-b-0">
                <span className="t-data w-[96px] shrink-0 pt-0.5 text-[11.5px] text-ink3">{d.id}</span>
                <span className="flex-1 text-[14px] leading-[22px] text-ink2">
                  {d.plain} <span className="text-ink3">· {d.applicability_reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {held.length && revealed ? (
        <div>
          <MonoLabel>Held back by the reviewer · {held.length}</MonoLabel>
          <ul className="mt-2 flex flex-col">
            {held.map((h) => (
              <li key={h.id} className="flex items-start gap-4 border-b border-line py-3 last:border-b-0">
                <span className="t-data flex w-[96px] shrink-0 items-center gap-1.5 pt-0.5 text-[11.5px] text-ink3">
                  <Mark kind="cross" size={11} className="text-risk" />
                  {h.id}
                </span>
                <span className="flex-1 text-[14px] leading-[22px]">
                  {h.label}
                  <span className="mt-0.5 block text-[13px] leading-5 text-ink2">{h.reason}</span>
                </span>
                <AgentTag id="RC-04" short />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DutyLine({ d }: { d: Duty }) {
  const state = useCoverage(d);
  return (
    <li className="grid grid-cols-[96px_1fr_auto] items-start gap-4 border-b border-line py-3.5 last:border-b-0 max-md:grid-cols-1 max-md:gap-1">
      <Link href={`/obligations/${d.id}/`} className="t-data pt-0.5 text-[11.5px] text-ink2 hover:text-ink hover:underline">
        {d.id}
      </Link>
      <div className="min-w-0">
        <div className="text-[15px] leading-[23px]">{d.plain}</div>
        <div className="mt-1 text-[13px] leading-5 text-ink2">&ldquo;{d.source_text}&rdquo; <span className="t-data text-[11px] text-ink3">{d.citation}</span></div>
      </div>
      <div className="flex flex-col items-end gap-1.5 max-md:items-start">
        <CertaintyWord value={certaintyFrom(d.confidence)} quiet />
        <StatusChip state={state} size="sm" />
      </div>
    </li>
  );
}

function LinkedBody({ change, revealed }: { change: RuleChange; revealed: boolean }) {
  const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
  const decisions = useStore((s) => s.linkDecisions);
  const decideLink = useStore((s) => s.decideLink);
  const decide = useStore((s) => s.decide);
  const persona = useStore((s) => s.persona);
  if (change.id === "RC-2026-014" && !revealed) return <NotYet>Links appear after the obligations are accepted.</NotYet>;
  if (!ds.length) return <NotYet>Nothing to link yet.</NotYet>;
  return (
    <ul className="flex flex-col">
      {ds.map((d) => {
        const links = linksFor(d.id);
        return (
          <li key={d.id} className="border-b border-line py-4 last:border-b-0">
            <div className="flex items-baseline gap-3">
              <span className="t-data text-[11.5px] text-ink3">{d.id}</span>
              <span className="text-[15px]">{d.plain}</span>
            </div>
            {links.length === 0 ? <p className="mt-2 text-[13px] text-risk">No links. Nothing behind this obligation yet.</p> : null}
            <ul className="mt-2 flex flex-col gap-1.5">
              {links.map((l) => {
                const dec = decisions[l.id];
                const status: string = dec ?? l.status;
                const target = l.policy_section_id ? policyById(l.policy_section_id) : null;
                const ctl = l.control_id ? controlById(l.control_id) : null;
                return (
                  <li key={l.id} className="grid grid-cols-[150px_1fr_auto] items-start gap-4 text-[13px] leading-5 max-md:grid-cols-1 max-md:gap-1">
                    <span className="t-data text-[11.5px] text-ink">{target ? `${target.document_code} ${target.section_number}` : ctl?.id}</span>
                    <span className="text-ink2">
                      &ldquo;{l.quote}&rdquo;
                      <span className="ml-2 text-ink3">· {l.strength === "full" ? "full" : "partial"}</span>
                      {ctl && ctl.freshness_status === "quiet" ? <span className="ml-2 text-warn">· quiet {ctl.quiet_days} days</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      {status === "proposed" ? (
                        <>
                          <Button size={32} variant="quiet" onClick={() => {
                            decideLink(l.id, "rejected");
                            decide({ label: "Reject", text: `Rejected link ${d.id} to ${target ? target.document_code + " " + target.section_number : ctl?.id}`, by: persona, at: new Date().toISOString(), changeId: change.id });
                          }}>
                            Reject
                          </Button>
                          <Button size={32} variant="quiet" onClick={() => {
                            decideLink(l.id, "confirmed");
                            decide({ label: "Confirm", text: `Confirmed link ${d.id} to ${target ? target.document_code + " " + target.section_number : ctl?.id}`, by: persona, at: new Date().toISOString(), changeId: change.id });
                          }}>
                            Confirm
                          </Button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink2">
                          {status === "rejected" ? <Mark kind="cross" size={11} className="text-risk" /> : <Mark kind="check" size={11} className="text-ok" />}
                          {status === "rejected" ? "Rejected" : "Confirmed"}
                          {!dec && l.decided_by_user_id ? <span className="text-ink3">· {userById(l.decided_by_user_id)?.name.split(" ")[0]}, {fmtDate(l.decided_at)}</span> : null}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function CoveredBody({ change, revealed }: { change: RuleChange; revealed: boolean }) {
  const k = change.counts;
  if ((change.id === "RC-2026-014" && !revealed) || !k) return <NotYet>Counts appear once obligations are linked.</NotYet>;
  return (
    <div>
      <div className="grid grid-cols-4 border-y border-line max-md:grid-cols-2">
        {FOUR_STATES.map((s, i) => (
          <div key={s} className={cn("py-5", i && "border-l border-line pl-5", "max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(3)]:pl-0")}>
            <Count value={k[s as keyof typeof k] as number} state={s} size="medium" startValue={0} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-ink2">
        {k.covered + k.not_yet_confirmed + k.nothing_behind + k.known_gap} of {k.duties} obligations counted. The four counts always add up.
      </p>
    </div>
  );
}

function WhatsLeftBody({ change, revealed }: { change: RuleChange; revealed: boolean }) {
  if (change.id === "RC-2026-014" && !revealed) return <NotYet>Gaps, drift and tasks appear after the run.</NotYet>;
  const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
  const gaps = ds.filter((d) => d.coverage_state === "nothing_behind" && !(change.new_control && d.id === "D-208-M1"));
  const unconfirmed = ds.filter((d) => d.coverage_state === "not_yet_confirmed");
  const drift = driftFlags.filter((dr) => ds.some((d) => d.id === dr.obligation_id));
  const kg = knownGaps.filter((g) => ds.some((d) => d.id === g.obligation_id));
  const ts = tasks.filter((t) => t.change_id === change.id || (t.control_id && impactFor(change.id)?.controls.includes(t.control_id)));
  const tasksDone = useStore((s) => s.tasksDone);
  if (!gaps.length && !drift.length && !ts.length && !unconfirmed.length && !kg.length) return <NotYet>Nothing left.</NotYet>;
  return (
    <div className="flex flex-col gap-8">
      {gaps.length ? (
        <div>
          <MonoLabel>Gaps · nothing behind it · {gaps.length}</MonoLabel>
          <ul className="mt-2 flex flex-col">{gaps.map((d) => <DutyLine key={d.id} d={d} />)}</ul>
        </div>
      ) : null}
      {change.new_control ? (
        <div className="flex items-center gap-3 text-[14px]">
          <Mark kind="check" className="text-ok" /> {change.new_control} is in force: D-208-M1 has a control behind it.
        </div>
      ) : null}
      {drift.map((dr) => (
        <DriftPair key={dr.id} drift={dr} />
      ))}
      {unconfirmed.length ? (
        <div>
          <MonoLabel>Not yet confirmed · {unconfirmed.length}</MonoLabel>
          <ul className="mt-2 flex flex-col">{unconfirmed.map((d) => <DutyLine key={d.id} d={d} />)}</ul>
        </div>
      ) : null}
      {kg.map((g) => (
        <div key={g.id} className="rounded-[10px] bg-info-soft px-4 py-3">
          <div className="flex items-center gap-2 text-[14px] font-medium text-info">
            <Square size={6} color="var(--info)" /> Known gap {g.id} · expires {fmtDate(g.expiry)}
          </div>
          <p className="mt-1 text-[14px] leading-[22px]">{g.rationale}</p>
          <p className="mt-1 text-[12px] text-ink2">Accepted by {userById(g.accepted_by_user_id)?.name} on {fmtDate(g.accepted_at)}</p>
        </div>
      ))}
      {ts.length ? (
        <div>
          <MonoLabel>Tasks · {ts.length}</MonoLabel>
          <ul className="mt-2 flex flex-col">
            {ts.map((t) => (
              <li key={t.id} className="flex items-center gap-4 border-b border-line py-3 text-[14px] last:border-b-0">
                <span className="t-data w-[56px] shrink-0 text-[11.5px] text-ink3">{t.id}</span>
                <span className={cn("flex-1", tasksDone[t.id] && "text-ink3 line-through")}>{t.title}</span>
                <span className="text-[13px] text-ink2">{tasksDone[t.id] ? "Done" : `${fmtDate(t.due)} · ${relDays(t.due)}`}</span>
                <PersonTag id={t.assignee_id} showName={false} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function WhoHasThis({ change }: { change: RuleChange }) {
  const ds = dutiesFor(change.id);
  const waiting = Array.from(new Set(ds.filter((d) => d.coverage_state !== "covered" && d.applicability === "in_scope").map((d) => d.owner_id))).filter((u) => u !== change.owner_id);
  const closed = change.state === "closed";
  return (
    <div className="flex flex-col gap-3">
      <MonoLabel>Who has this</MonoLabel>
      <dl className="flex flex-col">
        {[
          { k: "Now", v: closed ? null : change.owner_id },
          { k: "Next", v: closed ? null : "u-anthony" },
          { k: "Waiting on", v: closed ? null : waiting[0] ?? null },
        ].map((row) => (
          <div key={row.k} className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0">
            <dt className="text-[13px] text-ink2">{row.k}</dt>
            <dd>{row.v ? <PersonTag id={row.v} /> : <span className="text-[13px] text-ink3">{closed ? "Closed" : "No one"}</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function useTouches(change: RuleChange) {
  return useMemo(() => {
    const imp = impactFor(change.id);
    const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
    if (imp) {
      return {
        duties: imp.duties,
        policies: imp.policy_sections,
        procedures: imp.procedure_sections,
        controls: imp.controls,
        quiet: imp.quiet_controls,
        vendors: vendorsFor(change.id),
      };
    }
    const links = ds.flatMap((d) => linksFor(d.id));
    const policies = Array.from(new Set(links.map((l) => l.policy_section_id).filter(Boolean))) as string[];
    const controls = Array.from(new Set(links.map((l) => l.control_id).filter(Boolean))) as string[];
    const procs = Array.from(new Set(driftFlags.filter((dr) => ds.some((d) => d.id === dr.obligation_id)).map((dr) => dr.procedure_section_id)));
    const tags = new Set(ds.flatMap((d) => d.process_tags));
    const vs = vendors
      .filter((v) => v.services.some((s) => tags.has(s.process_tag)) || controls.some((c) => controlById(c)?.runs_on_vendors.includes(v.id)))
      .map((v) => ({
        vendor: v,
        why: v.services.find((s) => tags.has(s.process_tag))
          ? `Does ${v.services.find((s) => tags.has(s.process_tag))!.name.toLowerCase()} (${v.services.find((s) => tags.has(s.process_tag))!.process_tag})`
          : `Runs ${controls.find((c) => controlById(c)?.runs_on_vendors.includes(v.id))}`,
      }));
    return { duties: ds.map((d) => d.id), policies, procedures: procs, controls, quiet: controls.filter((c) => controlById(c)?.freshness_status === "quiet"), vendors: vs };
  }, [change.id]);
}

function TouchSummary({ change, revealed }: { change: RuleChange; revealed: boolean }) {
  const t = useTouches(change);
  if (change.id === "RC-2026-014" && !revealed) return <p className="text-[14px] text-ink3">Madison walks everything the change touches as the last step of its run.</p>;
  return (
    <MetaList
      className="!normal-case"
      items={[
        `${t.duties.length} obligations`,
        `${t.policies.length} policy sections`,
        `${t.procedures.length} procedures`,
        `${t.controls.length} controls`,
        `${t.vendors.length} vendors`,
      ]}
    />
  );
}

function TouchesOver({ change, open, onOpenChange }: { change: RuleChange; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTouches(change);
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-8">
      <MonoLabel>{title}</MonoLabel>
      <ul className="mt-2 flex flex-col">{children}</ul>
    </section>
  );
  const Row = ({ id, text, badge, href }: { id: string; text: string; badge?: React.ReactNode; href?: string }) => (
    <li className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="t-data w-[120px] shrink-0 pt-0.5 text-[11px] text-ink2">{href ? <Link href={href} className="hover:underline">{id}</Link> : id}</span>
      <span className="flex-1 text-[14px] leading-[21px]">{text}</span>
      {badge}
    </li>
  );
  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title="What it touches" subtitle={`${change.citation} · ${change.id}`}>
      <Group title={`Vendors · ${t.vendors.length}`}>
        {t.vendors.map(({ vendor, why }) => (
          <li key={vendor.id} className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-medium">{vendor.name}</span>
              <span className="t-label">{vendor.criticality}</span>
            </div>
            <span className="text-[14px] leading-[21px] text-ink2">{why}</span>
            <span className="text-[12px] text-ink3">Relationship owner {userById(vendor.relationship_owner_id)?.name}</span>
          </li>
        ))}
      </Group>
      <Group title={`Obligations · ${t.duties.length}`}>
        {t.duties.map((id) => {
          const d = getDuty(id)!;
          return <Row key={id} id={id} href={`/obligations/${id}/`} text={d.plain} badge={<StatusChip state={d.coverage_state as CoverageState} size="sm" />} />;
        })}
      </Group>
      <Group title={`Policy sections · ${t.policies.length}`}>
        {t.policies.map((id) => {
          const p = policyById(id)!;
          return <Row key={id} id={`${p.document_code} ${p.section_number}`} text={p.heading} badge={p.drift ? <QuietBadge text="drift" tone="risk" /> : null} />;
        })}
      </Group>
      <Group title={`Procedures · ${t.procedures.length}`}>
        {t.procedures.map((id) => {
          const p = procedureById(id)!;
          return <Row key={id} id={`${p.document_code} ${p.section_number.toLowerCase()}`} text={p.heading} />;
        })}
      </Group>
      <Group title={`Controls · ${t.controls.length}`}>
        {t.controls.map((id) => {
          const c = controlById(id)!;
          return <Row key={id} id={id} text={c.name} badge={t.quiet.includes(id) ? <QuietBadge text={`quiet ${c.quiet_days} days`} tone="warn" /> : <QuietBadge text={c.freshness_status} tone="ok" />} />;
        })}
      </Group>
      <p className="text-[12px] text-ink3">Walked by the impact assessor, from process tags and the controls that run on vendor systems.</p>
    </SlideOver>
  );
}

function QuietBadge({ text, tone }: { text: string; tone: "ok" | "warn" | "risk" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-ink2">
      <Square size={5} color={`var(--${tone})`} />
      {text}
    </span>
  );
}

