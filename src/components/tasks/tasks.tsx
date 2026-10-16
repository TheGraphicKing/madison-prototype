"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/data/types";
import { controlById, dutiesFor, getChange, getDuty, knownGaps, ruleChanges, tasks, tasksFor, userById } from "@/data";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate, relDays } from "@/lib/dates";
import { ACTION_LABEL, ACTION_RUN, dueBucket, taskHref } from "@/lib/tasks";
import { usePlayback } from "@/lib/player/engine";
import { Page, Section } from "@/components/layout/page";

import { Button, ButtonLink } from "@/components/core/button";
import { PersonTag } from "@/components/core/tags";
import { Mark, Square } from "@/components/core/mark";
import { CertaintyWord, certaintyFrom } from "@/components/core/status";
import { RunStrip } from "@/components/canvas/strip";

const GROUPS = ["Overdue", "This week", "Later"] as const;

export function Tasks() {
  const persona = useStore((s) => s.persona);
  const done = useStore((s) => s.tasksDone);
  const sp = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const o = sp.get("open");
    if (o) setOpen(o);
  }, [sp]);

  const mine = tasksFor(persona);
  const myChanges = new Set(ruleChanges.filter((c) => c.owner_id === persona).map((c) => c.id));
  // overdue work by others on my changes, so nothing slips
  const others = tasks.filter(
    (t) => t.assignee_id !== persona && !mine.includes(t) && dueBucket(t) === "Overdue" && (t.control_id ? ["CTL-132"].includes(t.control_id) && myChanges.has("RC-2026-014") : t.change_id && myChanges.has(t.change_id)),
  );
  const extraOpen = open && !mine.some((t) => t.id === open) && !others.some((t) => t.id === open) ? tasks.find((t) => t.id === open) : undefined;
  const all = [...mine, ...others, ...(extraOpen ? [extraOpen] : [])];
  const openCount = all.filter((t) => !done[t.id]).length;
  // one primary action per view: the first open task that is mine
  const firstOpen = [...mine].filter((t) => !done[t.id]).sort((a, b) => a.priority - b.priority || a.due.localeCompare(b.due))[0]?.id;

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">My tasks</h1>
          <p className="mt-2 text-ink2">
            {openCount} open for {userById(persona)?.name}. Each one has a single next step.
          </p>
        </div>
      </header>

      {GROUPS.map((g) => {
        const list = all.filter((t) => dueBucket(t) === g).sort((a, b) => a.due.localeCompare(b.due));
        const overdue = g === "Overdue";
        return (
          <Section key={g} className={overdue ? "mt-10" : undefined}>
            <div className={cn("mb-3 flex items-baseline gap-3", overdue && list.length && "text-risk")}>
              <h2 className="t-section">{g}</h2>
              <span className="t-data text-[12px]">{list.filter((t) => !done[t.id]).length}</span>
            </div>
            {overdue && list.length ? <div className="h-[2px] bg-risk" aria-hidden /> : <div className="h-px bg-line" aria-hidden />}
            <ul>
              {list.map((t) => (
                <TaskRow
                  key={t.id}
                  t={t}
                  open={open === t.id}
                  onToggle={() => setOpen(open === t.id ? null : t.id)}
                  mineTask={t.assignee_id === persona || mine.includes(t)}
                  primary={t.id === firstOpen}
                />
              ))}
              {list.length === 0 ? <li className="border-b border-line py-5 text-[14px] text-ink3">{overdue ? "Nothing overdue." : "Nothing here."}</li> : null}
            </ul>
          </Section>
        );
      })}
    </Page>
  );
}

function TaskRow({ t, open, onToggle, mineTask, primary }: { t: Task; open: boolean; onToggle: () => void; mineTask: boolean; primary: boolean }) {
  const done = useStore((s) => s.tasksDone[t.id]);
  const c = t.change_id ? getChange(t.change_id) : undefined;
  const runId = ACTION_RUN[t.action];
  const inst = usePlayback((s) => (runId ? s.instances[runId] : undefined));
  const ensure = usePlayback((s) => s.ensure);
  const restart = usePlayback((s) => s.restart);
  const finished = useStore((s) => (runId ? Boolean(s.finishedRuns[runId]) : false));
  const [started, setStarted] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const showStrip = runId && (started || (inst && inst.mode === "live" && !inst.completed && inst.t > 0));

  const start = () => {
    if (!runId) return;
    ensure(runId, runId);
    restart(runId, { mode: "live", playing: true });
    setStarted(true);
  };

  useEffect(() => {
    if (open) rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open]);

  const overdue = dueBucket(t) === "Overdue";
  const label = !mineTask ? `Remind ${userById(t.assignee_id)?.name}` : runId ? "Start" : ACTION_LABEL[t.action];

  return (
    <li ref={rowRef} className={cn("border-b border-line", open && "bg-surface")}>
      <div className="grid grid-cols-[minmax(0,1fr)_170px_190px_210px] items-center gap-6 py-4 pl-1 max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {done ? <Mark kind="check" size={13} className="shrink-0 text-ok" /> : <Square size={6} filled={false} color={overdue ? "var(--risk)" : "var(--ink)"} />}
            <span className={cn("text-[16px] leading-6 font-medium", done && "text-ink3 line-through")}>{t.title}</span>
          </div>
          <p className="mt-0.5 pl-[16px] text-[14px] leading-[21px] text-ink2">{t.why}</p>
          {!mineTask ? (
            <div className="mt-1.5 pl-[16px]">
              <PersonTag id={t.assignee_id} showRole />
            </div>
          ) : null}
        </div>
        <div className="text-[14px] max-lg:col-start-1 max-lg:row-start-2 max-lg:pl-[16px]">
          <span className={overdue && !done ? "text-risk" : ""}>{done ? "Done" : overdue ? `Overdue · deadline ${relDays(t.due)}` : relDays(t.due)}</span>
          <span className="block text-[12px] text-ink3">{fmtDate(t.due)}</span>
        </div>
        <span className="t-data truncate text-[11.5px] text-ink2 max-lg:hidden">
          {c ? (
            <Link href={`/rules/${c.id}/`} className="hover:underline">
              {c.citation}
            </Link>
          ) : (
            t.control_id
          )}
        </span>
        <div className="flex justify-end max-lg:col-start-2 max-lg:row-start-1">
          {done ? (
            <span className="text-[13px] text-ink3">{finished ? "Run finished" : "Done"}</span>
          ) : runId && mineTask ? (
            showStrip ? (
              <ButtonLink href={`/runs/${runId}/?mode=live&from=/tasks/`} variant="quiet" size={32}>
                Open full view
              </ButtonLink>
            ) : (
              <Button variant={primary ? "primary" : "quiet"} size={32} onClick={start}>
                {label}
              </Button>
            )
          ) : (
            <Button variant={primary ? "primary" : "quiet"} size={32} onClick={onToggle} aria-expanded={open}>
              {open ? "Close" : label}
            </Button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {showStrip && !done ? (
          <motion.div key="strip" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-5 pl-[17px]">
              <RunStrip runId={runId!} instanceKey={runId} href={`/runs/${runId}/?mode=live&from=/tasks/`} />
            </div>
          </motion.div>
        ) : null}
        {open && !done && !(runId && mineTask) ? (
          <motion.div key="flow" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} className="overflow-hidden">
            <div className="pb-6 pl-[17px]">
              <TaskFlow t={t} mineTask={mineTask} onDone={onToggle} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/** The flows that do not need an agent run, inline in the row. */
function TaskFlow({ t, mineTask, onDone }: { t: Task; mineTask: boolean; onDone: () => void }) {
  const persona = useStore((s) => s.persona);
  const decide = useStore((s) => s.decide);
  const completeTask = useStore((s) => s.completeTask);
  const overrideChange = useStore((s) => s.overrideChange);
  const answerFact = useStore((s) => s.answerFact);
  const toast = useStore((s) => s.toast);
  const [file, setFile] = useState<string | null>(null);
  const finish = (label: string, text: string, extra?: () => void) => {
    const at = demoNowIso();
    decide({ label, text, by: persona, at, changeId: t.change_id });
    completeTask(t.id, persona, at);
    extra?.();
    toast(text);
    onDone();
  };

  if (!mineTask) {
    const u = userById(t.assignee_id);
    const label = `Remind ${u?.name}`;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2px] bg-surface2 px-4 py-3">
        <span className="text-[14px] text-ink2">
          {u?.name} owns this. A reminder goes to them with the task and its due date. Nothing else changes.
        </span>
        <Button variant="quiet" size={32} onClick={() => {
          decide({ label, text: `Reminded ${u?.name}: ${t.title}`, by: persona, at: demoNowIso(), changeId: t.change_id });
          toast(`Reminded ${u?.name}: ${t.title}`);
          onDone();
        }}>
          {label}
        </Button>
      </div>
    );
  }

  if (t.action === "review_duties" && t.change_id) {
    const ds = dutiesFor(t.change_id);
    const label = `Accept ${ds.length} duties`;
    return (
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col">
          {ds.map((d) => (
            <li key={d.id} className="grid grid-cols-[96px_1fr_auto] gap-4 border-b border-line py-3 last:border-b-0">
              <span className="t-data pt-0.5 text-[11.5px] text-ink3">{d.id}</span>
              <span>
                <span className="block text-[15px]">{d.plain}</span>
                <span className="mt-0.5 block text-[13px] text-ink2">&ldquo;{d.source_text}&rdquo;</span>
              </span>
              <CertaintyWord value={certaintyFrom(d.confidence)} quiet />
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <Button variant="primary" size={40} onClick={() => finish(label, `Accepted ${ds.length} duties for ${getChange(t.change_id!)?.citation}`, () => overrideChange(t.change_id!, { state: "linked", step: "linked" }))}>
            {label}
          </Button>
          <ButtonLink href={`/rules/${t.change_id}/?step=duties`} variant="text" size={40}>
            Open the change room
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (t.action === "answer_fact") {
    const answer = (v: "Yes" | "No") =>
      finish(`Answer: ${v}`, `Answered flood zone lending: ${v.toLowerCase()} for 12 CFR 339.3`, () => {
        answerFact("flood_zone_lending", v, persona, demoNowIso());
        overrideChange("RC-2026-019", v === "Yes" ? { state: "applies", step: "duties" } : { state: "screened_out" });
      });
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px]">Does Northgate lend in special flood hazard areas?</p>
        <p className="text-[13px] text-ink2">The bank profile has no answer. Scope for 12 CFR 339.3 depends on it.</p>
        <div className="flex gap-3">
          <Button variant="primary" size={40} onClick={() => answer("Yes")}>
            Yes, we do
          </Button>
          <Button variant="quiet" size={40} onClick={() => answer("No")}>
            No, we don&apos;t
          </Button>
        </div>
      </div>
    );
  }

  if (t.action === "upload_evidence" && t.control_id) {
    const ctl = controlById(t.control_id)!;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-ink2">
          {ctl.id} {ctl.name} is a {ctl.cadence} control. Last evidence {fmtDate(ctl.last_artifact_date)}, {ctl.quiet_days} days ago.
        </p>
        <label className="flex cursor-pointer flex-col items-start gap-1 rounded-[2px] px-5 py-6 outline-1 outline-line-strong outline-dashed hover:bg-surface2">
          <span className="text-[14px] font-medium">{file ? file : "Choose a file to attach as evidence"}</span>
          <span className="text-[12px] text-ink3">It stays in this browser. The prototype records the file name only.</span>
          <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
        </label>
        <div>
          <Button variant="primary" size={40} disabled={!file} onClick={() => finish("Upload evidence", `Attached ${file} as evidence for ${ctl.id}`)}>
            Upload evidence
          </Button>
        </div>
      </div>
    );
  }

  if (t.action === "sign_off") {
    const g = knownGaps.find((k) => getDuty(k.obligation_id)?.change_id === t.change_id) ?? knownGaps[0];
    const d = getDuty(g.obligation_id);
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[2px] bg-info-soft px-4 py-3">
          <div className="text-[14px] font-medium text-info">Known gap {g.id} · expires {fmtDate(g.expiry)}</div>
          <p className="mt-1 text-[14px] leading-[22px]">{g.rationale}</p>
          <p className="mt-1 text-[12px] text-ink2">{d?.plain}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size={40} onClick={() => finish("Renew the known gap", `Renewed known gap ${g.id} for one quarter`)}>
            Renew the known gap
          </Button>
          <Button variant="quiet" size={40} onClick={() => finish("Close the known gap", `Closed known gap ${g.id}`)}>
            Close the known gap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ButtonLink href={taskHref(t)} variant="quiet" size={32}>
      Open
    </ButtonLink>
  );
}

