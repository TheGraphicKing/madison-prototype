"use client";

// The demo flows from demo_flows.json: starting one resets only its own scenario, switches to the
// starting person, opens the starting screen and turns on the guide. Each step names the element it
// points at (data-demo) and a check that says when the presenter may move on.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { coverageLinks, demoFlows, dutiesFor, handoffs, tasks, type PersonaId } from "@/data";
import type { DemoFlow } from "@/data/types";
import { RUN_FOR } from "./change-map";
import { useStore, type ScenarioScope } from "./store";
import { usePlayback } from "./player/engine";

/** Everything a flow may change, from the rule changes it names. */
export function scopeFor(flow: DemoFlow): ScenarioScope {
  const changes = [...flow.scenario_reset];
  const runs = changes.map((c) => RUN_FOR[c]).filter(Boolean);
  const obligations = changes.flatMap((c) => dutiesFor(c).map((d) => d.id));
  return {
    changes,
    runs,
    tasks: tasks.filter((t) => t.change_id && changes.includes(t.change_id)).map((t) => t.id).concat(flow.id === "D5" ? ["T-280"] : []),
    handoffs: handoffs.filter((h) => h.change_id && changes.includes(h.change_id)).map((h) => h.id),
    obligations,
    links: coverageLinks.filter((l) => obligations.includes(l.obligation_id)).map((l) => l.id),
    facts: changes.includes("RC-2026-019") ? ["flood_zone_lending"] : [],
    // the CCO's flow ends with an approved board pack, so it starts with a draft again
    reports: flow.id === "D5",
  };
}

type St = ReturnType<typeof useStore.getState>;
type Ctx = { s: St; path: string };

/** When each step counts as done, so Next unlocks. No check: Next is always available. */
const DONE: Record<string, (c: Ctx) => boolean> = {
  "D1-1": (c) => c.path.startsWith("/rules/RC-2026-014"),
  "D1-2": (c) => Boolean(usePlayback.getState().instances["run-rule-1005"]?.t),
  "D1-5": (c) => Boolean(c.s.decisions.some((d) => d.runId === "run-rule-1005")),
  "D1-6": (c) => Boolean(c.s.finishedRuns["run-rule-1005"]),
  "D1-7": (c) => c.path.startsWith("/coverage"),
  "D2-2": () => Boolean(usePlayback.getState().instances["run-design-mfa"]?.t),
  "D2-3": (c) => Boolean(c.s.handoffs["H-117"]),
  "D2-4": (c) => c.s.handoffs["H-117"]?.status === "done",
  "D2-5": (c) => c.s.handoffs["H-116"]?.status === "done",
  "D2-6": (c) => c.path.startsWith("/coverage") && c.s.persona === "u-elena",
  "D3-1": () => Boolean(usePlayback.getState().instances["run-coverage-1026"]?.t),
  "D3-2": (c) => Boolean(c.s.handoffs["H-118"]),
  "D3-3": (c) => c.s.persona === "u-grace",
  "D3-4": (c) => c.s.handoffs["H-118"]?.status === "done",
  "D3-5": (c) => c.s.persona === "u-elena",
  "D4-1": (c) => c.path.startsWith("/rules/RC-2026-018"),
  "D4-2": (c) => c.path.startsWith("/rules/RC-2026-019"),
  "D4-3": (c) => c.s.handoffs["H-114"]?.status === "done",
  "D5-2": (c) => c.path.includes("lens=owner"),
  "D5-3": (c) => c.path.startsWith("/coverage"),
  "D5-4": (c) => Boolean(c.s.tasksDone["T-280"]),
  "D5-5": (c) => c.path.includes("replay=1"),
};
export const stepDone = (flow: string, n: number, ctx: Ctx) => (DONE[`${flow}-${n}`] ? DONE[`${flow}-${n}`](ctx) : true);

/** Where each step's target lives, so Next can take the presenter there. */
export const STEP_PATH: Record<string, string> = {
  "D1-1": "/",
  "D1-7": "/rules/RC-2026-014/",
  "D2-4": "/tasks/",
  "D2-5": "/tasks/",
  "D2-6": "/coverage/?view=field&plot=reg-04",
  "D3-3": "/",
  "D3-4": "/tasks/",
  "D3-5": "/",
  "D4-1": "/rules/",
  "D4-2": "/rules/",
  "D4-3": "/tasks/",
  "D5-2": "/coverage/?view=field",
  "D5-3": "/coverage/?view=field",
  "D5-4": "/reports/board-pack/",
  "D5-5": "/record/",
};
/** Steps that change who is viewing. */
export const STEP_PERSONA: Record<string, PersonaId> = { "D2-4": "u-priya", "D2-5": "u-anthony", "D2-6": "u-elena", "D3-3": "u-grace", "D3-5": "u-elena", "D4-3": "u-grace" };

interface Guide {
  flow: string | null;
  step: number;
  finished: boolean;
  hubOpen: boolean;
  start: (id: string) => void;
  go: (step: number) => void;
  finish: () => void;
  exit: () => void;
  setHub: (o: boolean) => void;
}

export const useGuide = create<Guide>()(
  persist(
    (set) => ({
      flow: null,
      step: 1,
      finished: false,
      hubOpen: false,
      start: (id) => set({ flow: id, step: 1, finished: false, hubOpen: false }),
      go: (step) => set({ step }),
      finish: () => set({ finished: true }),
      exit: () => set({ flow: null, step: 1, finished: false }),
      setHub: (o) => set({ hubOpen: o }),
    }),
    { name: "madison-guide", storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ flow: s.flow, step: s.step, finished: s.finished }) },
  ),
);

/** "Start this demo": reset this flow's scenario, switch person, open the start screen, turn on the guide. */
export function startDemo(id: string, navigate: (href: string) => void) {
  const flow = demoFlows.find((f) => f.id === id);
  if (!flow) return;
  const sc = scopeFor(flow);
  useStore.getState().resetScenario(sc);
  for (const r of sc.runs) usePlayback.getState().remove(r);
  useStore.getState().setPersona(flow.persona as PersonaId);
  useStore.getState().openTask(null);
  useGuide.getState().start(id);
  navigate(flow.start.endsWith("/") ? flow.start : `${flow.start}/`);
}

export const flowById = (id: string | null) => demoFlows.find((f) => f.id === id);
