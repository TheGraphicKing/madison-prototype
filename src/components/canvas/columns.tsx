"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { Run } from "@/data/types";
import { agentById, getChange, userById } from "@/data";
import type { RunState } from "@/lib/player/derive";
import { participants, PHASES } from "@/lib/player/derive";
import { Initials, hueFor } from "@/components/core/tags";
import { MonoLabel } from "@/components/core/labels";
import { Square } from "@/components/core/mark";
import { Typed } from "@/components/core/typed";
import { CertaintyWord } from "@/components/core/status";
import { StepChart } from "@/components/core/charts";
import { fmtClock, fmtUsd } from "@/lib/dates";
import { useStore } from "@/lib/store";

/** "/ AGENTS · 9 ON THIS RUN": one row per agent and person, active row in the highlight. */
export const AgentsColumn = forwardRef<HTMLDivElement, { run: Run; state: RunState; rowRef: (id: string, el: HTMLElement | null) => void; onTrace?: (stage: string | null) => void }>(
  function AgentsColumn({ run, state, rowRef, onTrace }, ref) {
    const ids = participants(run);
    const max = Math.max(1, ...ids.map((a) => state.agentActivity[a] ?? 0));
    return (
      <div ref={ref} className="flex flex-col">
        <MonoLabel className="mb-3 block px-1">Agents · {ids.length} on this run</MonoLabel>
        <ul className="flex flex-col gap-1.5">
          {ids.map((id) => {
            const active = state.activeAgents.includes(id);
            const isPerson = id.startsWith("person:");
            const u = isPerson ? userById(id.slice(7)) : null;
            const a = isPerson ? null : agentById(id);
            const n = state.agentActivity[id] ?? 0;
            const bars = n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * 5));
            const stage = run.stages.find((s) => s.agents.includes(id));
            return (
              <li
                key={id}
                ref={(el) => rowRef(id, el)}
                onMouseEnter={() => onTrace?.(stage?.key ?? null)}
                onMouseLeave={() => onTrace?.(null)}
                className={cn(
                  "relative flex h-[46px] items-center gap-2.5 rounded-[10px] px-2.5 transition-[background-color,box-shadow] duration-[180ms]",
                  active ? "bg-highlight text-highlight-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "bg-surface shadow-[inset_0_0_0_1px_var(--line)]",
                )}
              >
                {isPerson ? <Initials initials={u?.initials ?? "?"} size={18} /> : <Square size={7} color={active ? "var(--highlightInk)" : hueFor(id)} />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate text-[13px] leading-[17px] font-medium", active ? "text-highlight-ink" : "text-ink")}>{isPerson ? u?.name : a?.name}</span>
                  <span className={cn("t-data truncate text-[10px] leading-[13px]", active ? "text-highlight-ink" : "text-ink3")}>
                    {isPerson ? u?.role : a?.kind === "code" ? "Automated check" : "Agent"}
                  </span>
                </span>
                <span aria-label={`${n} events`} className="flex h-3 items-end gap-[2px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="block w-[2px]"
                      style={{ height: 4 + i * 2, background: i < bars ? (active ? "var(--highlightInk)" : "var(--ink)") : "var(--lineStrong)" }}
                    />
                  ))}
                </span>
                {active ? <span className="absolute top-1/2 -right-[3px] size-[6px] -translate-y-1/2 bg-ink" aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
);

/** "/ OUTPUTS": result cards that type in, then the step chart of what is covered. */
export function OutputsColumn({
  run,
  state,
  onTrace,
  onSelectOutput,
  clockRunning = true,
}: {
  run: Run;
  state: RunState;
  /** while the clock is stopped (paused, at a person, done) text types on its own */
  clockRunning?: boolean;
  onTrace?: (ids: string[] | null) => void;
  onSelectOutput?: (label: string) => void;
}) {
  const change = getChange(run.change_id);
  const override = useStore((s) => s.changes[run.change_id]);
  const total = change?.after_run?.counts.duties ?? change?.counts?.duties ?? 6;
  const base = change?.counts?.covered ?? 0;
  const pts = [{ x: "start", y: base }, ...state.chart.map((c, i) => ({ x: `${i + 1}`, y: c.value }))];
  void override;
  return (
    <div className="flex flex-col gap-3">
      <MonoLabel className="block">Outputs</MonoLabel>
      {state.outputs.length === 0 ? <p className="text-[13px] leading-5 text-ink3">Results appear here as each stage finishes.</p> : null}
      {state.outputs.map((o) => (
        <button
          key={o.key}
          onMouseEnter={() => onTrace?.(relatedFor(run, o.t))}
          onMouseLeave={() => onTrace?.(null)}
          onFocus={() => onTrace?.(relatedFor(run, o.t))}
          onBlur={() => onTrace?.(null)}
          onClick={() => onSelectOutput?.(o.card.label)}
          className="block w-full rounded-[10px] bg-surface px-3.5 py-2.5 text-left shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--lineStrong)]"
        >
          <MonoLabel className="block text-[9.5px]">{o.card.label}</MonoLabel>
          <Typed text={o.card.value} elapsed={clockRunning ? o.elapsed : undefined} cps={60} caret="while" className="mt-1 block text-[14px] leading-5 text-ink" />
          {o.card.reason && (o.elapsed > 1200 || !clockRunning) ? <span className="mt-1 block text-[12px] leading-[17px] text-ink2">{o.card.reason}</span> : null}
          {o.card.certainty && (o.elapsed > 600 || !clockRunning) ? <CertaintyWord value={o.card.certainty} className="mt-1.5" quiet /> : null}
        </button>
      ))}
      <div className="mt-3 rounded-[10px] bg-surface px-3.5 pt-3 pb-2 shadow-[inset_0_0_0_1px_var(--line)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium">Covered in this change</span>
          <span className="t-data text-[11px] text-ink2">
            {pts[pts.length - 1].y} of {total}
          </span>
        </div>
        <StepChart
          ariaLabel={`Covered in this change: ${pts[pts.length - 1].y} of ${total}`}
          points={pts}
          yMin={0}
          yMax={total}
          slots={total - base + 1}
          width={300}
          height={150}
          compact
          xLabels={false}
          latestLabel="Latest"
          ticks={3}
        />
      </div>
    </div>
  );
}

/** Which items an output card speaks about, for the hover trace. */
export function relatedFor(run: Run, t: number): string[] {
  const out = new Set<string>();
  for (const e of run.events) {
    if (e.t !== t) continue;
    if (e.type === "check") out.add(e.item_ref);
  }
  const person = run.events.filter((e) => e.type === "person" && e.t < t).pop();
  if (person && person.type === "person" && out.size === 0 && t - person.t < 1000) person.items?.forEach((i) => out.add(i));
  if (out.size === 0) {
    for (const e of run.events) if (e.type === "item" && Math.abs(e.t - t) < 2000 && (e.kind === "impact" || e.kind === "draft_part" || e.kind === "handoff")) out.add(e.id);
  }
  return [...out];
}

/** The bottom strip: phases, live metrics, and the narration line (also the aria-live region). */
export function BottomStrip({ run, state, compact, clockRunning = true }: { run: Run; state: RunState; compact?: boolean; clockRunning?: boolean }) {
  const m = state.metrics;
  const metrics: [string, string][] = [];
  if (m.sections !== undefined || run.id === "run-rule-1005") metrics.push(["sections", String(m.sections ?? 0)]);
  if (run.id === "run-rule-1005") {
    metrics.push(["obligations found", String(m.duties_found ?? 0)]);
    metrics.push(["held back", String(m.held_back ?? 0)]);
    metrics.push(["links", String(m.links ?? 0)]);
  } else {
    metrics.push(["items", String(state.items.length)]);
    metrics.push(["checks", String(state.checks.length)]);
  }
  if (m.cost_usd !== undefined) metrics.push(["cost", fmtUsd(m.cost_usd)]);
  metrics.push(["elapsed", fmtClock(state.t)]);
  const usedPhases = PHASES.filter((p) => run.stages.some((s) => phaseFor(run, s.key) === p));
  const cur = usedPhases.indexOf(state.phase);
  return (
    <div className={cn("flex flex-col gap-2", compact && "gap-1")}>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
        <div className="flex items-center" aria-label={`Phase: ${state.phase}`}>
          {usedPhases.map((p, i) => (
            <span key={p} className="flex items-center">
              {i > 0 ? <span className={cn("mx-2 block h-px w-10", i <= cur ? "bg-ink" : "bg-lineStrong")} /> : null}
              <span className="flex items-center gap-1.5">
                <span
                  className="block size-[8px] transition-colors duration-[240ms]"
                  style={{
                    background: i === cur && !state.done ? "var(--highlight)" : i < cur || state.done ? "var(--ink)" : "transparent",
                    boxShadow: "inset 0 0 0 1px var(--ink)",
                  }}
                />
                <span className={cn("text-[13px]", i === cur ? "font-medium text-ink" : "text-ink2")}>{p}</span>
              </span>
            </span>
          ))}
        </div>
        {!compact ? (
          <div className="t-label flex flex-wrap gap-x-4 text-ink2">
            {metrics.map(([k, v], i) => (
              <span key={k}>
                {i > 0 ? <span className="mr-4 text-ink3">·</span> : null}
                {k} <span className="text-ink">{v}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div aria-live="polite" className={cn("min-h-6 text-[15px] leading-6 text-ink", compact && "truncate text-[13px] leading-5")}>
        {state.narration ? <Typed key={state.narration.text} text={state.narration.text} elapsed={clockRunning ? state.narration.elapsed : undefined} cps={70} caret /> : null}
      </div>
    </div>
  );
}

function phaseFor(run: Run, key: string) {
  const idx = run.stages.findIndex((s) => s.key === key);
  const s = run.stages[idx];
  if (s.kind === "gate") return "Check";
  if (s.kind === "person") return "Decide";
  const firstGate = run.stages.findIndex((x) => x.kind === "gate" || x.kind === "person");
  const lastPerson = run.stages.map((x) => x.kind).lastIndexOf("person");
  const hasGate = run.stages.some((x) => x.kind === "gate");
  if (!hasGate && idx === firstGate - 1 && idx > 0) return "Check";
  if (idx < firstGate) return "Read";
  if (lastPerson >= 0 && idx > lastPerson) return "Cover";
  return "Check";
}
