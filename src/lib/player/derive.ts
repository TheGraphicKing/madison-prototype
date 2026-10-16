// The run player's state is a pure function of (run, time, responses).
// Seeking, replay and stepping are exact because nothing here holds state.
import type {
  CheckEvent,
  ItemEvent,
  OutputEvent,
  PersonEvent,
  Run,
  RunEvent,
  StageState,
} from "@/data/types";

/** How long a packet takes to travel one hop at 1x. */
export const HOP_MS = 700;

export type Responses = Record<string, string>; // person event index -> action id

export type Phase = "Read" | "Check" | "Decide" | "Cover";
export const PHASES: Phase[] = ["Read", "Check", "Decide", "Cover"];

export interface ItemInstance {
  key: string; // event index
  id: string;
  kind: string;
  label: string;
  from: string;
  to: string;
  agentId?: string;
  parentRef?: string;
  state?: string;
  coverageState?: string;
  score?: string;
  changed?: boolean;
  t: number;
  /** 0..1 while travelling; 1 once arrived */
  progress: number;
  inFlight: boolean;
}

export interface OutputCard extends Omit<OutputEvent, "type"> {
  key: string;
  elapsed: number;
}

export interface RunState {
  t: number; // effective time, clamped at an unanswered person event
  duration: number;
  stages: Record<string, { state: StageState; detail?: string; startedAt?: number; doneAt?: number }>;
  /** every item event that has started, in order */
  items: ItemInstance[];
  inFlight: ItemInstance[];
  /** where each item id rests now (its latest arrived move) */
  resting: Record<string, ItemInstance>;
  /** items resting per place */
  byPlace: Record<string, ItemInstance[]>;
  checks: (CheckEvent & { key: string })[];
  /** latest check result per gate and item */
  checkFor: Record<string, CheckEvent>;
  outputs: OutputCard[];
  metrics: Record<string, number>;
  chart: { t: number; value: number }[];
  narration: { text: string; elapsed: number } | null;
  pending: (PersonEvent & { key: string }) | null;
  responded: { key: string; event: PersonEvent; actionId: string }[];
  phase: Phase;
  /** event counts per agent id, for the activity meters */
  agentActivity: Record<string, number>;
  activeAgents: string[];
  done: boolean;
  /** the event index the clock is at (last event with t <= effective t) */
  cursor: number;
}

export function personEvents(run: Run) {
  return run.events
    .map((e, i) => ({ e, i }))
    .filter((x): x is { e: PersonEvent; i: number } => x.e.type === "person");
}

/** The time the clock may not pass: the first person event without a response. */
export function blockingTime(run: Run, responses: Responses): number {
  for (const { e, i } of personEvents(run)) {
    if (!responses[String(i)]) return e.t;
  }
  return Infinity;
}

export function clampTime(run: Run, t: number, responses: Responses) {
  return Math.max(0, Math.min(t, blockingTime(run, responses), run.duration_ms));
}

/** Which phase a stage belongs to: before the gate, Read; the gate, Check; people, Decide; after them, Cover. */
export function phaseOfStage(run: Run, key: string): Phase {
  const idx = run.stages.findIndex((s) => s.key === key);
  const stage = run.stages[idx];
  if (!stage) return "Read";
  if (stage.kind === "gate") return "Check";
  if (stage.kind === "person") return "Decide";
  const firstGate = run.stages.findIndex((s) => s.kind === "gate" || s.kind === "person");
  const lastPerson = run.stages.map((s) => s.kind).lastIndexOf("person");
  if (firstGate >= 0 && idx < firstGate) return "Read";
  if (lastPerson >= 0 && idx > lastPerson) return "Cover";
  return "Check";
}

export function derive(run: Run, rawT: number, responses: Responses, opts: { hop?: number } = {}): RunState {
  const hop = opts.hop ?? HOP_MS;
  const t = clampTime(run, rawT, responses);
  const block = blockingTime(run, responses);

  const stages: RunState["stages"] = {};
  for (const s of run.stages) stages[s.key] = { state: "waiting" };
  const items: ItemInstance[] = [];
  const checks: RunState["checks"] = [];
  const checkFor: RunState["checkFor"] = {};
  const outputs: OutputCard[] = [];
  const metrics: Record<string, number> = {};
  const chart: RunState["chart"] = [];
  let narration: RunState["narration"] = null;
  let pending: RunState["pending"] = null;
  const responded: RunState["responded"] = [];
  const agentActivity: Record<string, number> = {};
  let cursor = -1;

  const bump = (id?: string) => {
    if (!id) return;
    agentActivity[id] = (agentActivity[id] ?? 0) + 1;
  };

  run.events.forEach((ev: RunEvent, i) => {
    if (ev.t > t) return;
    // events at the same time as an unanswered person event, but after it, wait too
    if (ev.t === block && ev.type !== "person" && ev.t > 0) {
      const pIdx = personEvents(run).find((p) => !responses[String(p.i)])?.i ?? Infinity;
      if (i > pIdx) return;
    }
    cursor = i;
    const key = String(i);
    switch (ev.type) {
      case "stage": {
        const prev = stages[ev.stage] ?? { state: "waiting" };
        stages[ev.stage] = {
          state: ev.state,
          detail: ev.detail ?? prev.detail,
          startedAt: ev.state === "running" || ev.state === "waiting_person" ? ev.t : prev.startedAt,
          doneAt: ev.state === "done" ? ev.t : prev.doneAt,
        };
        break;
      }
      case "item": {
        const it = ev as ItemEvent;
        const progress = hop <= 0 ? 1 : Math.min(1, (t - it.t) / hop);
        items.push({
          key,
          id: it.id,
          kind: it.kind,
          label: it.label,
          from: it.from,
          to: it.to,
          agentId: it.agent_id,
          parentRef: it.parent_ref,
          state: it.state,
          coverageState: it.coverage_state,
          score: it.score,
          changed: it.changed,
          t: it.t,
          progress,
          inFlight: progress < 1,
        });
        bump(it.agent_id);
        break;
      }
      case "check":
        checks.push({ ...ev, key });
        checkFor[`${ev.gate}|${ev.item_ref}`] = ev;
        bump(ev.gate);
        break;
      case "output":
        outputs.push({ key, t: ev.t, card: ev.card, elapsed: t - ev.t });
        break;
      case "metric":
        metrics[ev.key] = ev.value;
        break;
      case "chart":
        chart.push({ t: ev.t, value: ev.value });
        break;
      case "narrate":
        narration = { text: ev.text, elapsed: t - ev.t };
        break;
      case "person": {
        const a = responses[key];
        if (a) responded.push({ key, event: ev, actionId: a });
        else pending = { ...ev, key };
        break;
      }
    }
  });

  // the person stage sits in "waiting_person" while pending; the narration explains it
  const resting: Record<string, ItemInstance> = {};
  for (const it of items) {
    if (!it.inFlight) resting[it.id] = it;
    else if (resting[it.id] && resting[it.id].t < it.t) delete resting[it.id];
  }
  const byPlace: Record<string, ItemInstance[]> = {};
  for (const it of Object.values(resting)) (byPlace[it.to] ??= []).push(it);

  const running = run.stages.filter((s) => stages[s.key].state === "running" || stages[s.key].state === "waiting_person");
  const lastActive =
    running[running.length - 1] ??
    [...run.stages].reverse().find((s) => stages[s.key].state === "done") ??
    run.stages[0];
  const done = t >= run.duration_ms && !pending;
  const activeAgents = done ? [] : running.flatMap((s) => s.agents);

  // bump stage agents once per stage event so code steps also register activity
  for (const s of run.stages) {
    if (stages[s.key].state !== "waiting") for (const a of s.agents) agentActivity[a] = (agentActivity[a] ?? 0) + 1;
  }

  return {
    t,
    duration: run.duration_ms,
    stages,
    items,
    inFlight: items.filter((i) => i.inFlight),
    resting,
    byPlace,
    checks,
    checkFor,
    outputs,
    metrics,
    chart,
    narration,
    pending,
    responded,
    phase: done ? "Cover" : phaseOfStage(run, lastActive.key),
    agentActivity,
    activeAgents,
    done,
    cursor,
  };
}

/** Distinct event times, for stepping. */
export function eventTimes(run: Run): number[] {
  return Array.from(new Set(run.events.map((e) => e.t))).sort((a, b) => a - b);
}

export function nextTime(run: Run, t: number) {
  return eventTimes(run).find((x) => x > t + 1) ?? run.duration_ms;
}

export function prevTime(run: Run, t: number) {
  const ts = eventTimes(run).filter((x) => x < t - 1);
  return ts.length ? ts[ts.length - 1] : 0;
}

/** Every agent and person on the run, in stage order. */
export function participants(run: Run): string[] {
  const out: string[] = [];
  for (const s of run.stages) for (const a of s.agents) if (!out.includes(a)) out.push(a);
  return out;
}

/** Entries the run writes to the record: every stage result, check, person decision and output. */
export function recordEntryCount(run: Run): number {
  return run.events.filter(
    (e) => (e.type === "stage" && e.state === "done") || e.type === "check" || e.type === "person",
  ).length;
}
