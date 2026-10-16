"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getChange, tasks as allTasks, userById } from "@/data";
import { useStore, type Notice } from "@/lib/store";
import { daysFrom, fmtDate, relDays, businessDaysFrom } from "@/lib/dates";
import { useTaskViews, useWaitingOn, type TaskView } from "@/lib/work";
import { kindOf } from "@/lib/task-spec";
import { Page, Section } from "@/components/layout/page";
import { Segmented } from "@/components/core/tabs";
import { Button } from "@/components/core/button";
import { Initials } from "@/components/core/tags";
import { TaskGlyph, GlyphFollowUp } from "@/components/glyphs";
import { StateChip } from "./task-drawer";

type Filter = "mine" | "waiting" | "blocked" | "done";
const GROUPS = ["Overdue", "Today", "This week", "Later"] as const;

export function bucket(v: TaskView): (typeof GROUPS)[number] {
  const d = daysFrom(v.task.due);
  if (v.state === "overdue" || d < 0) return "Overdue";
  if (d === 0) return "Today";
  if (businessDaysFrom(v.task.due) <= 5) return "This week";
  return "Later";
}

export function actionLabel(v: TaskView) {
  if (v.state === "blocked") return "View";
  if (v.state === "waiting_on_other") return "Follow up";
  switch (v.task.kind) {
    case "decide":
      return "Decide";
    case "sign_off":
      return "Sign off";
    case "answer":
      return "Answer";
    case "upload_evidence":
      return "Upload";
    case "fix":
      return "Fix";
    case "vendor_review":
      return "Review vendors";
    case "approve_report":
      return "Approve";
    case "control_run":
      return "Record";
    case "test_plan":
      return "Plan";
    default:
      return "Review";
  }
}

export function Tasks() {
  const persona = useStore((s) => s.persona);
  const openTask = useStore((s) => s.openTask);
  const notices = useStore((s) => s.notices).filter((n) => n.to === persona && !n.read);
  const sp = useSearchParams();
  const views = useTaskViews();
  const waiting = useWaitingOn(persona);
  const [filter, setFilter] = useState<Filter>("mine");

  useEffect(() => {
    const o = sp.get("open");
    if (o) openTask(o);
  }, [sp, openTask]);

  const mine = views.filter((v) => v.task.assignee_id === persona);
  const list = useMemo(() => {
    if (filter === "done") return mine.filter((v) => v.state === "done");
    if (filter === "blocked") return mine.filter((v) => v.state === "blocked");
    if (filter === "waiting") return mine.filter((v) => v.state === "waiting_on_other");
    return mine.filter((v) => v.state !== "done");
  }, [mine, filter]);
  const firstOpen = mine.filter((v) => v.state === "open" || v.state === "overdue").sort((a, b) => a.task.priority - b.task.priority || a.task.due.localeCompare(b.task.due))[0]?.task.id;

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">My tasks</h1>
          <p className="mt-2 text-ink2">
            {mine.filter((v) => v.state !== "done").length} open for {userById(persona)?.name}. Each one opens with what you&apos;ve been given and what you need to provide.
          </p>
        </div>
        <Segmented<Filter>
          label="Filter tasks"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "mine", label: "Mine", count: mine.filter((v) => v.state !== "done").length },
            { value: "waiting", label: "Waiting on others", count: mine.filter((v) => v.state === "waiting_on_other").length + waiting.length },
            { value: "blocked", label: "Blocked", count: mine.filter((v) => v.state === "blocked").length },
            { value: "done", label: "Done", count: mine.filter((v) => v.state === "done").length },
          ]}
        />
      </header>

      {notices.length && filter === "mine" ? (
        <Section className="mt-8">
          <h2 className="t-section mb-3">Responses</h2>
          <ul className="flex flex-col gap-2">
            {notices.map((n) => (
              <NoticeRow key={n.id} n={n} />
            ))}
          </ul>
        </Section>
      ) : null}

      {filter === "waiting" ? (
        <Section className="mt-8">
          <h2 className="t-section mb-3">You are waiting on</h2>
          <WaitingList items={waiting} />
        </Section>
      ) : null}

      {(filter === "mine" ? GROUPS : (["All"] as const)).map((g) => {
        const rows = (g === "All" ? list : list.filter((v) => bucket(v) === g)).sort((a, b) => a.task.due.localeCompare(b.task.due));
        if (g !== "All" && g !== "Overdue" && g !== "This week" && rows.length === 0) return null;
        const loud = g === "Overdue" && rows.length > 0;
        return (
          <Section key={g} className="mt-10">
            <div className={cn("mb-3 flex items-baseline gap-3", loud && "text-risk")}>
              <h2 className="t-section">{g === "All" ? (filter === "done" ? "Done" : filter === "blocked" ? "Blocked" : "Yours, waiting on others") : g}</h2>
              <span className="t-data text-[12px]">{rows.length}</span>
            </div>
            <ul className={cn("flex flex-col overflow-clip rounded-[14px] border bg-surface", loud ? "border-risk/40" : "border-line")}>
              {rows.map((v) => (
                <TaskRow key={v.task.id} v={v} primary={v.task.id === firstOpen} onOpen={() => openTask(v.task.id)} />
              ))}
              {rows.length === 0 ? <li className="px-5 py-5 text-[14px] text-ink3">{g === "Overdue" ? "Nothing overdue." : "Nothing here."}</li> : null}
            </ul>
          </Section>
        );
      })}
    </Page>
  );
}

export function TaskRow({ v, primary, onOpen, compact }: { v: TaskView; primary?: boolean; onOpen: () => void; compact?: boolean }) {
  const t = v.task;
  const c = t.change_id ? getChange(t.change_id) : undefined;
  const from = v.from ? userById(v.from)?.name : "Madison";
  const overdue = v.state === "overdue";
  return (
    <li className="group border-b border-line last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
        className={cn("grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_150px_auto] items-center gap-4 px-5 py-3.5 hover:bg-surface2 max-lg:grid-cols-[auto_minmax(0,1fr)]", compact && "py-3")}
      >
        <TaskGlyph kind={kindOf(t)} />
        <div className="min-w-0">
          <div className={cn("text-[15px] leading-[22px] font-medium", v.state === "done" && "text-ink3 line-through")}>{t.title}</div>
          <div className="mt-0.5 text-[13px] leading-5 text-ink2">
            {v.waitsOn ? <span className="text-warn">{v.waitsOn}</span> : t.why}
            <span className="text-ink3"> · from {from}</span>
            {c ? (
              <>
                <span className="text-ink3"> · </span>
                <Link href={`/rules/${c.id}/`} onClick={(e) => e.stopPropagation()} className="t-data text-[11.5px] text-ink3 hover:text-ink hover:underline">
                  {c.citation}
                </Link>
              </>
            ) : null}
          </div>
        </div>
        <div className="text-right text-[13px] max-lg:col-start-2 max-lg:text-left">
          <span className={overdue ? "text-risk" : "text-ink"}>{overdue ? `Was due ${fmtDate(t.due)}` : fmtDate(t.due)}</span>
          <span className="block text-[12px] text-ink3">{relDays(t.due)}</span>
        </div>
        <div className="flex items-center justify-end gap-3 max-lg:col-start-2 max-lg:justify-start">
          <StateChip state={v.state} />
          <Button
            variant={primary ? "primary" : "quiet"}
            size={32}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            {actionLabel(v)}
          </Button>
        </div>
      </div>
    </li>
  );
}

export function NoticeRow({ n }: { n: Notice }) {
  const readNotice = useStore((s) => s.readNotice);
  const u = userById(n.from);
  return (
    <li className="flex items-center gap-4 rounded-[12px] bg-accent-soft px-4 py-3">
      <Initials initials={u?.initials ?? "?"} size={30} />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">{n.title}</div>
        <div className="text-[13px] text-ink2">{n.why}</div>
      </div>
      {n.href ? (
        <Link href={n.href} onClick={() => readNotice(n.id)} className="inline-flex h-8 items-center rounded-[10px] bg-surface px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2">
          Open
        </Link>
      ) : null}
      <button onClick={() => readNotice(n.id)} className="text-[13px] text-ink3 hover:text-ink">
        Done
      </button>
    </li>
  );
}

export function WaitingList({ items, limit }: { items: ReturnType<typeof useWaitingOn>; limit?: number }) {
  const toast = useStore((s) => s.toast);
  const openTask = useStore((s) => s.openTask);
  if (!items.length) return <p className="rounded-[14px] border border-line bg-surface px-5 py-5 text-[14px] text-ink3">You are not waiting on anyone.</p>;
  return (
    <ul className="flex flex-col overflow-clip rounded-[14px] border border-line bg-surface">
      {items.slice(0, limit).map((w) => {
        const u = w.whoId ? userById(w.whoId) : undefined;
        const t = w.handoffId ? allTasks.find((x) => x.handoff_id === w.handoffId) : undefined;
        return (
          <li key={w.key} className="flex items-center gap-4 border-b border-line px-5 py-3 last:border-b-0">
            {u ? (
              <Initials initials={u.initials} size={30} />
            ) : (
              <span className="inline-grid size-[30px] place-items-center rounded-full bg-surface2 text-ink2">
                <GlyphFollowUp size={16} />
              </span>
            )}
            <button className="min-w-0 flex-1 text-left" onClick={() => t && openTask(t.id)} disabled={!t}>
              <div className="text-[14.5px] font-medium">Waiting on {w.who}</div>
              <div className="truncate text-[13px] text-ink2">
                {w.what} · since {fmtDate(w.since)}
                {w.blocked ? " · waiting on an earlier answer" : ""}
              </div>
            </button>
            <span className="shrink-0 text-right text-[13px] text-ink2 max-sm:hidden">due {fmtDate(w.due)}</span>
            <Button variant="quiet" size={32} onClick={() => toast(`Reminder sent to ${w.who}`)}>
              Nudge
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
