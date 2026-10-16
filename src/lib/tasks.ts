import type { Task, TaskAction } from "@/data/types";
import { controlById, getChange, getDuty, knownGaps, tasks } from "@/data";
import { businessDaysFrom, daysFrom, fmtDay } from "./dates";

/** The one action a task row offers, in the words of the button. */
export const ACTION_LABEL: Record<TaskAction, string> = {
  run_rule: "Run Madison on this rule",
  design_control: "Choose a fix",
  check_coverage: "Confirm the links",
  review_duties: "Review the obligations",
  review_obligations: "Review the obligations",
  answer_fact: "Answer the fact",
  upload_evidence: "Upload evidence",
  sign_off: "Sign off",
};

/** Which run a task starts, if any. */
export const ACTION_RUN: Partial<Record<TaskAction, string>> = {
  run_rule: "run-rule-1005",
  design_control: "run-design-mfa",
  check_coverage: "run-coverage-1026",
};

export function taskHref(t: Task) {
  if (t.change_id) return `/rules/${t.change_id}/`;
  return `/tasks/?open=${t.id}`;
}

/** "CTL-132 evidence", "Reg E duties", for the short fact lines. */
export function taskShortName(t: Task) {
  if (t.control_id) return `${t.control_id} evidence`;
  if (t.action === "sign_off") return "a sign-off";
  const c = t.change_id ? getChange(t.change_id) : undefined;
  return c ? c.title.toLowerCase() : t.title;
}

export function nextDeadline(done: Record<string, unknown>) {
  return tasks.filter((t) => !done[t.id]).sort((a, b) => a.due.localeCompare(b.due))[0];
}

export function dueBucket(t: Task): "Overdue" | "This week" | "Later" {
  const d = daysFrom(t.due);
  if (t.state === "overdue" || d < 0) return "Overdue";
  // "this week" means due within the next 7 working days
  if (businessDaysFrom(t.due) <= 7) return "This week";
  return "Later";
}

/** The next known gap to expire, as a short phrase. */
export function gapLine() {
  const g = [...knownGaps].sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
  if (!g) return null;
  const d = getDuty(g.obligation_id);
  const topic = d?.process_tags.includes("wires") ? "wire releases" : d?.object ?? "a duty";
  return { gap: g, text: `Known gap on ${topic} expires ${fmtDay(g.expiry)}` };
}

export function controlLabel(id?: string) {
  return id ? controlById(id)?.name : undefined;
}
