"use client";

// Where people came from and where things go. Today is the hub: every item opens the exact place it
// refers to, every story ends with a way back, and breadcrumbs return to the page before.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Task } from "@/data/types";
import { tasks, type PersonaId } from "@/data";
import { taskView } from "./work";
import { useStore } from "./store";

interface Nav {
  prev: string | null;
  current: string | null;
  /** a task to highlight on Today after a persona switch */
  highlight: string | null;
  visit: (path: string) => void;
  setHighlight: (id: string | null) => void;
}

export const useNav = create<Nav>()(
  persist(
    (set) => ({
      prev: null,
      current: null,
      highlight: null,
      visit: (path) => set((s) => (s.current === path ? s : { prev: s.current, current: path })),
      setHighlight: (id) => set({ highlight: id }),
    }),
    { name: "madison-nav", storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Where a task opens: the board pack, its change room (with "Your task now" ready), or its drawer. */
export function taskHref(t: Task): string | null {
  if (t.kind === "approve_report") return "/reports/board-pack/";
  if (t.handoff_id) return null; // answered in the task drawer, wherever it is
  if (t.change_id) return `/rules/${t.change_id}/`;
  return null;
}

/**
 * "Viewing as": if this page has an open task for the new person, stay and show it under
 * "Your task now"; otherwise go to their Today with that task highlighted.
 */
export function switchPersona(id: PersonaId, pathname: string, navigate: (href: string) => void) {
  const s = useStore.getState();
  s.setPersona(id);
  const st = useStore.getState();
  const open = tasks.map((t) => taskView(t, st)).filter((v) => !v.hidden && v.task.assignee_id === id && v.state !== "done");
  const m = pathname.match(/^\/rules\/([^/]+)/);
  const here = m ? open.find((v) => v.task.change_id === m[1]) : pathname.startsWith("/reports/board-pack") ? open.find((v) => v.task.kind === "approve_report") : undefined;
  if (here) {
    useNav.getState().setHighlight(null);
    return;
  }
  s.openTask(null);
  const related = m ? open.find((v) => v.task.change_id === m[1]) : undefined;
  const top = related ?? open.sort((a, b) => a.task.priority - b.task.priority)[0];
  useNav.getState().setHighlight(top?.task.id ?? null);
  if (pathname !== "/") navigate("/");
}
