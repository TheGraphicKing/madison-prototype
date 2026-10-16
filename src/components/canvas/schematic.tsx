"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ItemEvent, Run } from "@/data/types";
import type { ItemInstance, RunState } from "@/lib/player/derive";
import { Packet } from "@/components/core/packet";
import { Bracket } from "@/components/core/bracket";
import { Mark, Square } from "@/components/core/mark";
import { AgentTag, Initials, hueFor } from "@/components/core/tags";
import { MonoLabel } from "@/components/core/labels";
import { STATE_COLOR } from "@/components/core/status";
import { userById, vendorById } from "@/data";
import { CertaintyWord } from "@/components/core/status";
import { BorderTrail } from "@/components/motion-primitives/border-trail";
import { W, pathFor, type Layout, type NodeGeo, type TrayGeo } from "./layout";
import type { Lineage } from "./lineage";

export type Selection = { kind: "item"; item: ItemInstance } | { kind: "stage"; key: string };

export interface SchematicProps {
  run: Run;
  state: RunState;
  layout: Layout;
  trace: Lineage | null;
  onTrace?: (id: string | string[] | null) => void;
  onSelect?: (s: Selection) => void;
  onExpand?: (key: string) => void;
  build?: boolean;
  compact?: boolean;
  expanded?: string | null;
}

/** "M x y ... x y" -> start and end points of a path, for ports. */
function ends(d: string): [[number, number], [number, number]] {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return [
    [nums[0], nums[1]],
    [nums[nums.length - 2], nums[nums.length - 1]],
  ];
}

const placeOfStage = (run: Run, key: string) => run.stages.find((s) => s.key === key);

export const Schematic = memo(function Schematic({
  run,
  state,
  layout,
  trace,
  onTrace,
  onSelect,
  onExpand,
  build,
  compact,
  expanded,
}: SchematicProps) {
  const { nodes, sources, trays } = layout;
  const order = run.stages.map((s) => s.key);
  const buildDelay = (i: number) => (build ? { animationDelay: `${i * 80}ms` } : { animation: "none" });

  // every distinct move in the script, so packets never fly over empty space
  const moves = useMemo(() => {
    const m = new Map<string, { from: string; to: string; d: string }>();
    for (const e of run.events) {
      if (e.type !== "item") continue;
      const it = e as ItemEvent;
      const k = `${it.from}>${it.to}`;
      if (!m.has(k)) m.set(k, { from: it.from, to: it.to, d: pathFor(layout, it.from, it.to) });
    }
    return m;
  }, [run, layout]);

  const chainKeys = new Set(layout.chain.map((c) => `${c.from}>${c.to}`));
  const srcKeys = new Set(layout.sourceLinks.map((l) => `${l.source}>${l.stage}`));
  const extra = [...moves.entries()].filter(([k]) => !chainKeys.has(k) && !srcKeys.has(k));

  const dim = (on: boolean) => (trace && !on ? 0.25 : 1);
  const stageLit = (k: string) => !trace || trace.stages.has(k);
  const moveLit = (k: string) => Boolean(trace?.moves.has(k));

  const allPaths = [...layout.chain.map((c) => c.d), ...layout.sourceLinks.map((l) => l.d), ...extra.map(([, v]) => v.d)];
  const portPts = new Map<string, [number, number]>();
  for (const d of allPaths) for (const p of ends(d)) portPts.set(`${Math.round(p[0])},${Math.round(p[1])}`, p);

  const stageDone = (k: string) => state.stages[k]?.state === "done";
  const activeEdge = (from: string) => stageDone(from) || state.stages[from]?.state === "running";

  return (
    <div className="relative select-none" style={{ width: W, height: layout.H }}>
      <svg width={W} height={layout.H} className="absolute inset-0 overflow-visible" aria-hidden>
        <defs>
          <pattern id={`dots-${run.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1" height="1" fill="var(--lineStrong)" opacity="0.55" />
          </pattern>
        </defs>
        {!compact ? <rect x={-20} y={0} width={W + 40} height={layout.H} fill={`url(#dots-${run.id})`} /> : null}

        {/* source links */}
        {layout.sourceLinks.map((l, i) => {
          const k = `${l.source}>${l.stage}`;
          const flowing = state.inFlight.some((it) => it.from === l.source);
          return (
            <path
              key={k + i}
              d={l.d}
              pathLength={1}
              fill="none"
              stroke={moveLit(k) ? "var(--ink)" : flowing ? "var(--ink2)" : "var(--line)"}
              strokeWidth={moveLit(k) ? 1.5 : 1}
              className={build ? "build-draw" : undefined}
              style={{ ...buildDelay(4 + i), opacity: dim(moveLit(k) || stageLit(l.stage)) }}
            />
          );
        })}

        {/* the stage chain */}
        {layout.chain.map((c, i) => {
          const k = `${c.from}>${c.to}`;
          const lit = moveLit(k);
          return (
            <path
              key={k}
              d={c.d}
              pathLength={1}
              fill="none"
              stroke={lit ? "var(--ink)" : activeEdge(c.from) ? "var(--lineStrong)" : "var(--line)"}
              strokeWidth={lit ? 1.5 : 1}
              className={build ? "build-draw" : undefined}
              style={{ ...buildDelay(3 + i), opacity: dim(lit || (stageLit(c.from) && stageLit(c.to))) }}
            />
          );
        })}

        {/* other moves: hops over a stage, drops into trays */}
        {extra.map(([k, v], i) => (
          <path
            key={k}
            d={v.d}
            pathLength={1}
            fill="none"
            stroke={moveLit(k) ? "var(--ink)" : activeEdge(v.from) ? "var(--lineStrong)" : "var(--line)"}
            strokeWidth={moveLit(k) ? 1.5 : 1}
            className={build && !trays[v.to] ? "build-draw" : undefined}
            style={{ ...buildDelay(6 + i), opacity: dim(moveLit(k)), strokeDasharray: trays[v.to] && !moveLit(k) ? "2 3" : undefined }}
          />
        ))}

        {/* D6 asks the owner */}
        {layout.ownerLine ? <OwnerLine layout={layout} state={state} /> : null}

        {/* write-back arc */}
        {state.done && !compact ? <WriteBack layout={layout} entries={state.checks.length + state.responded.length + Object.values(state.stages).filter((s) => s.state === "done").length} run={run} /> : null}

        {/* ports */}
        {[...portPts.values()].map(([x, y], i) => (
          <rect
            key={`p${i}`}
            x={x - 3}
            y={y - 3}
            width={6}
            height={6}
            fill="var(--surface)"
            stroke="var(--ink)"
            strokeWidth={1}
            className={build ? "build-pop" : undefined}
            style={build ? { animationDelay: `${900 + (i % 10) * 20}ms` } : undefined}
            opacity={trace ? 0.4 : 1}
          />
        ))}

        {/* packets */}
        {state.inFlight.map((it) => {
          const k = `${it.from}>${it.to}`;
          const d = moves.get(k)?.d ?? pathFor(layout, it.from, it.to);
          const toStage = placeOfStage(run, it.to);
          const color =
            toStage?.kind === "person" ? "var(--highlight)" : it.to === "held" ? "var(--risk)" : it.agentId ? hueFor(it.agentId) : "var(--ink)";
          const lit = Boolean(trace?.ids.has(it.id));
          return (
            <Packet
              key={it.key}
              d={d}
              progress={easeInOut(it.progress)}
              color={color}
              label={it.label}
              dim={Boolean(trace) && !lit}
              emphasis={lit}
              onHover={onTrace ? (on) => onTrace(on ? it.id : null) : undefined}
            />
          );
        })}
      </svg>

      {/* sources */}
      {run.sources.map((s, i) => {
        const b = sources[s.id];
        const flowing = state.inFlight.some((it) => it.from === s.id);
        const lit = !trace || [...trace.moves].some((m) => m.startsWith(`${s.id}>`));
        return (
          <div
            key={s.id}
            className={cn("absolute flex flex-col justify-center rounded-[2px] bg-surface px-2.5 shadow-[inset_0_0_0_1px_var(--line)]", build && "build-node")}
            style={{ left: b.x, top: b.y, width: b.w, height: b.h, opacity: dim(lit), ...(build ? { animationDelay: `${i * 50}ms` } : {}) }}
          >
            <span className="flex items-center gap-1.5 text-[12px] leading-4 text-ink">
              {flowing ? <Square size={5} color="var(--highlight)" style={{ boxShadow: "0 0 0 1px var(--ink)" }} /> : null}
              {s.label}
            </span>
            <span className="t-label truncate text-[8.5px] leading-3">{s.detail}</span>
          </div>
        );
      })}

      {/* the record: where the write-back lands */}
      {!compact ? (
        <div
          className={cn("absolute flex flex-col justify-center rounded-[2px] px-2.5", build && "build-node")}
          style={{
            left: layout.record.x,
            top: layout.record.y,
            width: layout.record.w,
            height: layout.record.h,
            background: state.done ? "var(--ink)" : "var(--surface)",
            boxShadow: "inset 0 0 0 1px var(--ink)",
            color: state.done ? "var(--surface)" : "var(--ink)",
            opacity: trace ? 0.4 : 1,
          }}
        >
          <span className="text-[12px] leading-4">The record</span>
          <span className="t-label text-[8.5px] leading-3" style={{ color: "inherit", opacity: 0.7 }}>
            every step
          </span>
        </div>
      ) : null}

      {/* stage nodes */}
      {run.stages.map((st, i) => {
        const g = nodes[st.key];
        return (
          <StageNode
            key={st.key}
            run={run}
            stageKey={st.key}
            g={g}
            state={state}
            trace={trace}
            onTrace={onTrace}
            onSelect={onSelect}
            onExpand={onExpand}
            buildStyle={build ? { animationDelay: `${order.indexOf(st.key) * 90}ms` } : undefined}
            build={build}
            compact={compact}
            dimmed={Boolean(trace) && !stageLit(st.key)}
            expanded={expanded === st.key}
            index={i}
          />
        );
      })}

      {/* trays */}
      {Object.values(trays).map((t) => (
        <Tray key={t.key} tray={t} state={state} run={run} trace={trace} onTrace={onTrace} onSelect={onSelect} compact={compact} build={build} />
      ))}
    </div>
  );
});

function easeInOut(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function OwnerLine({ layout, state }: { layout: Layout; state: RunState }) {
  const l = layout.ownerLine!;
  const d6 = state.checkFor["D6|CTL-153"];
  if (!d6) return null;
  const asking = d6.result === "cannot_tell";
  const [x1, y1] = l.from;
  const [x2, y2] = l.to;
  const d = `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2} ${y2 - 60}, ${x2} ${y2}`;
  return (
    <g>
      <path d={d} fill="none" stroke={asking ? "var(--ink)" : "var(--lineStrong)"} strokeWidth={1} strokeDasharray="3 3" />
      {asking ? (
        <text x={(x1 + x2) / 2 + 30} y={(y1 + y2) / 2 - 4} className="fill-ink font-mono text-[9.5px] tracking-[0.12em] uppercase">
          / asks the owner
        </text>
      ) : null}
    </g>
  );
}

function WriteBack({ layout, entries, run }: { layout: Layout; entries: number; run: Run }) {
  const { d, labelAt, vertical } = layout.writeBack;
  return (
    <a href={`/record/?run=${run.id}`} aria-label={`Written to the record, ${entries} entries. Open the record.`} style={{ pointerEvents: "auto" }}>
      <path d={d} pathLength={1} fill="none" stroke="var(--ink)" strokeWidth={1} className="build-draw" style={{ animationDuration: "1100ms" }} />
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: "pointer" }} />
      <text
        x={labelAt[0]}
        y={labelAt[1]}
        transform={vertical ? `rotate(-90 ${labelAt[0]} ${labelAt[1]})` : undefined}
        className="fill-ink font-mono text-[10px] font-medium tracking-[0.14em] uppercase build-node"
        style={{ animationDelay: "700ms" }}
      >
        / written to the record · {entries} entries
      </text>
    </a>
  );
}

function StageNode({
  run,
  stageKey,
  g,
  state,
  trace,
  onTrace,
  onSelect,
  onExpand,
  buildStyle,
  build,
  compact,
  dimmed,
  expanded,
}: {
  run: Run;
  stageKey: string;
  g: NodeGeo;
  state: RunState;
  trace: Lineage | null;
  onTrace?: (id: string | string[] | null) => void;
  onSelect?: (s: Selection) => void;
  onExpand?: (key: string) => void;
  buildStyle?: React.CSSProperties;
  build?: boolean;
  compact?: boolean;
  dimmed: boolean;
  expanded: boolean;
  index: number;
}) {
  const stage = run.stages.find((s) => s.key === stageKey)!;
  const s = state.stages[stageKey];
  const running = s.state === "running";
  const waitingPerson = s.state === "waiting_person";
  const done = s.state === "done";
  const waiting = s.state === "waiting";
  const hue = hueFor(stage.agents[0]);
  const holding = (state.byPlace[stageKey] ?? []).sort((a, b) => a.t - b.t);
  const isPerson = stage.kind === "person";
  const isGate = stage.kind === "gate";
  const personId = isPerson ? stage.agents[0].slice(7) : null;

  const subtitle = (() => {
    if (done && s.detail) return s.detail;
    if (waitingPerson && personId) return `Waiting for ${userById(personId)?.name}`;
    if (running) {
      if (holding.length) return `${holding.length} ${holding[0].kind === "section" ? "sections" : holding[0].kind === "duty" ? "proposed" : holding[0].kind === "link" ? "links" : holding[0].kind === "candidate" ? "candidates" : "items"} so far`;
      return "Running";
    }
    return "Waiting";
  })();

  const frameColor = isPerson ? "var(--person)" : running || waitingPerson || done ? "var(--ink)" : "var(--lineStrong)";

  return (
    <Bracket
      as="div"
      className={cn(
        "absolute flex flex-col px-3.5 pt-3 pb-2.5 transition-[opacity,background-color] duration-[240ms]",
        build && "build-node",
        !compact && "cursor-pointer",
        expanded && "outline outline-1 outline-ink",
      )}
      color={frameColor}
      style={{
        left: g.x,
        top: g.y,
        width: g.w,
        height: g.h,
        background: "var(--surface)",
        boxShadow: done ? "inset 0 0 0 1px var(--line)" : undefined,
        opacity: dimmed ? 0.25 : 1,
        ...buildStyle,
      }}
      onClick={compact ? undefined : () => onExpand?.(stageKey)}
      role={compact ? undefined : "button"}
      tabIndex={compact ? -1 : 0}
      aria-label={`${stage.title}. ${subtitle}. Open this stage.`}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!compact && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onExpand?.(stageKey);
        }
      }}
    >
      {running && !compact ? <BorderTrail size={5} className="bg-(--trail)" style={{ ["--trail" as string]: hue }} /> : null}
      {isGate ? <GateFill run={run} state={state} /> : null}
      <div className="relative flex items-start gap-2">
        {isPerson ? (
          <span className={cn("relative mt-[-2px] shrink-0", waitingPerson && "ring-wait")} style={{ borderRadius: 9999 }}>
            <Initials initials={userById(personId!)?.initials ?? "?"} size={28} filled={done} />
          </span>
        ) : (
          <Square
            size={7}
            className="mt-[6px]"
            filled={!waiting}
            color={running ? "var(--highlight)" : done ? hue : "var(--ink3)"}
            style={running ? { boxShadow: "0 0 0 1px var(--ink)" } : undefined}
          />
        )}
        <div className="min-w-0">
          <div className={cn("text-[14.5px] leading-[19px] font-medium", waiting ? "text-ink2" : "text-ink")}>{stage.title}</div>
          <div className={cn("t-label mt-1 line-clamp-2 text-[10px] leading-[13px] tracking-[0.1em]", running && "breathe text-ink2")}>/ {subtitle}</div>
        </div>
      </div>
      {isGate && run.id === "run-design-mfa" ? <DesignCells state={state} /> : null}
      {isGate && run.id !== "run-design-mfa" ? <GateBody run={run} state={state} /> : null}
      <div className="relative mt-auto flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          {!isPerson
            ? stage.agents.slice(0, 2).map((a) => <AgentTag key={a} id={a} short showId={!(holding.length && !isGate)} className="[&>span:nth-child(2)]:text-[11px]" />)
            : <span className="text-[11.5px] leading-4 text-ink2">{userById(personId!)?.name}</span>}
        </div>
        {holding.length && !isGate ? (
          <div className="flex max-w-[86px] flex-wrap justify-end gap-[3px]">
            {holding.slice(0, 18).map((it) => (
              <ItemSquare key={it.key} it={it} trace={trace} onTrace={onTrace} onSelect={onSelect} compact={compact} highlight={isPerson && waitingPerson} />
            ))}
          </div>
        ) : null}
      </div>
    </Bracket>
  );
}

function ItemSquare({
  it,
  trace,
  onTrace,
  onSelect,
  compact,
  highlight,
}: {
  it: ItemInstance;
  trace: Lineage | null;
  onTrace?: (id: string | string[] | null) => void;
  onSelect?: (s: Selection) => void;
  compact?: boolean;
  highlight?: boolean;
}) {
  const lit = trace?.ids.has(it.id);
  const fill = highlight ? "var(--highlight)" : it.changed ? "var(--highlight)" : it.agentId ? hueFor(it.agentId) : "var(--ink)";
  return (
    <button
      tabIndex={compact ? -1 : 0}
      aria-label={`${it.label}${it.changed ? ", changed" : ""}. Inspect.`}
      title={it.label}
      onMouseEnter={() => onTrace?.(it.id)}
      onMouseLeave={() => onTrace?.(null)}
      onFocus={() => onTrace?.(it.id)}
      onBlur={() => onTrace?.(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.({ kind: "item", item: it });
      }}
      className="block size-[7px] shrink-0 outline-offset-1"
      style={{
        background: fill,
        boxShadow: it.changed || highlight ? "inset 0 0 0 1px var(--ink)" : undefined,
        opacity: trace && !lit ? 0.25 : 1,
        transform: lit ? "scale(1.3)" : undefined,
        transition: "opacity 120ms, transform 120ms",
      }}
    />
  );
}

/** The verifier fills while a duty is checked: from the quote check to the reviewer's verdict. */
function GateFill({ run, state }: { run: Run; state: RunState }) {
  if (state.stages.checks?.state !== "running") return null;
  const t = state.t;
  let level = 0;
  if (run.id === "run-design-mfa") {
    // one check every 650 ms: the box fills for each, then the cell takes the result
    const span = 650;
    level = ((t - (state.stages.checks.startedAt ?? t)) % span) / span;
  } else {
    const qc = [...state.checks].reverse().find((c) => c.gate === "QC-01");
    if (qc) {
      const rc = run.events.find((e) => e.type === "check" && e.gate === "RC-04" && e.item_ref === qc.item_ref);
      const end = rc ? rc.t : qc.t + 380;
      const start = qc.t - 420;
      level = t >= end ? 0 : Math.min(1, Math.max(0, (t - start) / (end - start)));
    } else {
      level = Math.min(1, Math.max(0, (t - (state.stages.checks.startedAt ?? t)) / 420));
    }
  }
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 bottom-0 left-0"
      style={{ height: `${level * 100}%`, background: "var(--highlight)", opacity: 0.32 }}
    />
  );
}

function GateBody({ run, state }: { run: Run; state: RunState }) {
  const rc = state.checks.filter((c) => c.gate === "RC-04");
  const passed = rc.filter((c) => c.result === "pass").length;
  const held = rc.filter((c) => c.result === "block").length;
  const qc = [...state.checks].reverse().find((c) => c.gate === "QC-01");
  const checking = state.stages.checks?.state === "running" && qc ? qc.item_ref : null;
  const total = run.events.filter((e) => e.type === "check" && e.gate === "RC-04").length;
  return (
    <div className="relative mt-3 flex flex-col gap-2">
      <div className="t-label text-[9.5px]">{checking ? <>/ checking {checking}</> : state.stages.checks?.state === "done" ? "/ every duty checked" : "/ quote check, then review"}</div>
      <div className="flex gap-[3px]">
        {Array.from({ length: total }).map((_, i) => {
          const c = rc[i];
          return (
            <span
              key={i}
              className="block h-[10px] flex-1"
              style={{
                background: c ? (c.result === "pass" ? "var(--ink)" : "var(--risk)") : "transparent",
                boxShadow: c ? undefined : "inset 0 0 0 1px var(--lineStrong)",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11.5px] leading-4 text-ink2">
        <span className="inline-flex items-center gap-1">
          <Mark kind="check" size={11} className="text-ok" /> {passed} verified
        </span>
        <span className="inline-flex items-center gap-1">
          <Mark kind="cross" size={11} className="text-risk" /> {held} held back
        </span>
      </div>
    </div>
  );
}

/** run-design-mfa: seven design checks, D1 to D7. Each fills on pass; D6 can't tell until Priya answers. */
function DesignCells({ state }: { state: RunState }) {
  const cells = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
  return (
    <div className="relative mt-3 flex flex-col gap-[5px]">
      {cells.map((c) => {
        const r = state.checkFor[`${c}|CTL-153`];
        const pass = r?.result === "pass";
        const cant = r?.result === "cannot_tell";
        return (
          <div key={c} className="flex h-4 items-center gap-2">
            <span
              className="block size-[9px] shrink-0"
              style={{
                background: pass ? "var(--ink)" : "transparent",
                boxShadow: pass ? undefined : `inset 0 0 0 1px ${cant ? "var(--ink)" : "var(--lineStrong)"}`,
              }}
            />
            <span className="t-data w-5 text-[10.5px] text-ink3">{c}</span>
            <span className={cn("truncate text-[11px] leading-4", r ? "text-ink" : "text-ink3")}>{r?.label ?? "Waiting"}</span>
            {pass ? <Mark kind="check" size={10} className="ml-auto shrink-0 text-ok" /> : null}
            {cant ? <span className="t-label ml-auto shrink-0 text-[8.5px] text-ink">can&apos;t tell</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function Tray({
  tray,
  state,
  run,
  trace,
  onTrace,
  onSelect,
  compact,
  build,
}: {
  tray: TrayGeo;
  state: RunState;
  run: Run;
  trace: Lineage | null;
  onTrace?: (id: string | string[] | null) => void;
  onSelect?: (s: Selection) => void;
  compact?: boolean;
  build?: boolean;
}) {
  const items = (state.byPlace[tray.key] ?? []).sort((a, b) => a.t - b.t);
  const bin = tray.key === "covered" || tray.key === "not_yet_confirmed" || tray.key === "nothing_behind";
  const fed = state.stages[tray.from]?.state !== "waiting";
  if (bin) {
    return (
      <div
        className={cn("absolute flex items-center justify-between gap-2 border-b border-line", build && "build-node")}
        style={{ left: tray.x, top: tray.y, width: tray.w, height: tray.h, opacity: trace && !items.some((i) => trace.ids.has(i.id)) ? 0.25 : fed ? 1 : 0.5 }}
      >
        <span className="flex items-center gap-2 text-[11.5px] leading-4 text-ink2">
          <Square size={6} color={STATE_COLOR[tray.key as "covered"]} />
          {tray.label}
        </span>
        <span className="flex items-center gap-[3px]">
          {items.map((it) => (
            <ItemSquare key={it.key} it={{ ...it, agentId: undefined }} trace={trace} onTrace={onTrace} onSelect={onSelect} compact={compact} />
          ))}
          <span className="t-data ml-1 w-3 text-right text-[11px] text-ink">{items.length}</span>
        </span>
      </div>
    );
  }
  const reasonFor = (id: string) => state.checks.find((c) => c.item_ref === id && c.result === "block" && c.gate === "RC-04")?.reason;
  return (
    <div
      className={cn("absolute rounded-[2px] px-3 py-2.5", build && "build-node")}
      style={{
        left: tray.x,
        top: tray.y,
        width: tray.w,
        minHeight: tray.h,
        boxShadow: items.length ? "inset 0 0 0 1px var(--line)" : undefined,
        outline: items.length ? undefined : "1px dashed var(--line)",
        outlineOffset: -1,
        background: items.length ? "var(--surface)" : "transparent",
        opacity: trace && !items.some((i) => trace.ids.has(i.id)) ? 0.25 : fed || items.length ? 1 : 0.5,
      }}
    >
      <MonoLabel className="text-[9px]">
        {tray.label} · {items.length}
      </MonoLabel>
      <div className="mt-1.5 flex flex-col gap-1">
        {items.map((it) => {
          const lit = trace?.ids.has(it.id);
          const fresh = state.t - it.t < 1400;
          return (
            <button
              key={it.key}
              tabIndex={compact ? -1 : 0}
              onMouseEnter={() => onTrace?.(it.id)}
              onMouseLeave={() => onTrace?.(null)}
              onFocus={() => onTrace?.(it.id)}
              onBlur={() => onTrace?.(null)}
              onClick={() => onSelect?.({ kind: "item", item: it })}
              className={cn("flex items-start gap-1.5 text-left text-[11.5px] leading-[15px] text-ink", lit && "underline underline-offset-2")}
              style={{ background: fresh ? "color-mix(in oklab, var(--highlight) 55%, transparent)" : undefined, transition: "background-color 600ms" }}
            >
              {tray.key === "held" ? <Mark kind="cross" size={11} className="mt-[2px] shrink-0 text-risk" /> : <Square size={5} className="mt-[5px]" color={hueFor(it.agentId ?? "")} />}
              <span className="min-w-0 flex-1">
                {vendorById(it.label)?.name ?? it.label}
                {it.score ? <CertaintyWord value={it.score as "Clear"} className="float-right ml-2 [&_span.t-small]:text-[11px]" quiet /> : null}
                {tray.key === "held" && reasonFor(it.id) ? <span className="mt-0.5 block text-[10.5px] leading-[14px] text-ink2">{reasonFor(it.id)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
