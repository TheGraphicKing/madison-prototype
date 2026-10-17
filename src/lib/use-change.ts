"use client";

import { getChange } from "@/data";
import type { RuleChange } from "@/data/types";
import { useStore } from "./store";

/** A rule change with what happened during the demo applied on top. */
export function useChange(id: string): RuleChange | undefined {
  const base = getChange(id);
  const o = useStore((s) => s.changes[id]);
  if (!base) return undefined;
  if (!o) return base;
  return { ...base, ...o, counts: o.counts ?? base.counts } as RuleChange;
}

export function useChanges(list: RuleChange[]) {
  const all = useStore((s) => s.changes);
  return list.map((c) => (all[c.id] ? ({ ...c, ...all[c.id], counts: all[c.id].counts ?? c.counts } as RuleChange) : c));
}

export const STEPS = ["applies", "duties", "linked", "covered", "whats_left", "close"] as const;
export const STEP_LABEL: Record<(typeof STEPS)[number], string> = {
  applies: "Applies",
  duties: "Obligations",
  linked: "Linked",
  covered: "Covered",
  whats_left: "What's left",
  close: "Close",
};

/** How many journey steps are done for a change. */
export function stepsDone(c: RuleChange): number {
  // the scenario matrix: the stage name is the last step done, except What's left, which is current
  switch (c.state) {
    case "closed":
      return 6;
    case "covered":
      return 5;
    case "whats_left":
      return 4;
    case "linked":
      return 3;
    case "duties":
      return 2;
    case "applies":
      return 1;
    case "screened_out":
      return 1;
    default:
      return 0;
  }
}

export const STATE_WORD: Record<string, string> = {
  new: "New",
  applies: "Applies",
  uncertain: "Unsure if it applies",
  screened_out: "Doesn't apply",
  duties: "Obligations found",
  linked: "Linked",
  whats_left: "What's left",
  covered: "Covered",
  closed: "Closed",
};

/** A duty's coverage state, with what the demo changed applied (CTL-153 covers D-208-M1). */
export function useCoverage(d: { id: string; coverage_state: import("@/data/types").CoverageState }) {
  const override = useStore((s) => s.obligationStates[d.id]);
  return override ?? d.coverage_state;
}

/** The stage name the scenario matrix uses, from the change's live state. */
export function stageWord(c: RuleChange): string {
  switch (c.state) {
    case "new":
      return "Not started";
    case "applies":
      return "Applies";
    case "duties":
      return "Obligations proposed";
    case "linked":
      return "Linked";
    case "whats_left":
      return "What's left";
    case "covered":
      return "Covered";
    case "closed":
      return c.counts?.known_gap ? "Closed with a known gap" : "Closed";
    case "screened_out":
      return "Doesn't apply";
    case "uncertain":
      return "Needs a bank fact";
    default:
      return STATE_WORD[c.state] ?? c.state;
  }
}
