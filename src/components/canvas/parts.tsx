"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PersonEvent, Run } from "@/data/types";
import type { ItemInstance, RunState } from "@/lib/player/derive";
import { getChange, getDuty, userById, type PersonaId } from "@/data";
import { useStore } from "@/lib/store";
import { Button, ButtonLink } from "@/components/core/button";
import { Segmented } from "@/components/core/tabs";
import { MonoLabel } from "@/components/core/labels";
import { Initials, AgentTag, hueFor } from "@/components/core/tags";
import { Mark, Square } from "@/components/core/mark";
import { Dialog } from "@/components/core/overlays";
import { CertaintyWord, certaintyFrom } from "@/components/core/status";
import { fmtClock, fmtUsd } from "@/lib/dates";
import type { Speed } from "@/lib/player/engine";

const TICK_COLOR: Record<string, string> = {
  stage: "var(--ink3)",
  check: "var(--ok)",
  person: "var(--person)",
  output: "var(--info)",
};

/** Pause/Play, speed, and a scrubber whose event ticks are coloured by type. */
export function Controls({
  run,
  state,
  playing,
  speed,
  onToggle,
  onSpeed,
  onSeek,
}: {
  run: Run;
  state: RunState;
  playing: boolean;
  speed: Speed;
  onToggle: () => void;
  onSpeed: (s: Speed) => void;
  onSeek: (ms: number) => void;
}) {
  const D = run.duration_ms;
  const ticks = run.events.filter((e) => e.type in TICK_COLOR && !(e.type === "stage" && e.state !== "done"));
  const pct = (t: number) => `${(t / D) * 100}%`;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-5">
      <Button variant="text" size={32} onClick={onToggle} className="w-12 justify-start" aria-keyshortcuts="Space">
        {state.done && !playing ? "Replay" : playing ? "Pause" : "Play"}
      </Button>
      <Segmented<string>
        label="Speed"
        mono
        size={28}
        value={String(speed)}
        onChange={(v) => onSpeed(Number(v) as Speed)}
        options={["0.5", "1", "2", "4"].map((v) => ({ value: v, label: `${v}×` }))}
      />
      <div className="relative h-8 min-w-[160px] flex-1">
        <div className="absolute top-1/2 right-0 left-0 h-px bg-lineStrong" />
        <div className="absolute top-1/2 left-0 h-px bg-ink" style={{ width: pct(state.t) }} />
        {ticks.map((e, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-1/2 block w-px"
            style={{ left: pct(e.t), height: e.type === "person" ? 12 : 7, marginTop: e.type === "person" ? -6 : -3.5, background: TICK_COLOR[e.type] }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={D}
          step={20}
          value={state.t}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Seek"
          aria-valuetext={`${fmtClock(state.t)} of ${fmtClock(D)}`}
          className="scrub absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
        />
      </div>
      <span className="t-data shrink-0 text-[12px] text-ink2">
        <span className="text-ink">{fmtClock(state.t)}</span> / {fmtClock(D)}
      </span>
    </div>
  );
}

/** The docked bar while the flow waits for a person. Offers a one-click switch if the persona is wrong. */
export function PersonBar({
  run,
  pending,
  onRespond,
}: {
  run: Run;
  pending: PersonEvent & { key: string };
  onRespond: (actionId: string) => void;
}) {
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const needed = pending.waiting_for;
  const who = userById(needed);
  const me = userById(persona);
  const right = persona === needed;
  const [review, setReview] = useState(false);
  const primary = pending.actions[0];
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      role="region"
      aria-label="A person decides"
      className="no-print fixed bottom-[104px] left-1/2 z-40 w-[min(820px,calc(100vw-40px))] -translate-x-1/2 rounded-[4px] border border-ink bg-surface shadow-(--overlay-shadow)"
    >
      <div className="flex items-center gap-4 px-5 py-4 max-md:flex-col max-md:items-start">
        <span className="relative ring-wait shrink-0 rounded-full">
          <Initials initials={who?.initials ?? "?"} size={32} filled />
        </span>
        <div className="min-w-0 flex-1">
          <MonoLabel variant="plain">Waiting for {who?.name}</MonoLabel>
          <div className="mt-0.5 text-[15px] leading-[22px] text-ink">{pending.prompt}</div>
          {!right ? (
            <div className="mt-1 text-[13px] leading-5 text-ink2">
              This needs {who?.name}, {who?.role}. You are viewing as {me?.name}.
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {right ? (
            <>
              {pending.actions.slice(1).map((a) => (
                <Button key={a.id} size={40} variant="quiet" onClick={() => (a.id === "review" ? setReview(true) : onRespond(a.id))}>
                  {a.label}
                </Button>
              ))}
              <Button size={40} variant="primary" onClick={() => onRespond(primary.id)} autoFocus>
                {primary.label}
              </Button>
            </>
          ) : (
            <Button size={40} variant="highlight" onClick={() => setPersona(needed as PersonaId)} autoFocus>
              Continue as {who?.name}
            </Button>
          )}
        </div>
      </div>
      {review ? <ReviewDialog run={run} pending={pending} onClose={() => setReview(false)} onAccept={() => onRespond(primary.id)} /> : null}
    </motion.div>
  );
}

function ReviewDialog({ pending, onClose, onAccept }: { run: Run; pending: PersonEvent; onClose: () => void; onAccept: () => void }) {
  const items = pending.items ?? [];
  const [excluded, setExcluded] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((id) => [id, getDuty(id)?.applicability === "excluded"])));
  const nIn = items.filter((i) => !excluded[i]).length;
  const nOut = items.length - nIn;
  const matches = nIn === 6 && nOut === 1;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Review the duties one by one"
      className="w-[min(640px,calc(100vw-40px))]"
      footer={
        <>
          <Button size={32} onClick={onClose}>
            Back
          </Button>
          <Button
            size={32}
            variant="primary"
            disabled={!matches}
            onClick={() => {
              onAccept();
              onClose();
            }}
          >
            Accept {nIn} duties and exclude {nOut}
          </Button>
        </>
      }
    >
      <ul className="-mx-2 flex flex-col">
        {items.map((id) => {
          const d = getDuty(id);
          const out = excluded[id];
          return (
            <li key={id} className="flex items-start gap-3 border-b border-line px-2 py-3 last:border-b-0">
              <button
                role="checkbox"
                aria-checked={!out}
                onClick={() => setExcluded((e) => ({ ...e, [id]: !e[id] }))}
                className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-[2px] shadow-[inset_0_0_0_1px_var(--ink)]"
              >
                {!out ? <Mark kind="check" size={12} /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <div className={cn("text-[14px] leading-5", out ? "text-ink3 line-through" : "text-ink")}>{d?.plain}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-ink2">
                  <span className="t-data text-[11px]">{d?.citation}</span>
                  <CertaintyWord value={certaintyFrom(d?.confidence)} quiet />
                  {d?.applicability === "excluded" ? <span>{d.applicability_reason}</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!matches ? <p className="mt-3 text-[13px] text-ink2">In this prototype, the script continues with 6 accepted and the prepaid duty excluded.</p> : null}
    </Dialog>
  );
}

/** Expand a stage in place: sub-steps, the items it holds, inputs and outputs, time and cost. */
export function ExpandedStage({
  run,
  state,
  stageKey,
  onClose,
  onSwitch,
  onSelectItem,
  onTrace,
}: {
  run: Run;
  state: RunState;
  stageKey: string;
  onClose: () => void;
  onSwitch: (k: string) => void;
  onSelectItem: (it: ItemInstance) => void;
  onTrace: (id: string | null) => void;
}) {
  const stage = run.stages.find((s) => s.key === stageKey)!;
  const s = state.stages[stageKey];
  const held = state.items.filter((i) => i.to === stageKey);
  const latest = new Map<string, ItemInstance>();
  for (const i of held) latest.set(i.id, i);
  const list = [...latest.values()];
  const inputs = Array.from(new Set(run.events.filter((e) => e.type === "item" && e.to === stageKey).map((e) => (e.type === "item" ? e.from : ""))));
  const outputs = Array.from(new Set(run.events.filter((e) => e.type === "item" && e.from === stageKey).map((e) => (e.type === "item" ? e.to : ""))));
  const label = (k: string) => run.stages.find((x) => x.key === k)?.title ?? run.sources.find((x) => x.id === k)?.label ?? trayLabel(k);
  const costAt = (t: number) => run.events.filter((e) => e.type === "metric" && e.key === "cost_usd" && e.t <= t).reduce((_, e) => (e.type === "metric" ? e.value : 0), 0);
  const elapsed = s.startedAt !== undefined ? (s.doneAt ?? state.t) - s.startedAt : 0;
  const cost = s.startedAt !== undefined ? costAt(s.doneAt ?? state.t) - costAt(s.startedAt - 1) : 0;
  const substeps = SUBSTEPS[stageKey] ?? stage.agents;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 flex flex-col"
    >
      {/* the other stages compress to labelled chips */}
      <div className="flex flex-wrap gap-1.5 pb-4">
        {run.stages.map((x) => {
          const st = state.stages[x.key].state;
          return (
            <motion.button
              layout
              key={x.key}
              onClick={() => onSwitch(x.key)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[2px] px-2.5 text-[12px]",
                x.key === stageKey ? "bg-ink text-surface" : "bg-surface text-ink2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink",
              )}
            >
              <Square size={5} filled={st !== "waiting"} color={x.key === stageKey ? "var(--surface)" : st === "running" ? "var(--ink)" : "var(--ink3)"} />
              {x.title}
            </motion.button>
          );
        })}
        <button onClick={onClose} className="ml-auto flex h-7 items-center gap-1.5 px-2 text-[12px] text-ink2 hover:text-ink" aria-keyshortcuts="Escape">
          <Mark kind="close" size={12} /> Collapse
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto rounded-[2px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--ink)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <MonoLabel>{stage.kind === "gate" ? "Verifier gate" : stage.kind === "person" ? "A person decides" : stage.kind === "code" ? "Code step" : "Agent step"}</MonoLabel>
            <h3 className="t-page mt-1">{stage.title}</h3>
            <p className="mt-1 text-ink2">{s.detail ?? (s.state === "waiting" ? "Not started yet." : "Running now.")}</p>
          </div>
          <div className="t-label flex gap-6 text-ink2">
            <span>
              time <span className="text-ink">{fmtClock(elapsed)}</span>
            </span>
            <span>
              cost <span className="text-ink">{fmtUsd(cost)}</span>
            </span>
            <span>
              items <span className="text-ink">{list.length}</span>
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-6">
            <div>
              <MonoLabel>Sub-steps</MonoLabel>
              <ol className="mt-2 flex flex-col">
                {substeps.map((a, i) => (
                  <li key={a + i} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                    <span className="t-data w-5 text-[11px] text-ink3">{String(i + 1).padStart(2, "0")}</span>
                    {a.startsWith("person:") || a.includes(":") === false ? <AgentTag id={a} /> : null}
                  </li>
                ))}
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <MonoLabel>Inputs</MonoLabel>
                <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink">
                  {(inputs.length ? inputs : ["The previous stage"]).map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <Square size={5} color="var(--ink3)" />
                      {label(k)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <MonoLabel>Outputs</MonoLabel>
                <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink">
                  {(outputs.length ? outputs : [run.stages[run.stages.indexOf(stage) + 1]?.key ?? "record"]).map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <Square size={5} color="var(--ink)" />
                      {label(k)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div>
            <MonoLabel>What it holds · {list.length}</MonoLabel>
            {list.length === 0 ? <p className="mt-2 text-[13px] text-ink3">Nothing yet.</p> : null}
            <ul className="mt-2 flex flex-col">
              {list.map((it) => {
                const mine = state.checks.filter((x) => x.item_ref === it.id);
                const c = mine.filter((x) => x.gate === "RC-04" || /^D\d$/.test(x.gate)).pop() ?? mine.pop();
                return (
                  <li key={it.key}>
                    <button
                      onClick={() => onSelectItem(it)}
                      onMouseEnter={() => onTrace(it.id)}
                      onMouseLeave={() => onTrace(null)}
                      className="group flex w-full items-center gap-3 border-b border-line py-2 text-left hover:bg-surface2"
                    >
                      <Square size={6} color={it.changed ? "var(--highlight)" : hueFor(it.agentId ?? "")} style={it.changed ? { boxShadow: "inset 0 0 0 1px var(--ink)" } : undefined} />
                      <span className="t-data w-[150px] shrink-0 truncate text-[11.5px] text-ink2">{it.id}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{it.label}</span>
                      <span className="shrink-0 text-[12px] text-ink2">
                        {c ? (c.result === "pass" ? "verified" : c.gate === "RC-12" ? "drift found" : c.result === "block" ? "held back" : "can't tell") : it.changed ? "changed" : it.inFlight ? "arriving" : "here"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const SUBSTEPS: Record<string, string[]> = {
  duties: ["RC-03", "QC-01", "RC-04"],
  checks: ["QC-01", "RC-04"],
  coverage: ["RC-11", "RC-12"],
  touches: ["RC-14", "RC-13"],
};

function trayLabel(k: string) {
  return (
    {
      held: "Held back",
      covered: "Covered",
      not_yet_confirmed: "Not yet confirmed",
      nothing_behind: "Nothing behind it",
      out: "What it touches",
      tprm: "Third party risk",
      assurance: "Assurance",
    } as Record<string, string>
  )[k] ?? k;
}

/** The done state: a summary panel slides up with the one primary action. */
export function DoneSummary({ run, state, from }: { run: Run; state: RunState; from: string }) {
  const change = getChange(run.change_id);
  const after = change?.after_run?.counts;
  const action =
    run.id === "run-rule-1005"
      ? { label: "Open what's left", href: `/rules/${run.change_id}/?step=whats_left` }
      : run.id === "run-design-mfa"
        ? { label: "Open the change", href: `/rules/${run.change_id}/` }
        : { label: "Back to the change room", href: `/rules/${run.change_id}/` };
  return (
    <AnimatePresence>
      {state.done ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
          className="no-print fixed right-0 bottom-0 left-0 z-30 border-t border-ink bg-surface"
        >
          <div className="flex min-h-[88px] items-center gap-6 px-8 py-4 max-md:flex-col max-md:items-start max-md:px-5">
            <div className="min-w-0 flex-1">
              <MonoLabel variant="plain">
                Done · {fmtClock(run.duration_ms)}
                {state.metrics.cost_usd !== undefined ? ` · ${fmtUsd(state.metrics.cost_usd)}` : ""}
              </MonoLabel>
              <div className="mt-0.5 text-[15px] leading-[22px]">{state.narration?.text}</div>
              {after ? (
                <div className="mt-1 text-[13px] text-ink2">
                  {after.covered} covered · {after.not_yet_confirmed} not yet confirmed · {after.nothing_behind} nothing behind it · {after.known_gap} known gaps
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <ButtonLink href={from} variant="quiet" size={40}>
                Close
              </ButtonLink>
              <ButtonLink href={action.href} variant="primary" size={40}>
                {action.label}
              </ButtonLink>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
