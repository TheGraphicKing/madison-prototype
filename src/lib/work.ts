"use client";

// Tasks and handoffs as everyone sees them: the seed data with the demo's actions applied.
// One source of truth, so a response shows on Today, My tasks, the change room and the record at once.
import { useMemo } from "react";
import { getChange, handoffById, handoffs, tasks, userById, vendors } from "@/data";
import type { Handoff, Task } from "@/data/types";
import { useStore, type HandoffState } from "./store";
import { demoNowIso } from "./dates";

type St = ReturnType<typeof useStore.getState>;

/** Handoffs a demo action creates: they do not exist until that action happens. */
const CREATED_BY: Record<string, (s: St) => boolean> = {
  // "Link and raise the drift" in the coverage check raises it to Grace Liu
  "H-118": (s) => s.handoffs["H-118"]?.status === "active" || s.handoffs["H-118"]?.status === "done",
  // the Reg E run hands the vendor check to Nadia Brennan
  "H-113": (s) => Boolean(s.finishedRuns["run-rule-1005"]),
  // the control-design run asks the owner one question when design check D6 cannot tell
  "H-117": (s) => Boolean(s.handoffs["H-117"]),
  // the CCO's sign-off is created with that question and waits for its answer
  "H-116": (s) => Boolean(s.handoffs["H-117"]) || Boolean(s.handoffs["H-116"]),
};
/** Tasks without a handoff that the Reg E run creates. */
const TASK_CREATED_BY: Record<string, (s: St) => boolean> = {
  "T-290": (s) => Boolean(s.finishedRuns["run-rule-1005"]),
  "T-283": (s) => Boolean(s.finishedRuns["run-rule-1005"]),
  // once CTL-153 is in force: the retest and the three vendor reviews
  "T-286": (s) => s.handoffs["H-116"]?.status === "done" && s.handoffs["H-116"]?.option === "approve",
  "T-302": (s) => s.handoffs["H-116"]?.status === "done" && s.handoffs["H-116"]?.option === "approve",
  "T-303": (s) => s.handoffs["H-116"]?.status === "done" && s.handoffs["H-116"]?.option === "approve",
  "T-304": (s) => s.handoffs["H-116"]?.status === "done" && s.handoffs["H-116"]?.option === "approve",
};

export type HandoffStatus = "dormant" | "open" | "overdue" | "waiting_on_previous" | "done";

export function handoffStatus(h: Handoff, s: St): HandoffStatus {
  const local = s.handoffs[h.id];
  if (local?.status === "done") return "done";
  if (CREATED_BY[h.id] && !CREATED_BY[h.id](s)) return "dormant";
  if (h.waits_for && handoffStatus(handoffById(h.waits_for)!, s) !== "done") return "waiting_on_previous";
  if (h.status === "waiting_on_previous") return "open";
  return h.status === "overdue" ? "overdue" : "open";
}

export type TaskState = "open" | "overdue" | "blocked" | "waiting_on_other" | "done";

export interface TaskView {
  task: Task;
  state: TaskState;
  hidden: boolean;
  handoff?: Handoff;
  /** what a blocked or waiting task waits on, in plain words */
  waitsOn?: string;
  from?: string;
}

export function taskView(t: Task, s: St): TaskView {
  const h = t.handoff_id ? handoffById(t.handoff_id) : undefined;
  const from = t.requested_by_id;
  let hidden = false;
  let state: TaskState = t.state;
  let waitsOn: string | undefined;
  if (TASK_CREATED_BY[t.id] && !TASK_CREATED_BY[t.id](s)) hidden = true;
  if (h) {
    const hs = handoffStatus(h, s);
    if (hs === "dormant") hidden = true;
    if (hs === "done") state = "done";
    else if (hs === "waiting_on_previous") {
      state = "blocked";
      const prev = handoffById(h.waits_for!)!;
      waitsOn = `Waiting on ${userById(prev.to_user_id)?.name}'s answer`;
    } else state = hs === "overdue" ? "overdue" : "open";
  }
  // Anthony's impact sign-off waits for Elena to accept the Reg E obligations
  if (t.id === "T-284") {
    if (s.finishedRuns["run-rule-1005"]) state = "open";
    else {
      state = "blocked";
      waitsOn = "Waiting on Elena Petrova to accept the obligations";
    }
  }
  if (t.state === "waiting_on_other" && t.id === "T-281") waitsOn = "Waiting on Corvane Payments to answer the questionnaire";
  if (s.tasksDone[t.id]) state = "done";
  return { task: t, state, hidden, handoff: h, waitsOn, from };
}

export function useTaskViews() {
  const s = useStore();
  return useMemo(() => tasks.map((t) => taskView(t, s)).filter((v) => !v.hidden), [s]);
}

export function useTaskView(id: string | null) {
  const views = useTaskViews();
  return id ? views.find((v) => v.task.id === id) : undefined;
}

/** What the person is waiting on others for: handoffs they sent, plus tasks they handed out. */
export interface WaitingItem {
  key: string;
  who: string;
  whoId?: string;
  what: string;
  since: string;
  due: string;
  changeId?: string;
  handoffId?: string;
  blocked?: boolean;
}

export function useWaitingOn(personaId: string) {
  const s = useStore();
  return useMemo(() => {
    const out: WaitingItem[] = [];
    for (const h of handoffs) {
      if (h.from_user_id !== personaId) continue;
      const st = handoffStatus(h, s);
      if (st === "dormant" || st === "done") continue;
      out.push({
        key: h.id,
        who: userById(h.to_user_id)?.name ?? h.to_user_id,
        whoId: h.to_user_id,
        what: h.title,
        since: s.handoffs[h.id]?.at ?? h.created_at,
        due: h.due,
        changeId: h.change_id,
        handoffId: h.id,
        blocked: st === "waiting_on_previous",
      });
    }
    for (const t of tasks) {
      const v = taskView(t, s);
      // work I asked someone to do without a handoff (the Reg E fixes for Margaret Ellison)
      if (t.requested_by_id === personaId && !t.handoff_id && t.assignee_id !== personaId && !v.hidden && v.state !== "done") {
        out.push({ key: t.id, who: userById(t.assignee_id)?.name ?? t.assignee_id, whoId: t.assignee_id, what: t.title, since: s.finishedRuns["run-rule-1005"]?.at ?? "2026-10-16", due: t.due, changeId: t.change_id });
      }
      if (t.assignee_id === personaId && v.state === "waiting_on_other" && !v.hidden) {
        const vendor = vendors.find((x) => t.title.includes(x.name.split(" ")[0]));
        out.push({ key: t.id, who: vendor?.name ?? "Another team", what: t.title, since: "2026-10-02", due: t.due, changeId: t.change_id });
      }
    }
    return out.sort((a, b) => a.due.localeCompare(b.due));
  }, [s, personaId]);
}

/** Who has it now, for a change: the first open handoff on it, else its owner. */
export function useBlockers(changeId: string) {
  const s = useStore();
  return useMemo(
    () =>
      handoffs
        .filter((h) => h.change_id === changeId)
        .map((h) => ({ h, st: handoffStatus(h, s) }))
        .filter((x) => x.st !== "dormant" && x.st !== "done"),
    [s, changeId],
  );
}

/** Activate a handoff that a demo action creates (the coverage check raising the drift). */
export function raiseHandoff(id: string) {
  const s = useStore.getState();
  const h = handoffById(id);
  if (!h || s.handoffs[id]) return;
  const at = demoNowIso();
  s.setHandoff(id, { status: "active", at, by: h.from_user_id });
  s.addRecord({ at, who: h.from_user_id, kind: "person", what: `${h.type === "drift_fix" ? "Raised drift" : "Sent"} to ${userById(h.to_user_id)?.name}: ${h.title}`, changeId: h.change_id, live: true });
}

/** Submit a handoff response: done, recorded, the sender told, anything waiting unblocked. */
export function respondHandoff(id: string, option: string, fields: Record<string, string>, by: string) {
  const s = useStore.getState();
  const h = handoffById(id);
  if (!h) return;
  const at = demoNowIso();
  const opt = h.options.find((o) => o.id === option);
  const st: HandoffState = { status: "done", option, fields, by, at };
  s.setHandoff(id, st);
  const who = userById(by)?.name ?? by;
  const what = recordText(h, option, fields, who);
  s.addRecord({ at, who: by, kind: "person", what, changeId: h.change_id, live: true });
  s.decide({ label: opt?.label ?? option, text: what, by, at, changeId: h.change_id });
  s.notify({ to: h.from_user_id, from: by, title: `${who} responded`, why: `${h.title}: ${opt?.label ?? option}`, at, handoffId: id, href: h.change_id ? `/rules/${h.change_id}/` : undefined });
  effects(h, option, fields);
  for (const t of tasks) if (t.handoff_id === id) s.completeTask(t.id, by, at);
  s.toast(toastText(h, option, who));
}

function recordText(h: Handoff, option: string, fields: Record<string, string>, who: string) {
  if (h.id === "H-118" && option === "fix") return `${who} updated the procedure: PRC-MTG-03 step 2 now says 3 business days${fields.effective ? `, from ${fields.effective}` : ""}`;
  if (h.id === "H-117") return `${who} answered D6 for CTL-153: ${fields.answer ?? ""}`;
  if (h.id === "H-116") return option === "approve" ? `${who} signed off CTL-153 and the change to POL-ISP-01 3.1` : `${who} sent CTL-153 back: ${fields.reason ?? ""}`;
  if (h.id === "H-115") return `${who} uploaded CTL-132 evidence${fields.files ? `: ${fields.files}` : ""}`;
  if (h.id === "H-114") return `${who} answered flood zone lending: ${fields.fact ?? ""}`;
  if (h.id === "H-113") return `${who} submitted vendor outcomes for the Reg E limit`;
  const opt = h.options.find((o) => o.id === option);
  return `${who} responded to "${h.title}": ${opt?.label ?? option}`;
}

function toastText(h: Handoff, option: string, who: string) {
  const opt = h.options.find((o) => o.id === option);
  if (h.id === "H-116" && option === "approve") return "Approved. CTL-153 is in force.";
  void who;
  return `${opt?.label ?? "Sent"}. ${userById(h.from_user_id)?.name} has been told.`;
}

/** What each answer changes elsewhere in the bank's picture. */
function effects(h: Handoff, option: string, fields: Record<string, string>) {
  const s = useStore.getState();
  if (h.id === "H-118" && option === "fix") {
    s.setObligationState("D-1026-L2", "covered");
    const c = getChange("RC-2026-016")!;
    const k = c.counts!;
    s.overrideChange("RC-2026-016", { counts: { ...k, covered: k.covered + 1, not_yet_confirmed: Math.max(0, k.not_yet_confirmed - 1) } });
  }
  if (h.id === "H-114") {
    const v = fields.fact;
    if (v === "Yes") s.overrideChange("RC-2026-019", { state: "applies", step: "duties" });
    if (v === "No") s.overrideChange("RC-2026-019", { state: "screened_out" });
    if (v) s.answerFact("flood_zone_lending", v, fields.by ?? h.to_user_id, demoNowIso());
  }
  if (h.id === "H-116" && option === "approve") {
    const c = getChange("RC-2026-011")!;
    s.setObligationState("D-208-M1", "covered");
    s.overrideChange("RC-2026-011", { state: c.after_run!.state, step: c.after_run!.step, counts: c.after_run!.counts, new_control: c.after_run!.new_control });
    s.finishRun("run-design-mfa", h.to_user_id, demoNowIso(), {});
  }
}

export function personName(id?: string) {
  return id ? userById(id)?.name ?? id : "";
}
