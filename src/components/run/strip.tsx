"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRunPlayer } from "@/lib/player/use-run-player";
import type { Instance } from "@/lib/player/engine";
import { stepTitle } from "@/lib/run-steps";
import { Typed } from "@/components/core/typed";

/**
 * The run in one line: its plain steps as a track, the step running now, and the sentence it is on.
 * Shares the clock of the run view when given the same key.
 */
export function RunStrip({ runId, instanceKey, href, className, init }: { runId: string; instanceKey?: string; href?: string; className?: string; init?: Partial<Instance> }) {
  const { run, state, instance } = useRunPlayer(runId, { key: instanceKey ?? runId, init });
  if (!run || !state) return null;
  const clock = Boolean(instance?.playing) && !state.pending && !state.done;
  const current = run.stages.find((s) => state.stages[s.key].state === "running" || state.stages[s.key].state === "waiting_person");
  return (
    <div className={cn("flex flex-col gap-3 rounded-[14px] border border-line bg-surface px-5 py-4 shadow-(--shadow-rest)", className)}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-medium">
          {state.done ? "Done" : state.pending ? "Waiting for you" : current ? stepTitle(run, current.key) : "Starting"}
        </span>
        {href ? (
          <Link href={href} className="shrink-0 text-[13px] font-medium underline underline-offset-4">
            {state.pending ? "Decide" : "Open the run"}
          </Link>
        ) : null}
      </div>
      <ol className="flex gap-1" aria-label="Steps">
        {run.stages.map((s) => {
          const v = state.stages[s.key].state;
          return (
            <li
              key={s.key}
              title={stepTitle(run, s.key)}
              className={cn("h-1.5 flex-1 rounded-full", v === "done" ? "bg-ink" : v === "running" ? "breathe bg-ink2" : v === "waiting_person" ? "bg-highlight ring-1 ring-ink" : "bg-surface3")}
            />
          );
        })}
      </ol>
      <span className="truncate text-[13px] text-ink2" aria-live="polite">
        {state.narration ? <Typed key={state.narration.text} text={state.narration.text} elapsed={clock ? state.narration.elapsed : undefined} cps={70} caret="while" /> : null}
      </span>
    </div>
  );
}
