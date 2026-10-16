// The plain steps of each run, with their one-line results, built from the player state.
// Words are exactly those in 23_run_view_v2.md.
import type { Run } from "@/data/types";
import type { RunState } from "./player/derive";

export const STEP_TITLES: Record<string, Record<string, string>> = {
  "run-rule-1005": {
    text: "Read the official text",
    sections: "Split it into sections",
    scope: "Check it applies to Northgate",
    duties: "Find the obligations",
    checks: "Double-check each one",
    decide: "You decide",
    coverage: "Match to policies and controls",
    touches: "See what it touches",
  },
  "run-coverage-1026": {
    read: "Read the obligation",
    search: "Search policies, procedures and controls",
    compare: "Compare the numbers",
    decide: "You confirm",
  },
  "run-design-mfa": {
    suggest: "Suggest the smallest fix",
    draft: "Draft the control",
    checks: "Seven design checks",
    owner: "Owner answers",
    signoff: "CCO signs off",
    publish: "In force and re-checked",
    handoff: "Hand off",
  },
};

export const stepTitle = (run: Run, key: string) => STEP_TITLES[run.id]?.[key] ?? run.stages.find((s) => s.key === key)?.title ?? key;

/** Which battle card in the change room holds the result of each step. */
export const STEP_CARD: Record<string, string> = {
  text: "applies",
  sections: "applies",
  scope: "applies",
  duties: "obligations",
  checks: "obligations",
  decide: "obligations",
  coverage: "linked",
  touches: "whats_left",
  read: "linked",
  search: "linked",
  compare: "whats_left",
  suggest: "whats_left",
  draft: "whats_left",
  owner: "whats_left",
  signoff: "close",
  publish: "covered",
  handoff: "whats_left",
};

/** The one-line result a finished step types in. */
export function stepResult(run: Run, key: string, st: RunState, deciderName?: string): string {
  const s = st.stages[key];
  if (!s || s.state === "waiting") return "";
  const rc = st.checks.filter((c) => c.gate === "RC-04");
  if (run.id === "run-rule-1005") {
    switch (key) {
      case "text":
        return s.state === "done" ? "Read 12 CFR 1005.11 from eCFR; it matches the Federal Register" : "Fetching the amended text";
      case "sections": {
        const secs = Object.values(st.resting).filter((i) => i.kind === "section");
        const changed = secs.filter((i) => i.changed).length;
        return s.state === "done" ? `${secs.length} sections · ${changed} changed` : `${secs.length} of 14 sections so far`;
      }
      case "scope":
        return s.state === "done" ? "Applies: Northgate offers consumer electronic transfers and debit cards" : "Checking the bank's facts";
      case "duties":
        return s.state === "done" ? "Found 8 obligations in 9 sections" : `Found ${st.metrics.duties_found ?? 0} so far`;
      case "checks":
        return s.state === "done" ? `${rc.filter((c) => c.result === "pass").length} passed · ${rc.filter((c) => c.result === "block").length} held back` : `Checked ${rc.length} of 8`;
      case "decide":
        return s.state === "done" ? `6 accepted · 1 excluded${deciderName ? ` · ${deciderName}` : ""}` : "Waiting for you";
      case "coverage":
        return s.state === "done" ? "4 covered · 1 not yet confirmed · 1 nothing behind it · 1 drift" : `${st.items.filter((i) => i.kind === "link").length} links found so far`;
      case "touches":
        return s.state === "done" ? "6 obligations · 4 policy sections · 5 controls · 3 vendors" : "Walking what the change touches";
    }
  }
  if (run.id === "run-coverage-1026") {
    switch (key) {
      case "read":
        return s.state === "done" ? "Deadline: 3 business days after a changed circumstance" : "Reading the obligation";
      case "search": {
        const n = st.items.filter((i) => i.kind === "candidate").length;
        return s.state === "done" ? `${n} candidates · 3 strong` : `${n} candidates so far`;
      }
      case "compare":
        return s.state === "done" ? "Policy says 3 business days; procedure says 5" : "Comparing the numbers";
      case "decide":
        return s.state === "done" ? `Linked${deciderName ? ` · ${deciderName}` : ""}` : "Waiting for you";
    }
  }
  if (run.id === "run-design-mfa") {
    const d = st.checks.filter((c) => /^D\d$/.test(c.gate));
    const latest = new Map(d.map((c) => [c.gate, c]));
    switch (key) {
      case "suggest":
        return s.state === "done" ? "A new control, plus one sentence in POL-ISP-01 3.1" : "Looking for the smallest fix";
      case "draft":
        return s.state === "done" ? "CTL-153 drafted, with the policy words" : `${st.items.filter((i) => i.kind === "draft_part").length} of 6 parts drafted`;
      case "checks": {
        const pass = [...latest.values()].filter((c) => c.result === "pass").length;
        const cant = [...latest.values()].filter((c) => c.result === "cannot_tell").length;
        return s.state === "done" ? `${pass} pass${cant ? ` · ${cant} needs the owner` : ""}` : `${latest.size} of 7 checked`;
      }
      case "owner":
        return s.state === "done" ? "Answered: break-glass access is vaulted and needs two officers" : "Waiting for Priya Raman";
      case "signoff":
        return s.state === "done" ? "Signed off by Anthony Marsh" : "Waiting for Anthony Marsh";
      case "publish":
        return s.state === "done" ? "CTL-153 in force; the obligation now has a control behind it" : "Re-checking coverage";
      case "handoff":
        return s.state === "done" ? "3 vendor reviews · 1 test plan change" : "Handing off";
    }
  }
  return s.detail ?? "";
}

/** The sentence the live strip shows while a step runs. */
export function liveSentence(st: RunState) {
  return st.narration?.text ?? "";
}
