"use client";

// One selector per count. Today, the rail badge, My tasks and Coverage all read these,
// so a number shown in two places is always the same number.
import { useMemo } from "react";
import { daysFrom, businessDaysFrom } from "./dates";
import { useStore } from "./store";
import { useTaskViews, useWaitingOn, type TaskView } from "./work";
import { useLiveField } from "./coverage-field";

export interface TaskCounts {
  /** every task of mine that is not done: the rail badge and the "Mine" filter */
  open: number;
  /** open or overdue tasks I can act on now, plus unread responses: the Today "Needs you" tile */
  needsYou: number;
  actionable: TaskView[];
  dueThisWeek: number;
  overdue: number;
  blocked: number;
  done: number;
  /** what others owe me: handoffs I sent and work I handed out */
  waitingOnOthers: number;
  responses: number;
}

export function useTaskCounts(persona: string): TaskCounts {
  const views = useTaskViews();
  const waiting = useWaitingOn(persona);
  const notices = useStore((s) => s.notices);
  return useMemo(() => {
    const mine = views.filter((v) => v.task.assignee_id === persona);
    const open = mine.filter((v) => v.state !== "done");
    const actionable = open
      .filter((v) => v.state === "open" || v.state === "overdue")
      .sort((a, b) => a.task.priority - b.task.priority || a.task.due.localeCompare(b.task.due));
    const responses = notices.filter((n) => n.to === persona && !n.read).length;
    return {
      open: open.length,
      needsYou: actionable.length + responses,
      actionable,
      dueThisWeek: open.filter((v) => daysFrom(v.task.due) < 0 || businessDaysFrom(v.task.due) <= 5).length,
      overdue: open.filter((v) => v.state === "overdue" || daysFrom(v.task.due) < 0).length,
      blocked: mine.filter((v) => v.state === "blocked").length,
      done: mine.filter((v) => v.state === "done").length,
      waitingOnOthers: waiting.length,
      responses,
    };
  }, [views, waiting, notices, persona]);
}

/** The four bank-wide counts: the sum of the live field, so they always match what the field shows. */
export function useCoverageTotals() {
  const { plots } = useLiveField();
  return useMemo(() => {
    const t = { covered: 0, not_yet_confirmed: 0, nothing_behind: 0, known_gap: 0 };
    for (const p of plots) for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += p.counts[k];
    return { ...t, total: t.covered + t.not_yet_confirmed + t.nothing_behind + t.known_gap };
  }, [plots]);
}
