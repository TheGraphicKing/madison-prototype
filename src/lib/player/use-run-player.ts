"use client";

import { useEffect, useMemo } from "react";
import { run as getRun } from "@/data";
import { derive, HOP_MS, type RunState } from "./derive";
import { usePlayback, type Instance, type Speed } from "./engine";
import { useReducedMotion } from "@/components/core/typed";

/**
 * useRunPlayer(runId): the derived state at the current time, plus controls.
 * `key` lets several views share one clock (the change room strip and the full canvas),
 * or keep their own (the looped hero card).
 */
export function useRunPlayer(
  runId: string,
  opts: { key?: string; init?: Partial<Instance> } = {},
) {
  const key = opts.key ?? runId;
  const r = getRun(runId);
  const ensure = usePlayback((s) => s.ensure);
  useEffect(() => {
    ensure(key, runId, opts.init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, runId]);
  const inst = usePlayback((s) => s.instances[key]);
  const reduced = useReducedMotion();
  const api = usePlayback.getState();

  const state: RunState | null = useMemo(() => {
    if (!r) return null;
    return derive(r, inst?.t ?? 0, inst?.responses ?? {}, { hop: reduced ? 0 : HOP_MS });
  }, [r, inst?.t, inst?.responses, reduced]);

  const controls = useMemo(
    () => ({
      play: () => api.play(key),
      pause: () => api.pause(key),
      toggle: () => (usePlayback.getState().instances[key]?.playing ? api.pause(key) : api.play(key)),
      seek: (ms: number) => api.seek(key, ms),
      setSpeed: (s: Speed) => api.setSpeed(key, s),
      stepNext: () => api.stepNext(key),
      stepBack: () => api.stepBack(key),
      restart: (init?: Partial<Instance>) => api.restart(key, init),
      respond: (eventKey: string, actionId: string, by: string, at: string) => api.respond(key, eventKey, actionId, by, at),
    }),
    [api, key],
  );

  return { run: r, state, instance: inst, controls, reduced, key };
}
