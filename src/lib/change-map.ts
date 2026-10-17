// The change map's model: which journey platforms are done, current, blocked or not started,
// and where each step of a run lands on the map. Pure functions, shared by the scene and the panel.
import type { RuleChange } from "@/data/types";
import type { RunState } from "./player/derive";
import { stepsDone } from "./use-change";

export const PLATFORMS = ["applies", "obligations", "linked", "covered", "whats_left", "close"] as const;
export type PlatformKey = (typeof PLATFORMS)[number];
/** the control-design run adds three small platforms beside What's left */
export const DESIGN = ["suggest", "draft", "checks"] as const;
export type DesignKey = (typeof DESIGN)[number];
export type PlaceKey = PlatformKey | DesignKey | "gate";

export const PLATFORM_LABEL: Record<PlatformKey | DesignKey, string> = {
  applies: "Applies",
  obligations: "Obligations",
  linked: "Linked",
  covered: "Covered",
  whats_left: "What's left",
  close: "Close",
  suggest: "Suggest a fix",
  draft: "Draft the control",
  checks: "Seven checks",
};

export const RUN_FOR: Record<string, string> = { "RC-2026-014": "run-rule-1005", "RC-2026-016": "run-coverage-1026", "RC-2026-011": "run-design-mfa" };

/** Where each run stage works on the map. */
export const STAGE_PLACE: Record<string, Record<string, PlaceKey>> = {
  "run-rule-1005": { text: "applies", sections: "applies", scope: "applies", duties: "obligations", checks: "gate", decide: "obligations", coverage: "linked", touches: "whats_left" },
  "run-coverage-1026": { read: "linked", search: "linked", compare: "linked", decide: "linked" },
  "run-design-mfa": { suggest: "suggest", draft: "draft", checks: "checks", owner: "checks", signoff: "checks", publish: "covered", handoff: "whats_left" },
};

/** The platform each run starts from, and the words of its action. */
export const RUN_ACTION: Record<string, { at: PlatformKey; label: string; demo: string }> = {
  "run-rule-1005": { at: "applies", label: "Run Madison on this rule", demo: "D1-2" },
  "run-coverage-1026": { at: "linked", label: "Check coverage", demo: "D3-1" },
  "run-design-mfa": { at: "whats_left", label: "Choose a fix", demo: "D2-2" },
};

export type PlatformStatus = "done" | "current" | "waiting" | "blocked" | "hidden";

export interface PlatformModel {
  key: PlatformKey | DesignKey;
  status: PlatformStatus;
  /** the short floating label: what the platform holds or why it waits */
  note: string;
  working: boolean;
}

/** Platform states from the change alone (no run playing). */
export function staticPlatforms(c: RuleChange, blockedOn: string | null): PlatformModel[] {
  const done = stepsDone(c);
  const k = c.counts;
  return PLATFORMS.map((key, i) => {
    if (c.state === "screened_out") return { key, status: key === "applies" ? "done" : "hidden", note: key === "applies" ? "Doesn't apply" : "", working: false };
    if (c.state === "uncertain") {
      if (key === "applies") return { key, status: "blocked", note: blockedOn ? `Waiting on ${blockedOn}` : "Needs a bank fact", working: false };
      return { key, status: "waiting", note: "Not started", working: false };
    }
    if (c.state === "closed") return { key, status: "done", note: doneNote(key, c), working: false };
    const status: PlatformStatus = i < done ? "done" : i === done ? (blockedOn ? "blocked" : "current") : "waiting";
    const note = status === "done" ? doneNote(key, c) : status === "blocked" ? `Waiting on ${blockedOn}` : status === "current" ? currentNote(key, k) : "Not started";
    return { key, status, note, working: false };
  });
}

function doneNote(key: PlatformKey, c: RuleChange) {
  const k = c.counts;
  switch (key) {
    case "applies":
      return "Applies";
    case "obligations":
      return k ? `${k.duties} obligations${c.after_run?.excluded && c.state !== "closed" ? ` · ${c.after_run.excluded} excluded` : ""}` : "Obligations found";
    case "linked":
      return "Linked";
    case "covered":
      return k ? `${k.covered} covered · ${k.not_yet_confirmed + k.nothing_behind} open` : "Covered";
    case "whats_left":
      return "Nothing left";
    case "close":
      return c.closed_at ? "Closed" : "Ready to close";
  }
}

function currentNote(key: PlatformKey, k: RuleChange["counts"]) {
  if (key === "whats_left" && k) return `${k.nothing_behind + k.not_yet_confirmed} to fix`;
  if (key === "applies") return "Not read yet";
  return "Next";
}

/** While a run plays, the platforms it works on follow its stages. */
export function runPlatforms(base: PlatformModel[], runId: string, st: RunState, stages: { key: string }[]): PlatformModel[] {
  const map = STAGE_PLACE[runId] ?? {};
  const by = new Map<string, { running: boolean; waiting: boolean; done: number; total: number }>();
  for (const s of stages) {
    const place = map[s.key];
    if (!place || place === "gate") continue;
    const cur = by.get(place) ?? { running: false, waiting: false, done: 0, total: 0 };
    const state = st.stages[s.key].state;
    cur.total++;
    if (state === "done") cur.done++;
    if (state === "running") cur.running = true;
    if (state === "waiting_person") cur.waiting = true;
    by.set(place, cur);
  }
  const design = runId === "run-design-mfa";
  const list: PlatformModel[] = base.map((p) => {
    const r = by.get(p.key);
    if (!r) return p;
    if (r.running || r.waiting) return { ...p, status: "current", note: r.waiting ? "Waiting for a person" : "Working", working: r.running };
    if (r.done === r.total) return { ...p, status: "done", note: p.status === "done" ? p.note : "Done" };
    return { ...p, status: p.status === "done" ? "done" : "waiting", note: p.status === "done" ? p.note : "Not started" };
  });
  if (design)
    for (const d of DESIGN) {
      const r = by.get(d);
      list.push({ key: d, status: !r ? "waiting" : r.running || r.waiting ? "current" : r.done === r.total ? "done" : "waiting", note: r?.waiting ? "Waiting for a person" : r?.running ? "Working" : r && r.done === r.total ? "Done" : "Not started", working: Boolean(r?.running) });
    }
  return list;
}
