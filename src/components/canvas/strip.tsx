"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useRunPlayer } from "@/lib/player/use-run-player";
import { usePlayback, type Instance } from "@/lib/player/engine";
import { Square } from "@/components/core/mark";
import { MonoLabel } from "@/components/core/labels";
import { Typed } from "@/components/core/typed";
import { hueFor } from "@/components/core/tags";
import { Tilt } from "@/components/motion-primitives/tilt";
import { Schematic } from "./schematic";
import { layoutFor, W } from "./layout";
import { PHASES } from "@/lib/player/derive";
import { fmtClock } from "@/lib/dates";

/**
 * The strip (96 px): the stage chain with packets, the narration line and the current phase.
 * Shares the clock of the full canvas when given the same instance key.
 */
export function RunStrip({
  runId,
  instanceKey,
  href,
  hideOpen,
  className,
  init,
}: {
  runId: string;
  instanceKey?: string;
  href?: string;
  hideOpen?: boolean;
  className?: string;
  init?: Partial<Instance>;
}) {
  const { run, state, instance } = useRunPlayer(runId, { key: instanceKey ?? runId, init });
  const clock = Boolean(instance?.playing) && !state?.pending && !state?.done;
  if (!run || !state) return null;
  const n = run.stages.length;
  const idx = (k: string) => run.stages.findIndex((s) => s.key === k);
  const pos = (k: string) => {
    const i = idx(k);
    if (i >= 0) return (i + 0.5) / n;
    if (run.sources.some((s) => s.id === k)) return 0;
    return 1;
  };
  return (
    <div className={cn("flex min-h-[96px] flex-col justify-between gap-2 rounded-[14px] bg-surface px-5 py-3.5 shadow-[inset_0_0_0_1px_var(--line)]", className)}>
      <div className="relative">
        <div className="absolute top-[11px] right-0 left-0 h-px bg-line" aria-hidden />
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {run.stages.map((s) => {
            const st = state.stages[s.key].state;
            const live = st === "running" || st === "waiting_person";
            return (
              <li key={s.key} className="flex min-w-0 flex-col items-center gap-1.5 px-1">
                <span
                  className="relative z-[1] block size-[9px]"
                  style={{
                    marginTop: 7,
                    background: live ? "var(--highlight)" : st === "done" ? "var(--ink)" : "var(--surface)",
                    boxShadow: `0 0 0 3px var(--surface), inset 0 0 0 1px ${st === "waiting" ? "var(--lineStrong)" : "var(--ink)"}`,
                  }}
                />
                <span className={cn("w-full truncate text-center text-[11.5px] leading-4", live ? "font-medium text-ink" : st === "done" ? "text-ink2" : "text-ink3")}>{s.title}</span>
              </li>
            );
          })}
        </ol>
        {state.inFlight.map((it) => {
          const a = pos(it.from);
          const b = pos(it.to);
          const x = a + (b - a) * it.progress;
          return (
            <span
              key={it.key}
              aria-hidden
              className="absolute top-[9px] block size-[5px]"
              style={{ left: `calc(${x * 100}% - 2.5px)`, background: it.agentId ? hueFor(it.agentId) : "var(--ink)" }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-4">
        <span className="t-label shrink-0 text-ink">{state.done ? "Done" : state.pending ? "Waiting for a person" : state.phase}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-ink" aria-live="polite">
          {state.narration ? <Typed key={state.narration.text} text={state.narration.text} elapsed={clock ? state.narration.elapsed : undefined} cps={70} caret="while" /> : null}
        </span>
        <span className="t-data shrink-0 text-[11px] text-ink3">{fmtClock(state.t)}</span>
        {!hideOpen && href ? (
          <Link href={href} className="shrink-0 text-[13px] underline underline-offset-4">
            Open full view
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The card (Today hero): the schematic at small scale, a looped replay at 2x, muted, with tilt.
 */
export function RunCard({ runId, href, label }: { runId: string; href: string; label: string }) {
  const { run, state, instance } = useRunPlayer(runId, {
    key: `card:${runId}`,
    init: { mode: "replay", loop: true, autoRespond: true, speed: 2, playing: true },
  });
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const layout = useMemo(() => (run ? layoutFor(run) : null), [run]);
  useLayoutEffect(() => {
    if (!box.current || !layout) return;
    const el = box.current;
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / W, 1)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);
  // keep the card playing (another view may have paused the shared engine)
  useEffect(() => {
    if (instance && !instance.playing) {
      const id = setTimeout(() => usePlayback.getState().play(`card:${runId}`), 50);
      return () => clearTimeout(id);
    }
  }, [instance, runId]);
  if (!run || !state || !layout) return null;
  const curPhase = PHASES.indexOf(state.phase);
  return (
    <Tilt rotationFactor={3} className="block">
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-[14px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--ink)]"
        aria-label={`${run.title}. Open the run.`}
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-5">
          <MonoLabel tone="ink">{label}</MonoLabel>
          <span className="flex items-center gap-4">
            {PHASES.map((p, i) => (
              <span key={p} className="flex items-center gap-1.5 text-[12px] text-ink2">
                <Square size={6} filled={i <= curPhase} color={i === curPhase ? "var(--highlight)" : "var(--ink)"} style={{ boxShadow: "inset 0 0 0 1px var(--ink)" }} />
                {p}
              </span>
            ))}
          </span>
        </div>
        <div ref={box} className="relative mx-6 mt-2" style={{ aspectRatio: `${W} / ${layout.H}` }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: W }} className="pointer-events-none absolute top-0 left-0">
            <Schematic run={run} state={state} layout={layout} trace={null} compact key={instance?.createdAt ?? 0} build />
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-line px-6 py-3.5">
          <span className="min-w-0 truncate text-[14px] leading-5 text-ink">
            {state.narration ? <Typed key={state.narration.text} text={state.narration.text} elapsed={state.narration.elapsed} cps={70} caret="while" /> : null}
          </span>
          <span className="shrink-0 text-[13px] text-ink2 group-hover:text-ink group-hover:underline group-hover:underline-offset-4">Open the run</span>
        </div>
      </Link>
    </Tilt>
  );
}
