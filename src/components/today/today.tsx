"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { auditTrail, getChange, position, tasksFor, userById } from "@/data";
import type { Task } from "@/data/types";
import { useStore } from "@/lib/store";
import { daysFrom, fmtDate, fmtStamp, fmtTime, monthShort, relDays } from "@/lib/dates";
import { ACTION_LABEL, dueBucket, gapLine, nextDeadline, taskHref, taskShortName } from "@/lib/tasks";
import { Page, Section } from "@/components/layout/page";
import { SectionHead } from "@/components/core/panel";
import { Count, MonoLabel } from "@/components/core/labels";
import { FOUR_STATES } from "@/components/core/status";
import { StepChart } from "@/components/core/charts";
import { ButtonLink } from "@/components/core/button";
import { AgentTag, PersonTag } from "@/components/core/tags";
import { Square } from "@/components/core/mark";
import { RunCard, RunStrip } from "@/components/canvas/strip";
import { AnimatedList } from "@/components/ui/animated-list";

function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Today() {
  const persona = useStore((s) => s.persona);
  const done = useStore((s) => s.tasksDone);
  const record = useStore((s) => s.record);
  const finished = useStore((s) => s.finishedRuns);
  const decisions = useStore((s) => s.decisions);
  const [hello, setHello] = useState("Good morning");
  useEffect(() => setHello(greetingWord()), []);
  const me = userById(persona)!;
  const first = me.name.split(" ")[0];

  // Anthony's sign-off on the Reg E impact appears once the run has produced it
  const extra: Task[] =
    persona === "u-anthony" && finished["run-rule-1005"] && !decisions.some((d) => d.label === "Sign off the impact")
      ? [{ id: "T-IMPACT", title: "Sign off the impact of 12 CFR 1005.11(c)", why: "6 duties, 3 vendors and one gap. Produced by Madison's run today.", change_id: "RC-2026-014", assignee_id: "u-anthony", due: "2026-10-23", state: "open", action: "sign_off", priority: 0 }]
      : [];
  const mine = [...extra, ...tasksFor(persona)].filter((t) => !done[t.id]);
  const thisWeek = mine.filter((t) => dueBucket(t) !== "Later");
  const next = nextDeadline(done);
  const gap = gapLine();
  const signOffs = mine.filter((t) => t.action === "sign_off");

  const facts: { text: string; href: string }[] = [];
  if (persona === "u-anthony" && signOffs.length) facts.push({ text: `${signOffs.length} sign-off${signOffs.length > 1 ? "s" : ""} need${signOffs.length > 1 ? "" : "s"} you`, href: taskHref(signOffs[0]) });
  else facts.push({ text: `${thisWeek.length} task${thisWeek.length === 1 ? "" : "s"} need${thisWeek.length === 1 ? "s" : ""} you this week`, href: "/tasks/" });
  if (next) facts.push({ text: `Next deadline: ${taskShortName(next)}, ${relDays(next.due)}`, href: taskHref(next) });
  if (gap) facts.push({ text: gap.text, href: `/duties/${gap.gap.obligation_id}/` });

  const pos = position();
  const feed = useMemo(
    () => [
      ...record.slice(0, 6).map((r) => ({ key: r.id, at: r.at, who: r.who, kind: r.kind, what: r.what, live: true })),
      ...auditTrail.map((a, i) => ({ key: `a${i}`, at: a.at, who: a.who, kind: a.kind, what: a.what, live: false })),
    ],
    [record],
  );

  return (
    <Page>
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MonoLabel>{fmtDate("2026-10-16")} · {me.role}</MonoLabel>
          <h1 className="t-display mt-3 max-md:min-h-[88px]">
            {hello}, {first}
          </h1>
        </div>
        <ul className="flex flex-col gap-1.5 self-end lg:col-span-5">
          {facts.map((f) => (
            <li key={f.text}>
              <Link href={f.href} className="group flex items-center gap-3 text-[15px] leading-6 text-ink">
                <Square size={5} color="var(--ink3)" />
                <span className="underline decoration-line-strong decoration-1 underline-offset-4 group-hover:decoration-ink">{f.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Section className="mt-10 md:hidden">
        <RunStrip runId="run-rule-1005" instanceKey="card:run-rule-1005" href="/rules/RC-2026-014/" init={{ mode: "replay", loop: true, autoRespond: true, speed: 2, playing: true }} />
      </Section>
      <Section className="mt-10 max-md:hidden">
        <RunCard runId="run-rule-1005" href={finished["run-rule-1005"] ? "/runs/run-rule-1005/?mode=replay&from=/" : "/rules/RC-2026-014/"} label="Live on 12 CFR 1005.11(c)" />
      </Section>

      <Section>
        <SectionHead
          title={persona === "u-anthony" ? "Needs your sign-off" : "Needs you"}
          subtitle={`${mine.length} open · ranked by priority and due date`}
          actions={
            <Link href="/tasks/" className="text-[14px] underline underline-offset-4">
              All my tasks
            </Link>
          }
        />
        <ol className="border-t border-line">
          {(persona === "u-anthony" ? [...signOffs, ...mine.filter((t) => t.action !== "sign_off")] : mine).slice(0, 5).map((t, i) => (
            <NeedsRow key={t.id} t={t} rank={i + 1} primary={i === 0} />
          ))}
          {mine.length === 0 ? <li className="py-6 text-ink3">Nothing needs you right now.</li> : null}
        </ol>
      </Section>

      <Section>
        <SectionHead title="Where Northgate stands" subtitle={`${pos.total_applicable.toLocaleString("en-US")} applicable duties · as of ${fmtDate(pos.as_of)}`} actions={<Link href="/coverage/" className="text-[14px] underline underline-offset-4">Open coverage</Link>} />
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="grid grid-cols-2 content-start border-t border-line lg:col-span-5">
            {FOUR_STATES.map((s, i) => (
              <Link
                key={s}
                href={`/coverage/?view=map&state=${s}`}
                className={cn("border-b border-line py-6 hover:bg-surface", i % 2 === 1 && "border-l pl-6")}
              >
                <Count value={pos[s as "covered"]} state={s} />
              </Link>
            ))}
          </div>
          <div className="lg:col-span-7">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-medium">Covered duties, last 12 months</span>
              <span className="t-data text-[11.5px] text-ink2">
                {pos.history[0].covered.toLocaleString("en-US")} to {pos.history[pos.history.length - 1].covered.toLocaleString("en-US")}
              </span>
            </div>
            <StepChart
              ariaLabel="Covered duties over the last 12 months"
              points={pos.history.map((h) => ({ x: monthShort(h.month), y: h.covered }))}
              yMin={1350}
              yMax={1750}
              height={240}
              formatY={(v) => v.toLocaleString("en-US")}
            />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHead title="Madison overnight" subtitle="Agent work and decisions, newest first" actions={<Link href="/record/" className="text-[14px] underline underline-offset-4">Open the record</Link>} />
        <AnimatedList delay={420} className="border-t border-line">
          {[...feed].reverse().map((f) => (
            <FeedRow key={f.key} at={f.at} who={f.who} kind={f.kind} what={f.what} live={f.live} />
          ))}
        </AnimatedList>
      </Section>
    </Page>
  );
}

function NeedsRow({ t, rank, primary }: { t: Task; rank: number; primary: boolean }) {
  const c = t.change_id ? getChange(t.change_id) : undefined;
  const d = daysFrom(t.due);
  const overdue = t.state === "overdue" || d < 0;
  return (
    <li className="group relative grid grid-cols-[28px_minmax(0,1fr)_150px_170px_auto] items-center gap-6 border-b border-line py-4 max-lg:grid-cols-[28px_minmax(0,1fr)] max-lg:gap-y-2">
      <span className="t-data text-[11px] text-ink3">{String(rank).padStart(2, "0")}</span>
      <div className="min-w-0">
        <Link href={taskHref(t)} className="text-[16px] leading-6 font-medium hover:underline hover:underline-offset-4">
          {t.title}
        </Link>
        <p className="mt-0.5 text-[14px] leading-[21px] text-ink2">{t.why}</p>
      </div>
      <div className="text-[14px] max-lg:col-start-2 max-lg:row-start-2">
        <span className={overdue ? "text-risk" : "text-ink"}>{overdue && d > 0 ? "Overdue, " : ""}{relDays(t.due)}</span>
        <span className="block text-[12px] text-ink3">{fmtDate(t.due)}</span>
      </div>
      <span className="t-data truncate text-[11.5px] text-ink2 max-lg:hidden">{c?.citation ?? t.control_id ?? ""}</span>
      <ButtonLink href={taskHref(t)} variant={primary ? "primary" : "quiet"} size={32} className="max-lg:col-start-2 max-lg:justify-self-start">
        {t.action === "run_rule" ? "Open the change room" : ACTION_LABEL[t.action]}
      </ButtonLink>
    </li>
  );
}

export function FeedRow({ at, who, kind, what, live }: { at: string; who: string; kind: "agent" | "person"; what: string; live?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[160px_220px_minmax(0,1fr)] items-baseline gap-6 border-b border-line py-3.5 max-md:grid-cols-1 max-md:gap-1", live && "bg-surface")}>
      <span className="t-data text-[11.5px] text-ink3">
        {live ? <span className="mr-2 inline-block size-[6px] bg-highlight shadow-[0_0_0_1px_var(--ink)]" /> : null}
        {live ? `Today ${fmtTime(at)}` : fmtStamp(at).replace(", ", " · ")}
      </span>
      <span className="min-w-0">{kind === "agent" ? <AgentTag id={who} /> : <PersonTag id={who} />}</span>
      <span className="text-[14px] leading-[21px] text-ink">{what}</span>
    </div>
  );
}
