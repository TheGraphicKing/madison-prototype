"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { run as getRun } from "@/data";
import { blockingTime, clampTime, nextTime, prevTime, personEvents, type Responses } from "./derive";
import { applyRunResults } from "./results";

export type Speed = 0.5 | 1 | 2 | 4;
export type Mode = "live" | "replay";

export interface Instance {
  key: string;
  runId: string;
  t: number;
  playing: boolean;
  speed: Speed;
  responses: Responses;
  /** who answered each person event, and when (wall clock) */
  answeredBy: Record<string, { by: string; at: string }>;
  mode: Mode;
  loop?: boolean;
  /** answer person events automatically with their first action (looped replays) */
  autoRespond?: boolean;
  completed?: boolean;
  /** wall-clock ms the instance was created; the build-in animation keys off it */
  createdAt: number;
}

interface PlaybackState {
  instances: Record<string, Instance>;
  ensure: (key: string, runId: string, init?: Partial<Instance>) => void;
  restart: (key: string, init?: Partial<Instance>) => void;
  remove: (key: string) => void;
  patch: (key: string, p: Partial<Instance>) => void;
  play: (key: string) => void;
  pause: (key: string) => void;
  seek: (key: string, t: number) => void;
  setSpeed: (key: string, s: Speed) => void;
  stepNext: (key: string) => void;
  stepBack: (key: string) => void;
  respond: (key: string, eventKey: string, actionId: string, by: string, at: string) => void;
  tick: (dtMs: number) => void;
}

const fresh = (key: string, runId: string, init?: Partial<Instance>): Instance => ({
  key,
  runId,
  t: 0,
  playing: false,
  speed: 1,
  responses: {},
  answeredBy: {},
  mode: "live",
  createdAt: typeof performance !== "undefined" ? performance.now() : 0,
  ...init,
});

const LOOP_REST_MS = 2600;

export const usePlayback = create<PlaybackState>()((set, get) => ({
  instances: {},
  ensure: (key, runId, init) => {
    if (get().instances[key]) return;
    set((s) => ({ instances: { ...s.instances, [key]: fresh(key, runId, init) } }));
  },
  restart: (key, init) => {
    const cur = get().instances[key];
    if (!cur) return;
    set((s) => ({ instances: { ...s.instances, [key]: fresh(key, cur.runId, { mode: cur.mode, speed: cur.speed, loop: cur.loop, autoRespond: cur.autoRespond, ...init }) } }));
  },
  remove: (key) =>
    set((s) => {
      const next = { ...s.instances };
      delete next[key];
      return { instances: next };
    }),
  patch: (key, p) => set((s) => (s.instances[key] ? { instances: { ...s.instances, [key]: { ...s.instances[key], ...p } } } : s)),
  play: (key) => {
    const i = get().instances[key];
    const r = i && getRun(i.runId);
    if (!i || !r) return;
    // pressing play at the end replays from the start
    const atEnd = i.t >= r.duration_ms && blockingTime(r, i.responses) === Infinity;
    if (atEnd && !i.loop) get().restart(key, { playing: true, mode: "replay", responses: i.responses, answeredBy: i.answeredBy, completed: true });
    else get().patch(key, { playing: true });
  },
  pause: (key) => get().patch(key, { playing: false }),
  seek: (key, t) => {
    const i = get().instances[key];
    const r = i && getRun(i.runId);
    if (!i || !r) return;
    get().patch(key, { t: clampTime(r, t, i.responses) });
  },
  setSpeed: (key, speed) => get().patch(key, { speed }),
  stepNext: (key) => {
    const i = get().instances[key];
    const r = i && getRun(i.runId);
    if (!i || !r) return;
    get().patch(key, { playing: false, t: clampTime(r, nextTime(r, i.t), i.responses) });
  },
  stepBack: (key) => {
    const i = get().instances[key];
    const r = i && getRun(i.runId);
    if (!i || !r) return;
    get().patch(key, { playing: false, t: prevTime(r, i.t) });
  },
  respond: (key, eventKey, actionId, by, at) => {
    const i = get().instances[key];
    if (!i) return;
    get().patch(key, {
      responses: { ...i.responses, [eventKey]: actionId },
      answeredBy: { ...i.answeredBy, [eventKey]: { by, at } },
      playing: true,
    });
  },
  tick: (dt) => {
    const { instances } = get();
    let changed = false;
    const next: Record<string, Instance> = { ...instances };
    const finished: Instance[] = [];
    for (const i of Object.values(instances)) {
      if (!i.playing) continue;
      const r = getRun(i.runId);
      if (!r) continue;
      let responses = i.responses;
      const block = blockingTime(r, responses);
      let t = i.t + dt * i.speed;
      if (t >= block) {
        if (i.autoRespond) {
          const pe = personEvents(r).find((p) => !responses[String(p.i)]);
          if (pe) responses = { ...responses, [String(pe.i)]: pe.e.actions[0].id };
        } else {
          t = block;
          // already waiting at a person checkpoint: nothing changes, no re-render
          if (i.t === block) continue;
        }
      }
      if (i.loop) {
        if (t >= r.duration_ms + LOOP_REST_MS) {
          next[i.key] = { ...i, t: 0, responses: {}, answeredBy: {}, createdAt: performance.now() };
          changed = true;
          continue;
        }
        next[i.key] = { ...i, t, responses };
        changed = true;
        continue;
      }
      if (t >= r.duration_ms) {
        t = r.duration_ms;
        const done = { ...i, t, responses, playing: false, completed: true };
        next[i.key] = done;
        if (!i.completed) finished.push(done);
      } else {
        next[i.key] = { ...i, t, responses, playing: t < block || Boolean(i.autoRespond) ? true : i.playing };
      }
      changed = true;
    }
    if (changed) set({ instances: next });
    for (const f of finished) if (f.mode === "live") applyRunResults(f);
  },
}));

/** One rAF loop for every playing run. Mounted once by the app shell. */
export function PlaybackEngine() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      usePlayback.getState().tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
