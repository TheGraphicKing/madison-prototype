"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { getChange, getDuty, handoffById, userById } from "@/data";
import type { PersonEvent, Run } from "@/data/types";
import { useRunPlayer } from "@/lib/player/use-run-player";
import { personEvents, type RunState } from "@/lib/player/derive";
import { onPersonResponse } from "@/lib/player/results";
import type { Mode, Speed } from "@/lib/player/engine";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate } from "@/lib/dates";
import { respondHandoff, handoffStatus } from "@/lib/work";
import { stepResult, stepTitle } from "@/lib/run-steps";
import { Segmented } from "@/components/core/tabs";
import { Button, ButtonLink } from "@/components/core/button";
import { Mark } from "@/components/core/mark";
import { Typed } from "@/components/core/typed";
import { PersonaSwitch } from "@/components/shell/persona-switch";
import { ColorButton } from "@/components/shell/color-button";
import { DecisionPanel, type Evidence } from "@/components/decision/decision-panel";
import { StepVisual } from "./step-visual";
import { AgentView } from "./agent-view";
import { StepDetail } from "./step-detail";
import { Quoted } from "./quoted";
import { ruleSections } from "@/data";

const DISCLAIMER = "Replay of a recorded run. Live runs take several minutes.";

/** Answers recorded through handoffs count as answers at the matching run checkpoint. */
function handoffResponses(run: Run) {
  if (run.id !== "run-design-mfa") return {};
  const s = useStore.getState();
  const out: Record<string, string> = {};
  for (const { e, i } of personEvents(run)) {
    const h = e.waiting_for === "u-priya" ? handoffById("H-117") : e.waiting_for === "u-anthony" ? handoffById("H-116") : undefined;
    if (h && handoffStatus(h, s) === "done") out[String(i)] = e.actions[0].id;
  }
  return out;
}

export function RunView({ runId, mode, from, step, view: initialView = "agent" }: { runId: string; mode: Mode; from: string; step?: string | null; view?: "simple" | "agent" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [view, setViewState] = useState<"simple" | "agent">(initialView);
  const setView = (v: "simple" | "agent") => {
    setViewState(v);
    const q = new URLSearchParams(sp.toString());
    q.set("view", v);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };
  const finished = useStore((s) => s.finishedRuns[runId]);
  const handoffState = useStore((s) => s.handoffs);
  const persona = useStore((s) => s.persona);
  const decide = useStore((s) => s.decide);
  const { run, state, instance, controls } = useRunPlayer(runId, { key: runId });
  const started = useRef(false);
  const [selected, setSelected] = useState<string | null>(step ?? null);
  const [reviewAll, setReviewAll] = useState(false);
  const isLive = mode === "live" && !finished;

  // LIVE plays from the start. REPLAY opens finished (or at the checkpoint it is waiting at), so
  // nothing disappears; Replay plays it again from the start.
  useEffect(() => {
    if (started.current || !run) return;
    started.current = true;
    if (isLive) {
      if (!(instance?.mode === "live" && (instance.t > 0 || instance.playing))) controls.restart({ mode: "live", playing: true, speed: instance?.speed ?? 1, responses: handoffResponses(run) });
      return;
    }
    const prior = { ...(finished?.responses ?? {}), ...handoffResponses(run) };
    const recorded = Boolean(finished) || run.id === "run-design-mfa";
    controls.restart({ mode: "replay", playing: false, responses: prior, completed: true, t: recorded ? run.duration_ms : 0, speed: instance?.speed ?? 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // the MFA checkpoints move when Priya and Anthony answer their handoffs, wherever they answer
  useEffect(() => {
    if (!run || run.id !== "run-design-mfa" || !instance) return;
    const want = handoffResponses(run);
    for (const [k, a] of Object.entries(want)) if (!instance.responses[k]) controls.respond(k, a, persona, demoNowIso());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState, instance?.responses, run]);

  // keyboard: Space plays or pauses, the arrow keys step, Home restarts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || document.querySelector("[role=dialog]")) return;
      if (e.key === " ") {
        e.preventDefault();
        controls.toggle();
      } else if (e.key === "ArrowRight") controls.stepNext();
      else if (e.key === "ArrowLeft") controls.stepBack();
      else if (e.key === "Home") controls.seek(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls]);

  if (!run || !state) return null;
  const change = getChange(run.change_id);
  const running = run.stages.find((s) => state.stages[s.key].state === "running" || state.stages[s.key].state === "waiting_person");
  const shown = selected ?? running?.key ?? (state.done ? run.stages[run.stages.length - 1].key : run.stages[0].key);
  const playing = Boolean(instance?.playing);

  const respond = (eventKey: string, actionId: string, label: string) => {
    const at = demoNowIso();
    controls.respond(eventKey, actionId, persona, at);
    decide({ label, text: decisionText(run.id, actionId, label, change?.citation ?? ""), by: persona, at, runId: run.id, changeId: run.change_id });
    onPersonResponse(run.id, actionId);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-ground/95 px-8 max-md:static max-md:px-5">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={from} className="flex shrink-0 items-center gap-1.5 text-[13px] text-ink2 hover:text-ink">
              <Mark kind="chevron-left" size={12} /> {from.startsWith("/rules/") ? "Change room" : from.startsWith("/record") ? "The record" : from.startsWith("/tasks") ? "My tasks" : "Back"}
            </Link>
            <h1 className="min-w-0 truncate text-[19px] leading-7 font-medium tracking-[-0.01em]">
              <span className="t-data mr-2 text-[13px] text-ink2">{change?.citation}</span>How Madison worked
            </h1>
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-surface2 px-2.5 text-[12px] font-medium">
              <span className={cn("block size-[6px] rounded-full", isLive && playing ? "breathe bg-ok" : "bg-ink3")} />
              {isLive ? "Live" : "Replay"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<"simple" | "agent"> label="View" size={28} value={view} onChange={setView} options={[{ value: "simple", label: "Simple" }, { value: "agent", label: "Agent" }]} />
            <span className="mx-1 h-5 w-px bg-line max-md:hidden" />
            {!state.done || playing ? (
              <Button variant="quiet" size={32} onClick={controls.toggle} aria-keyshortcuts="Space" className="w-[72px]">
                {playing ? "Pause" : "Play"}
              </Button>
            ) : null}
            <Segmented<string> className="max-md:hidden" label="Speed" size={28} value={String(instance?.speed ?? 1)} onChange={(v) => controls.setSpeed(Number(v) as Speed)} options={["1", "2", "4"].map((v) => ({ value: v, label: `${v}×` }))} />
            <Button variant="text" size={32} onClick={() => controls.restart({ mode: instance?.mode ?? "replay", playing: true, responses: { ...(finished?.responses ?? {}), ...handoffResponses(run) } })}>
              Replay
            </Button>
            <span className="mx-1 h-5 w-px bg-line max-md:hidden" />
            <PersonaSwitch />
            <ColorButton />
          </div>
        </div>
      </header>

      {view === "agent" ? (
        <AgentView
          run={run}
          st={state}
          playing={playing}
          selected={selected}
          onSelect={setSelected}
          checkpoint={state.pending ? <Checkpoint run={run} st={state} pending={state.pending} reviewAll={reviewAll} onReview={() => setReviewAll(true)} onRespond={respond} /> : null}
        />
      ) : (
      <>
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-[minmax(0,6fr)_minmax(0,4fr)] gap-8 px-8 pt-8 pb-6 max-lg:grid-cols-1 max-md:px-5">
        <section aria-label="The flow" className="min-w-0">
          {state.done ? <DoneSummary run={run} /> : null}
          <h2 className="mb-1 text-[22px] leading-8 font-medium tracking-[-0.01em]">{run.title}</h2>
          <p className="mb-5 text-[13.5px] text-ink2">
            Run on {fmtDate("2026-10-16")}, started by {userById(run.trigger.by)?.name}. Click any step to see what it read and found.
          </p>
          <ol className="relative flex flex-col">
            {run.stages.map((s, i) => (
              <StepRow
                key={s.key}
                run={run}
                st={state}
                stageKey={s.key}
                index={i}
                last={i === run.stages.length - 1}
                selected={shown === s.key}
                onSelect={() => setSelected(s.key === selected ? null : s.key)}
                clockRunning={playing && !state.pending}
              />
            ))}
          </ol>
        </section>

        <aside aria-label="The detail" className="min-w-0 lg:sticky lg:top-[88px] lg:self-start">
          <AnimatePresence mode="wait">
            <motion.div key={state.pending ? `p-${state.pending.key}` : shown} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {state.pending && (selected === null || selected === state.pending.stage) ? (
                <Checkpoint run={run} st={state} pending={state.pending} reviewAll={reviewAll} onReview={() => setReviewAll(true)} onRespond={respond} />
              ) : (
                <div className="rounded-[14px] border border-line bg-surface p-6 shadow-(--shadow-rest)">
                  <StepDetail run={run} stageKey={shown} st={state} onClose={selected ? () => setSelected(null) : undefined} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
      </main>

      <footer className="px-8 pb-6 text-[12px] text-ink3 max-md:px-5">{DISCLAIMER}</footer>
      </>
      )}
    </div>
  );
}

function StepRow({
  run,
  st,
  stageKey,
  index,
  last,
  selected,
  onSelect,
  clockRunning,
}: {
  run: Run;
  st: RunState;
  stageKey: string;
  index: number;
  last: boolean;
  selected: boolean;
  onSelect: () => void;
  clockRunning: boolean;
}) {
  const stage = run.stages.find((s) => s.key === stageKey)!;
  const s = st.stages[stageKey];
  const running = s.state === "running";
  const waitingPerson = s.state === "waiting_person";
  const done = s.state === "done";
  const isPerson = stage.kind === "person";
  const result = stepResult(run, stageKey, st, isPerson && done ? userById(st.responded.find((r) => r.event.stage === stageKey)?.event.waiting_for ?? "")?.name : undefined);
  const sinceDone = s.doneAt !== undefined ? st.t - s.doneAt : 0;
  const open = running || waitingPerson || selected;
  return (
    <li id={`step-${stageKey}`} className="relative pl-12">
      {!last ? <span aria-hidden className={cn("absolute top-9 bottom-0 left-[17px] w-px", done ? "bg-ink/40" : "bg-line")} /> : null}
      <StatusMark state={s.state} person={isPerson} className="absolute top-[13px] left-[6px]" />
      <button
        onClick={onSelect}
        aria-expanded={open}
        className={cn("group w-full rounded-[12px] px-4 py-3 text-left transition-colors", selected ? "bg-surface shadow-[inset_0_0_0_1px_var(--line)]" : "hover:bg-surface2", (running || waitingPerson) && !selected && "bg-surface shadow-[inset_0_0_0_1px_var(--line)]")}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className={cn("text-[15.5px] leading-6 font-medium", s.state === "waiting" ? "text-ink3" : "text-ink")}>
            {stepTitle(run, stageKey)}
            {waitingPerson ? <WaitingBadge personId={stage.agents[0].replace("person:", "")} /> : null}
          </span>
          <span className="t-data shrink-0 text-[11px] text-ink3">{String(index + 1).padStart(2, "0")}</span>
        </div>
        {result && !waitingPerson ? (
          <div className="mt-0.5 text-[13.5px] leading-[21px] text-ink2">
            {done ? <Typed key={`${stageKey}-done`} text={result} elapsed={clockRunning ? sinceDone : undefined} cps={80} caret="while" /> : result}
          </div>
        ) : null}
        {open ? (
          <div className="mt-3 flex flex-col gap-3">
            <StepVisual run={run} stageKey={stageKey} st={st} />
            {running ? <LiveStrip st={st} /> : null}
          </div>
        ) : null}
      </button>
    </li>
  );
}

function WaitingBadge({ personId }: { personId: string }) {
  const persona = useStore((s) => s.persona);
  return (
    <span className="ml-2 rounded-full bg-highlight px-2 py-0.5 text-[11.5px] font-medium text-highlight-ink">
      {persona === personId ? "Waiting for you" : `Waiting for ${userById(personId)?.name}`}
    </span>
  );
}

/** Hollow (waiting), a ring with a soft pulse (running), filled with a tick (done), a person mark (waiting for you). */
function StatusMark({ state, person, className }: { state: string; person: boolean; className?: string }) {
  if (state === "done")
    return (
      <span className={cn("grid size-[22px] place-items-center rounded-full bg-ink text-surface", className)} aria-label="Done">
        <Mark kind="check" size={12} strokeWidth={1.6} />
      </span>
    );
  if (state === "waiting_person" || (person && state !== "waiting"))
    return (
      <span className={cn("relative grid size-[22px] place-items-center rounded-full bg-highlight text-highlight-ink ring-wait", className)} aria-label="Waiting for a person">
        <span className="block size-[8px] rounded-full bg-highlight-ink" />
      </span>
    );
  if (state === "running")
    return (
      <span className={cn("relative grid size-[22px] place-items-center", className)} aria-label="Running">
        <span className="absolute inset-0 rounded-full ring-[1.5px] ring-ink" />
        <span className="breathe absolute inset-[5px] rounded-full bg-ink" />
      </span>
    );
  return <span className={cn("block size-[22px] rounded-full bg-ground shadow-[inset_0_0_0_1.5px_var(--lineStrong)]", className)} aria-label="Waiting" />;
}

/** The running step's live strip: a few moving dots and the current sentence. */
function LiveStrip({ st }: { st: RunState }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-surface2 px-3 py-2">
      <span className="relative block h-2 w-12 overflow-hidden" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="live-dot absolute top-0 block size-2 rounded-full bg-ink" style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
      </span>
      <span className="min-w-0 truncate text-[13px] text-ink" aria-live="polite">
        {st.narration?.text}
      </span>
    </div>
  );
}

function DoneSummary({ run }: { run: Run }) {
  const answered = useStore((s) => s.handoffs["H-118"]);
  const text =
    run.id === "run-rule-1005"
      ? "Done. 6 obligations accepted, 1 excluded. 4 covered, 1 not yet confirmed, 1 nothing behind it. One gap to fix."
      : run.id === "run-coverage-1026"
        ? answered
          ? "Done. The policy is linked, and the procedure drift is with Grace Liu."
          : "Done. The policy is linked."
        : "Done. CTL-153 is in force. Three vendors and Assurance have their handoffs.";
  const action =
    run.id === "run-rule-1005"
      ? { label: "Open what's left", href: `/rules/${run.change_id}/#card-whats_left` }
      : { label: "Open the change room", href: `/rules/${run.change_id}/` };
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-ok-soft px-5 py-4">
      <p className="min-w-0 flex-1 text-[15px] leading-6 text-ink">{text}</p>
      <ButtonLink href={action.href} variant="primary" size={40}>
        {action.label}
      </ButtonLink>
    </div>
  );
}

const NEXT: Record<string, string> = {
  accept_all: "Madison matches the 6 obligations to policies and controls, then Anthony Marsh accepts the impact.",
  review: "Every obligation opens with the rule's own words, so you can read them before you accept.",
  link_and_raise: "The policy is linked, and Grace Liu gets a task to change procedure step 2 to 3 business days.",
  link_only: "The policy is linked. The procedure keeps saying 5 business days until someone raises it.",
};

function Checkpoint({
  run,
  st,
  pending,
  reviewAll,
  onReview,
  onRespond,
}: {
  run: Run;
  st: RunState;
  pending: PersonEvent & { key: string };
  reviewAll: boolean;
  onReview: () => void;
  onRespond: (eventKey: string, actionId: string, label: string) => void;
}) {
  const persona = useStore((s) => s.persona);
  const [fields, setFields] = useState<Record<string, string>>({});
  const evidence: Evidence[] = useMemo(() => {
    if (run.id === "run-rule-1005") {
      const ev: Evidence[] = (pending.items ?? []).map((id) => {
        const d = getDuty(id)!;
        const sec = d.rule_section_id ? ruleSections.find((x) => x.id === d.rule_section_id) : undefined;
        return {
          key: id,
          label: d.plain,
          summary: d.applicability === "excluded" ? `Excluded: ${d.applicability_reason}` : `${d.citation} · certainty ${d.confidence === "high" ? "Clear" : "Likely"}`,
          body: sec ? <Quoted text={sec.after} quote={d.source_text} /> : <>&ldquo;{d.source_text}&rdquo;</>,
        };
      });
      const held = st.checks.find((c) => c.gate === "RC-04" && c.result === "block");
      if (held) ev.push({ key: "held", label: "Held back by the double-check (1)", summary: held.reason });
      return ev;
    }
    if (run.id === "run-coverage-1026")
      return [
        { key: "rule", label: "Rule 12 CFR 1026.19(e)(4)(i)", summary: "Within three business days of a changed circumstance" },
        { key: "pol", label: "Policy POL-MTG-02 3.1", summary: "A revised estimate within 3 business days: matches the rule" },
        { key: "prc", label: "Procedure PRC-MTG-03 step 2", summary: "Within 5 business days: later than the rule" },
      ];
    const h = pending.waiting_for === "u-priya" ? handoffById("H-117")! : handoffById("H-116")!;
    return h.provided.map((p, i) => ({ key: String(i), label: p.label, summary: p.text }));
  }, [run, pending, st.checks]);

  if (run.id === "run-design-mfa") {
    const h = pending.waiting_for === "u-priya" ? handoffById("H-117")! : handoffById("H-116")!;
    const choice = h.needed.find((n) => n.kind === "choice")!;
    const reasonField = h.needed.find((n) => n.kind === "text");
    const ready = Boolean(fields[choice.id]);
    return (
      <DecisionPanel
        deciding={h.ask}
        why={h.why}
        deadline={fmtDate(h.due)}
        evidence={evidence}
        decider={h.to_user_id}
        next={h.id === "H-117" ? "Anthony Marsh signs off CTL-153" : "Nadia Brennan sends 3 vendor reviews; Ravi Sethuraman plans a retest"}
        options={h.options.map((o, i) => ({
          id: o.id,
          label: o.label,
          primary: i === 0,
          next: h.id === "H-117" ? "D6 is decided, and CTL-153 goes to the CCO." : o.id === "approve" ? "CTL-153 goes into force; the handoffs start." : "CTL-153 goes back to Elena Petrova with your reason.",
          disabled: h.id === "H-116" ? (o.id === "approve" ? fields[choice.id] !== "Approve" : fields[choice.id] !== "Send back with a reason") : !ready,
        }))}
        form={
          <div className="flex flex-col gap-3">
            <div className="text-[13.5px] font-medium">{choice.label}</div>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {choice.choices!.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={fields[choice.id] === c}
                  disabled={persona !== h.to_user_id}
                  onClick={() => setFields((f) => ({ ...f, [choice.id]: c }))}
                  className={cn("rounded-full px-3.5 py-2 text-left text-[13.5px] leading-5", fields[choice.id] === c ? "bg-ink text-surface" : "bg-surface2 hover:bg-surface3", "disabled:opacity-60")}
                >
                  {c}
                </button>
              ))}
            </div>
            {reasonField ? (
              <label className="block">
                <span className="mb-1 block text-[13px] text-ink2">{reasonField.label}</span>
                <textarea rows={2} value={fields[reasonField.id] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [reasonField.id]: e.target.value }))} className="w-full rounded-[10px] bg-surface px-3 py-2 text-[14px] shadow-[inset_0_0_0_1px_var(--lineStrong)] outline-none" />
              </label>
            ) : null}
          </div>
        }
        onChoose={(id) => respondHandoff(h.id, id, fields, persona)}
      />
    );
  }

  const isRule = run.id === "run-rule-1005";
  return (
    <DecisionPanel
      deciding={isRule ? "Accept 6 obligations and exclude 1 (prepaid)" : "Link the policy, and raise the procedure drift?"}
      why={
        isRule ? (
          <>
            These are what 12 CFR 1005.11(c) asks of Northgate from 4 Jan 2027. Accepted obligations are matched to policies and controls and counted in coverage. <span className="text-ink2">{pending.prompt}</span>
          </>
        ) : (
          "The policy matches the rule (3 business days), but the procedure staff follow says 5. A borrower could get a late revised Loan Estimate."
        )
      }
      deadline={isRule ? "4 Jan 2027" : "1 Mar 2027"}
      affected={isRule ? "Card and ACH dispute customers" : "Mortgage applicants with a changed circumstance"}
      evidence={evidence}
      expandAll={reviewAll}
      decider={pending.waiting_for}
      next={isRule ? "Madison matches to policies and controls; Anthony Marsh accepts the impact" : "Grace Liu, if you raise the drift"}
      options={pending.actions.map((a, i) => ({ id: a.id, label: a.id === "accept_all" ? "Accept 6 obligations and exclude 1" : a.label, primary: i === 0, next: NEXT[a.id] ?? "" }))}
      onChoose={(id) => {
        if (id === "review") return onReview();
        const a = pending.actions.find((x) => x.id === id)!;
        onRespond(pending.key, id, a.id === "accept_all" ? "Accept 6 obligations and exclude 1" : a.label);
      }}
    />
  );
}

export function decisionText(runId: string, actionId: string, label: string, citation: string) {
  if (runId === "run-rule-1005" && actionId === "accept_all") return `Accepted 6 obligations and excluded 1 (prepaid) for ${citation}`;
  if (runId === "run-coverage-1026" && actionId === "link_and_raise") return "Linked POL-MTG-02 3.1 to D-1026-L2 and raised drift DR-029 to Grace Liu";
  if (runId === "run-coverage-1026" && actionId === "link_only") return "Linked POL-MTG-02 3.1 to D-1026-L2";
  return `${label} (${citation})`;
}

