"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Task } from "@/data/types";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { agentById, areaForChange, auditTrail, datesFor, driftFlags, position, regulations, ruleChanges, userById } from "@/data";
import { useChanges } from "@/lib/use-change";
import { FourDates } from "@/components/core/dates4";
import type { Plot } from "@/lib/coverage-field";
import { useStore } from "@/lib/store";
import { daysFrom, fmtDate, fmtTime, relDays } from "@/lib/dates";
import { useWaitingOn } from "@/lib/work";
import { taskHref, useNav } from "@/lib/nav";
import { useTaskCounts, useCoverageTotals } from "@/lib/counts";
import { Page, Section } from "@/components/layout/page";
import { Count } from "@/components/core/labels";
import { FOUR_STATES, STATE_LABEL } from "@/components/core/status";
import { useSceneSupport } from "@/components/scene/support";
import { LensLegend, LensSwitch } from "@/components/coverage/lens-switch";
import { useLiveField } from "@/lib/coverage-field";
import type { Lens } from "@/lib/lens";
import { appliesVerdict, AppliesChip } from "@/components/change/battle-cards";
import { NoticeRow, TaskRow, WaitingList, bucket } from "@/components/tasks/tasks";

const CoverageField = dynamic(() => import("@/components/coverage/field3d").then((m) => m.CoverageField), { ssr: false, loading: () => <div className="h-full w-full" /> });

const TODAY = "2026-10-16";

function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Today() {
  const persona = useStore((s) => s.persona);
  const openTask = useStore((s) => s.openTask);
  const router = useRouter();
  const highlight = useNav((s) => s.highlight);
  // a task opens the exact place it refers to: its change room with "Your task now", the board pack, or its drawer
  const openTarget = (t: Task) => {
    useNav.getState().setHighlight(null);
    const href = taskHref(t);
    if (href) router.push(href);
    else openTask(t.id);
  };
  const notices = useStore((s) => s.notices).filter((n) => n.to === persona && !n.read);
  const record = useStore((s) => s.record);
  const fact = useStore((s) => s.facts.flood_zone_lending);
  const [hello, setHello] = useState("Good morning");
  useEffect(() => setHello(greetingWord()), []);
  const me = userById(persona)!;
  const waiting = useWaitingOn(persona);
  const counts = useTaskCounts(persona);
  const needs = counts.actionable;
  const next = [...needs].sort((a, b) => a.task.due.localeCompare(b.task.due))[0];
  const firstOpen = needs[0]?.task.id;

  return (
    <Page>
      <header>
        <p className="text-[14px] text-ink2">
          {fmtDate(TODAY)} · {me.role}
        </p>
        <h1 className="t-display mt-2">
          {hello}, {me.name.split(" ")[0]}
        </h1>
        <SinceYouLooked />
      </header>

      {/* three tiles: the one bold thing is Needs you */}
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <Tile href="#needs-you" label="Needs you" value={counts.needsYou} sub={next ? `Next due: ${next.task.title}, ${relDays(next.task.due)}` : "Nothing due"} bold />
        <Tile href="/tasks/" label="Due this week" value={counts.dueThisWeek} sub={`${counts.overdue} overdue`} />
        <Tile href="/tasks/?filter=waiting" label="Waiting on others" value={counts.waitingOnOthers} sub={waiting[0] ? `Longest: ${waiting[0].who}` : "No one"} />
      </div>

      <Section id="needs-you" className="mt-12">
        <SectionTitle title="Needs you" count={counts.needsYou} action={{ href: "/tasks/", label: "All my tasks" }} />
        {notices.length ? (
          <ul className="mb-3 flex flex-col gap-2">
            {notices.map((n) => (
              <NoticeRow key={n.id} n={n} />
            ))}
          </ul>
        ) : null}
        <ul className="flex flex-col overflow-clip rounded-[14px] border border-line bg-surface">
          {needs.slice(0, 5).map((v) => (
            <TaskRow key={v.task.id} v={v} primary={v.task.id === firstOpen} highlight={v.task.id === highlight} onOpen={() => openTarget(v.task)} />
          ))}
          {needs.length === 0 ? <li className="px-5 py-5 text-[14px] text-ink3">Nothing needs you right now.</li> : null}
        </ul>
      </Section>

      <Section className="mt-12">
        <SectionTitle title="Waiting on others" count={counts.waitingOnOthers} action={{ href: "/tasks/?filter=waiting", label: "See all" }} />
        <WaitingList items={waiting} limit={4} />
      </Section>

      <Section className="mt-12">
        <SectionTitle title="Where Northgate stands" action={{ href: "/coverage/", label: "Explore coverage" }} />
        <Standing />
      </Section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Section className="mt-0">
          <ChangesList fact={fact?.value} />
        </Section>
        <Section className="mt-0">
          <SectionTitle title="Madison overnight" action={{ href: "/record/", label: "The record" }} />
          <Overnight live={record.slice(0, 3).map((r) => ({ at: r.at, who: r.who, what: r.what }))} />
        </Section>
      </div>
    </Page>
  );
}

function SectionTitle({ title, count, action }: { title: string; count?: number; action?: { href: string; label: string } }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="t-section">
        {title}
        {count !== undefined ? <span className="t-data ml-2 text-[12px] text-ink3">{count}</span> : null}
      </h2>
      {action ? (
        <Link href={action.href} className="text-[14px] underline underline-offset-4">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function Tile({ href, label, value, sub, bold }: { href: string; label: string; value: number; sub: string; bold?: boolean }) {
  return (
    <Link href={href} className={cn("block rounded-[14px] px-5 py-4 transition-colors", bold ? "bg-accent-soft hover:brightness-[0.98]" : "border border-line bg-surface hover:bg-surface2")}>
      <div className="text-[13.5px] font-medium text-ink2">{label}</div>
      <div className="mt-1 text-[34px] leading-[40px] font-medium tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-1 text-[13px] leading-5 text-ink2">{sub}</div>
    </Link>
  );
}

/** The four counts with this month's change and a small trend, beside a compact 3D field. */
function Standing() {
  const pos = position();
  const tot = useCoverageTotals();
  const router = useRouter();
  const support = useSceneSupport();
  const [hover, setHover] = useState<Plot | null>(null);
  const [lens, setLens] = useState<Lens>("state");
  const { plots } = useLiveField();
  const h = pos.history;
  const last = h[h.length - 1];
  const prev = h[h.length - 2];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-2 overflow-clip rounded-[14px] border border-line bg-surface">
        {FOUR_STATES.map((s, i) => {
          const key = s as "covered" | "not_yet_confirmed" | "nothing_behind" | "known_gap";
          const delta = last[key] - prev[key];
          const good = key === "covered" ? delta >= 0 : delta <= 0;
          return (
            <Link key={s} href={`/coverage/?view=field&state=${s}`} className={cn("flex flex-col gap-2 px-5 py-4 hover:bg-surface2", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line")}>
              <Count value={tot[key]} state={s} size="medium" animate={false} />
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <span className={cn("text-[12.5px] font-medium", delta === 0 ? "text-ink3" : good ? "text-ok" : "text-risk")}>
                  {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
                  {Math.abs(delta)} this month
                </span>
                <Spark values={h.map((x) => x[key])} label={`${STATE_LABEL[s]}, last 12 months`} color={`var(--viz${key === "covered" ? "Ok" : key === "not_yet_confirmed" ? "Warn" : key === "nothing_behind" ? "Risk" : "Info"})`} />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="flex flex-col gap-2" data-demo="D5-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LensSwitch lens={lens} onChange={setLens} size={28} />
        <LensLegend lens={lens} plots={plots} className="text-[11.5px]" />
      </div>
      <div className="relative h-[260px] overflow-hidden rounded-[14px] border border-line">
        {support === "3d" ? (
          <CoverageField mini lens={lens} selected={null} onSelectPlot={(i) => i !== null && router.push(`/coverage/?view=field&plot=${plots[i].regulationId}${lens !== "state" ? `&lens=${lens}` : ""}`)} onHoverPlot={setHover} />
        ) : (
          <Link href="/coverage/" className="grid h-full place-items-center bg-surface text-[14px] text-ink2 underline underline-offset-4">
            Open the coverage map
          </Link>
        )}
        <div className="pointer-events-none absolute top-3 left-3 rounded-[10px] bg-surface/95 px-3 py-2 text-[12.5px] shadow-[0_0_0_1px_var(--line)]">
          {hover ? (
            <>
              <div className="font-medium">
                {hover.short} · {hover.citation}
              </div>
              <div className="text-ink2">
                {hover.counts.covered} covered · {hover.counts.not_yet_confirmed} not yet confirmed · {hover.counts.nothing_behind} nothing behind it · {hover.counts.known_gap} known gaps
              </div>
            </>
          ) : (
            <span className="text-ink2">{regulations.length} regulations · hover a plot, click to open Coverage</span>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/** A 12-point trend, 40 px tall, scaled to its own range so small changes still show. */
function Spark({ values, color, label }: { values: number[]; color: string; label: string }) {
  const w = 96;
  const ht = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${ht - 4 - ((v - min) / span) * (ht - 8)}`).join(" ");
  const lastY = ht - 4 - ((values[values.length - 1] - min) / span) * (ht - 8);
  return (
    <svg width={w} height={ht} role="img" aria-label={`${label}: from ${values[0]} to ${values[values.length - 1]}`} className="shrink-0 overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

function Overnight({ live }: { live: { at: string; who: string; what: string }[] }) {
  const [open, setOpen] = useState(false);
  const night = useMemo(() => auditTrail.filter((a) => a.at >= "2026-10-14"), []);
  const drift = driftFlags.filter((d) => d.status !== "resolved").length;
  const held = auditTrail.filter((a) => /held back/i.test(a.what)).length;
  const changed = ruleChanges.filter((c) => c.state !== "closed").length;
  const items = [...live, ...night].slice(0, 6);
  return (
    <div className="rounded-[14px] border border-line bg-surface px-5 py-4">
      <p className="text-[14.5px] leading-[22px]">
        Read {regulations.length} regulations · {changed} with changes open · {drift} drift found · {held} obligation held back
      </p>
      <span className="mt-2 flex flex-wrap gap-4">
        <Link href="/record/?view=list&day=2026-10-16" className="text-[13px] font-medium text-ink2 underline underline-offset-4 hover:text-ink">
          What happened
        </Link>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-[13px] text-ink3 hover:text-ink">
          {open ? "Hide the list" : "Show it here"}
        </button>
      </span>
      {open ? (
        <ul className="mt-3 flex flex-col border-t border-line">
          {items.map((a, i) => (
            <li key={i} className="flex gap-3 border-b border-line py-2.5 text-[13.5px] leading-5 last:border-b-0">
              <span className="t-data w-[86px] shrink-0 text-[11.5px] text-ink3">
                {fmtDate(a.at.slice(0, 10))} {fmtTime(a.at)}
              </span>
              <span className="min-w-0">
                {a.what}
                <span className="block text-[12px] text-ink3">{a.who.startsWith("u-") ? userById(a.who)?.name : (agentById(a.who)?.name ?? "Madison")}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Changes published in the last 7 days; when there are none, every open change by its deadline. */
function ChangesList({ fact }: { fact?: string }) {
  const changes = useChanges(ruleChanges);
  const recent = changes.filter((c) => daysFrom(c.published_at) >= -7 && daysFrom(c.published_at) <= 0);
  const list = (recent.length ? recent : changes.filter((c) => c.state !== "closed" && c.state !== "screened_out"))
    .slice()
    .sort((a, b) => (datesFor(a.id)?.northgate_deadline ?? "9").localeCompare(datesFor(b.id)?.northgate_deadline ?? "9"))
    .slice(0, 5);
  return (
    <>
      <SectionTitle title={recent.length ? "What changed this week" : "Open rule changes"} action={{ href: "/rules/", label: "All rule changes" }} />
      <ul className="flex flex-col overflow-clip rounded-[14px] border border-line bg-surface">
        {list.map((c) => {
          const area = areaForChange(c.id);
          return (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <Link href={`/rules/${c.id}/`} data-demo={c.id === "RC-2026-014" ? "D1-1" : undefined} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] leading-[21px] font-medium">{c.title}</span>
                  <span className="block text-[12.5px] text-ink2">
                    <span className="t-data text-[11.5px]">{c.citation}</span>
                    {area ? ` · ${area.name} · ${userById(area.owner_id)?.name}` : ""}
                  </span>
                </span>
                <FourDates changeId={c.id} compact className="shrink-0 text-right max-sm:hidden" />
                <AppliesChip verdict={appliesVerdict(c, fact)} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** One line under the greeting: what changed in this demo since the person last looked. */
function SinceYouLooked() {
  const finished = useStore((s) => s.finishedRuns);
  const handoffs = useStore((s) => s.handoffs);
  const done = useStore((s) => s.tasksDone);
  const facts = useStore((s) => s.facts);
  const parts: string[] = [];
  if (finished["run-rule-1005"]) parts.push("6 obligations accepted", "1 gap found");
  if (handoffs["H-118"]?.status === "done") parts.push("1 procedure updated");
  if (handoffs["H-117"]?.status === "done") parts.push("1 design question answered");
  if (handoffs["H-116"]?.status === "done") parts.push("CTL-153 in force");
  if (facts.flood_zone_lending) parts.push(`flood lending fact answered (${facts.flood_zone_lending.value})`);
  if (done["T-280"]) parts.push("board pack approved");
  return (
    <p className="mt-2 text-[14px] text-ink2">
      <span className="text-ink3">Since you last looked · </span>
      {parts.length ? parts.join(" · ") : "Madison read 22 regulations overnight; nothing else has changed"}
    </p>
  );
}
