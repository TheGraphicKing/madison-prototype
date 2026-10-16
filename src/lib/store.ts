"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersonaId } from "@/data";
import type { ChangeCounts, ChangeState, JourneyStep } from "@/data/types";
import type { PaletteId } from "@/theme/palettes";

export interface Decision {
  id: string;
  /** what the person did, in the same words as the button */
  label: string;
  /** a plain sentence for the record and the toast */
  text: string;
  by: string;
  at: string;
  runId?: string;
  changeId?: string;
  dutyId?: string;
  ref?: string;
}

export interface RecordEntry {
  id: string;
  at: string;
  who: string;
  kind: "agent" | "person";
  what: string;
  runId?: string;
  changeId?: string;
  live?: boolean;
}

export interface ChangeOverride {
  state?: ChangeState;
  step?: JourneyStep;
  counts?: ChangeCounts;
  new_control?: string;
}

export interface Toast {
  id: string;
  text: string;
  href?: string;
}

interface State {
  persona: PersonaId;
  palette: PaletteId;
  decisions: Decision[];
  record: RecordEntry[];
  /** runs that finished during the demo, with their responses */
  finishedRuns: Record<string, { at: string; by: string; responses: Record<string, string> }>;
  /** which "after run" results are visible */
  revealed: Record<string, boolean>;
  changes: Record<string, ChangeOverride>;
  /** links confirmed or rejected in the change room */
  linkDecisions: Record<string, "confirmed" | "rejected">;
  toasts: Toast[];
  askOpen: boolean;
  /** tasks finished during the demo */
  tasksDone: Record<string, { by: string; at: string }>;
  /** bank facts answered during the demo */
  facts: Record<string, { value: string; by: string; at: string }>;

  setPersona: (p: PersonaId) => void;
  setPalette: (p: PaletteId) => void;
  decide: (d: Omit<Decision, "id">) => void;
  addRecord: (r: Omit<RecordEntry, "id">) => void;
  finishRun: (runId: string, by: string, at: string, responses: Record<string, string>) => void;
  reveal: (runId: string) => void;
  overrideChange: (id: string, o: ChangeOverride) => void;
  decideLink: (linkId: string, v: "confirmed" | "rejected") => void;
  toast: (text: string, href?: string) => void;
  dismissToast: (id: string) => void;
  setAskOpen: (o: boolean) => void;
  completeTask: (id: string, by: string, at: string) => void;
  answerFact: (key: string, value: string, by: string, at: string) => void;
  reset: () => void;
}

const initial = {
  persona: "u-elena" as PersonaId,
  palette: "graphite" as PaletteId,
  decisions: [] as Decision[],
  record: [] as RecordEntry[],
  finishedRuns: {},
  revealed: {},
  changes: {},
  linkDecisions: {},
  toasts: [] as Toast[],
  askOpen: false,
  tasksDone: {} as Record<string, { by: string; at: string }>,
  facts: {} as Record<string, { value: string; by: string; at: string }>,
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial,
      setPersona: (persona) => set({ persona }),
      setPalette: (palette) => set({ palette }),
      decide: (d) =>
        set((s) => ({
          decisions: [{ ...d, id: uid("dec") }, ...s.decisions],
          record: [
            { id: uid("rec"), at: d.at, who: d.by, kind: "person", what: d.text, runId: d.runId, changeId: d.changeId, live: true },
            ...s.record,
          ],
        })),
      addRecord: (r) => set((s) => ({ record: [{ ...r, id: uid("rec") }, ...s.record] })),
      finishRun: (runId, by, at, responses) =>
        set((s) => ({ finishedRuns: { ...s.finishedRuns, [runId]: { by, at, responses } }, revealed: { ...s.revealed, [runId]: true } })),
      reveal: (runId) => set((s) => ({ revealed: { ...s.revealed, [runId]: true } })),
      overrideChange: (id, o) => set((s) => ({ changes: { ...s.changes, [id]: { ...s.changes[id], ...o } } })),
      decideLink: (linkId, v) => set((s) => ({ linkDecisions: { ...s.linkDecisions, [linkId]: v } })),
      toast: (text, href) => {
        const id = uid("t");
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, href }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setAskOpen: (askOpen) => set({ askOpen }),
      completeTask: (id, by, at) => set((s) => ({ tasksDone: { ...s.tasksDone, [id]: { by, at } } })),
      answerFact: (key, value, by, at) => set((s) => ({ facts: { ...s.facts, [key]: { value, by, at } } })),
      reset: () => set((s) => ({ ...initial, palette: s.palette, toasts: [] })),
    }),
    {
      name: "madison-demo",
      storage: createJSONStorage(() => sessionStorage),
      // rehydrated after mount (AppShell), so the static HTML and first client render match
      skipHydration: true,
      partialize: (s) => ({
        persona: s.persona,
        decisions: s.decisions,
        record: s.record,
        finishedRuns: s.finishedRuns,
        revealed: s.revealed,
        changes: s.changes,
        linkDecisions: s.linkDecisions,
        tasksDone: s.tasksDone,
        facts: s.facts,
      }),
    },
  ),
);

export const PALETTE_KEY = "mad_palette";
