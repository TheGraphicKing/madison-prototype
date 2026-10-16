"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getChange, userById } from "@/data";
import { useRunPlayer } from "@/lib/player/use-run-player";
import type { ItemInstance } from "@/lib/player/derive";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate } from "@/lib/dates";
import { MonoLabel } from "@/components/core/labels";
import { Mark } from "@/components/core/mark";
import { Segmented } from "@/components/core/tabs";
import { PersonaSwitch } from "@/components/shell/persona-switch";
import { ColorButton } from "@/components/shell/color-button";
import { Schematic, type Selection } from "./schematic";
import { layoutFor, W } from "./layout";
import { lineageOf } from "./lineage";
import { AgentsColumn, BottomStrip, OutputsColumn, relatedFor } from "./columns";
import { Controls, DoneSummary, ExpandedStage, PersonBar } from "./parts";
import { Inspector } from "./inspector";
import { RunStrip } from "./strip";
import type { Mode } from "@/lib/player/engine";

const Depth = dynamic(() => import("./depth").then((m) => m.Depth), { ssr: false, loading: () => <div className="h-full w-full" /> });

export function Canvas({ runId, mode, from }: { runId: string; mode: Mode; from: string }) {
  const finished = useStore((s) => Boolean(s.finishedRuns[runId]));
  const persona = useStore((s) => s.persona);
  const decide = useStore((s) => s.decide);
  const { run, state, instance, controls, key } = useRunPlayer(runId, { key: runId });
  const startedRef = useRef(false);
  const effectiveMode: Mode = mode === "live" && finished && !instance?.playing && instance?.mode !== "live" ? "replay" : mode;

  // LIVE starts playing from zero; REPLAY starts paused at zero, with the build-in.
  useEffect(() => {
    if (startedRef.current || !run) return;
    startedRef.current = true;
    if (effectiveMode === "live") {
      if (!(instance?.mode === "live" && (instance.t > 0 || instance.playing))) controls.restart({ mode: "live", playing: true, speed: instance?.speed ?? 1 });
    } else {
      const prior = useStore.getState().finishedRuns[runId]?.responses;
      controls.restart({ mode: "replay", playing: false, responses: prior ?? {}, completed: true, speed: instance?.speed ?? 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const layout = useMemo(() => (run ? layoutFor(run) : null), [run]);
  const [traceId, setTraceId] = useState<string | string[] | null>(null);
  const [traceStage, setTraceStage] = useState<string | null>(null);
  const trace = useMemo(() => {
    if (!run) return null;
    if (traceId) return lineageOf(run, traceId);
    if (traceStage) return { ids: new Set<string>(), stages: new Set([traceStage]), moves: new Set<string>() };
    return null;
  }, [run, traceId, traceStage]);
  const [selected, setSelected] = useState<ItemInstance | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<"schematic" | "depth">("schematic");
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  // scale the 1000-unit schematic to its column
  const centre = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (!centre.current || !layout) return;
    const el = centre.current;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setScale(Math.min(w / W, h / layout.H, 1.25));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  // keyboard: Space plays or pauses, arrows step, Home restarts, Escape collapses
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key === " ") {
        if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
        e.preventDefault();
        controls.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        controls.stepNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        controls.stepBack();
      } else if (e.key === "Home") {
        e.preventDefault();
        controls.seek(0);
      } else if (e.key === "Escape") {
        setExpanded(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls]);

  // fan-in lines from active agent rows to their stage node
  const body = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const rowRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  }, []);
  const [fan, setFan] = useState<{ id: string; d: string }[]>([]);
  const activeKey = state?.activeAgents.join(",") ?? "";
  useLayoutEffect(() => {
    if (!run || !layout || !body.current || !centre.current || !state || view !== "schematic" || expanded) {
      setFan([]);
      return;
    }
    const b = body.current.getBoundingClientRect();
    const sch = centre.current.querySelector("[data-schematic]") as HTMLElement | null;
    if (!sch) return;
    const s = sch.getBoundingClientRect();
    const out: { id: string; d: string }[] = [];
    for (const id of state.activeAgents) {
      const row = rows.current.get(id);
      const stage = run.stages.find((x) => x.agents.includes(id) && (state.stages[x.key].state === "running" || state.stages[x.key].state === "waiting_person"));
      if (!row || !stage) continue;
      const r = row.getBoundingClientRect();
      const g = layout.nodes[stage.key];
      const x1 = r.right - b.left;
      const y1 = r.top + r.height / 2 - b.top;
      const x2 = s.left - b.left + g.x * scale;
      const y2 = s.top - b.top + (g.y + g.h * 0.5) * scale;
      const dx = (x2 - x1) * 0.5;
      out.push({ id, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}` });
    }
    setFan(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, scale, view, expanded, layout]);

  if (!run || !state || !layout) return null;
  const change = getChange(run.change_id);
  const startedBy = userById(run.trigger.by);
  const select = (s: Selection) => (s.kind === "item" ? setSelected(s.item) : setExpanded(s.key));

  const respond = (actionId: string) => {
    if (!state.pending) return;
    const at = demoNowIso();
    const act = state.pending.actions.find((a) => a.id === actionId)!;
    controls.respond(state.pending.key, actionId, persona, at);
    decide({
      label: act.label,
      text: decisionText(run.id, actionId, act.label, change?.citation ?? ""),
      by: persona,
      at,
      runId: run.id,
      changeId: run.change_id,
    });
  };

  const playing = Boolean(instance?.playing);
  const showDepth = view === "depth" && webgl;

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      {/* header */}
      <header className="no-print sticky top-0 z-30 border-b border-line bg-ground px-8 max-md:px-5">
        <div className="flex h-16 items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={from} className="flex shrink-0 items-center gap-1.5 text-[13px] text-ink2 hover:text-ink">
              <Mark kind="chevron-left" size={12} /> {from.startsWith("/rules/") ? "Change room" : from === "/record/" ? "The record" : "Back"}
            </Link>
            <span className="h-5 w-px bg-line max-md:hidden" />
            <h1 className="truncate text-[20px] leading-7 font-medium tracking-[-0.01em] max-md:hidden">{run.title}</h1>
            <MonoLabel variant="mode" tone="ink" className="shrink-0 max-md:hidden">
              {effectiveMode === "live" ? "Live" : "Replay"}
            </MonoLabel>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="max-lg:hidden">
              <Segmented<"schematic" | "depth">
                label="View"
                size={28}
                value={view}
                onChange={setView}
                options={[
                  { value: "schematic", label: "Schematic" },
                  { value: "depth", label: "Depth", disabled: !webgl },
                ]}
              />
            </span>
            <PersonaSwitch />
            <ColorButton />
          </div>
        </div>
        <div className="flex h-12 items-center gap-8 max-md:hidden">
          <MonoLabel className="shrink-0">
            Run {fmtDate("2026-10-16")} · started by {startedBy?.name} · {change?.citation}
          </MonoLabel>
          <Controls
            run={run}
            state={state}
            playing={playing}
            speed={instance?.speed ?? 1}
            onToggle={controls.toggle}
            onSpeed={controls.setSpeed}
            onSeek={controls.seek}
          />
        </div>
      </header>

      {/* below 768 px: the strip, and a note */}
      <div className="px-5 py-6 md:hidden">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <MonoLabel variant="mode" tone="ink">
              {effectiveMode === "live" ? "Live" : "Replay"}
            </MonoLabel>
            <h1 className="mt-1 text-[20px] leading-7 font-medium tracking-[-0.01em]">{run.title}</h1>
          </div>
          <button onClick={controls.toggle} className="mt-5 shrink-0 text-[14px] underline underline-offset-4">
            {state.done && !playing ? "Replay" : playing ? "Pause" : "Play"}
          </button>
        </div>
        <RunStrip runId={run.id} instanceKey={key} hideOpen />
        <p className="mt-4 text-[13px] text-ink2">The full canvas is best viewed on a desktop.</p>
      </div>

      <div ref={body} className="relative grid flex-1 grid-cols-[232px_minmax(0,1fr)_280px] gap-7 px-8 pt-7 pb-6 max-xl:grid-cols-[208px_minmax(0,1fr)_248px] max-md:hidden">
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden>
          {fan.map((f) => (
            <g key={f.id}>
              <path d={f.d} fill="none" stroke="var(--ink)" strokeWidth={1} opacity={0.35} />
              {[0, 0.33, 0.66].map((dl) => (
                <circle key={dl} r={2.2} fill="var(--ink)">
                  <animateMotion dur="1.1s" begin={`${dl}s`} repeatCount="indefinite" path={f.d} />
                </circle>
              ))}
            </g>
          ))}
        </svg>
        <div className="relative z-[1]"><AgentsColumn run={run} state={state} rowRef={rowRef} onTrace={setTraceStage} /></div>
        <div ref={centre} className="relative z-[1] min-h-[560px]">
          {showDepth ? (
            <Depth run={run} state={state} layout={layout} />
          ) : (
            <div className="absolute inset-0 flex items-start justify-center">
              <div data-schematic style={{ width: W * scale, height: layout.H * scale }} className="relative">
                <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }} className={cn("absolute top-0 left-0", expanded && "opacity-20 transition-opacity")}>
                  <Schematic
                    run={run}
                    state={state}
                    layout={layout}
                    trace={trace}
                    onTrace={setTraceId}
                    onSelect={select}
                    onExpand={(k) => setExpanded(k)}
                    build={instance ? true : false}
                    expanded={expanded}
                    key={`${instance?.createdAt ?? 0}`}
                  />
                </div>
              </div>
            </div>
          )}
          <AnimatePresence>
            {expanded ? (
              <ExpandedStage
                run={run}
                state={state}
                stageKey={expanded}
                onClose={() => setExpanded(null)}
                onSwitch={setExpanded}
                onSelectItem={(it) => setSelected(it)}
                onTrace={(id) => setTraceId(id)}
              />
            ) : null}
          </AnimatePresence>
        </div>
        <OutputsColumn
          run={run}
          state={state}
          clockRunning={playing && !state.pending && !state.done}
          onTrace={(ids) => setTraceId(ids && ids.length ? ids : null)}
          onSelectOutput={(label) => {
            const ids = relatedFor(run, state.outputs.find((o) => o.card.label === label)?.t ?? -1);
            const it = ids.map((id) => state.resting[id]).find(Boolean);
            if (it) setSelected(it);
          }}
        />
      </div>

      <footer className="no-print border-t border-line px-8 py-4 max-md:hidden">
        <BottomStrip run={run} state={state} clockRunning={playing && !state.pending && !state.done} />
      </footer>

      <AnimatePresence>{state.pending ? <PersonBar key={state.pending.key} run={run} pending={state.pending} onRespond={respond} /> : null}</AnimatePresence>
      <DoneSummary run={run} state={state} from={from} />
      <Inspector run={run} state={state} item={selected} instance={instance} onClose={() => setSelected(null)} />
    </div>
  );
}

export function decisionText(runId: string, actionId: string, label: string, citation: string) {
  if (runId === "run-rule-1005" && actionId === "accept_all") return `Accepted 6 obligations and excluded 1 (prepaid) for ${citation}`;
  if (runId === "run-design-mfa" && actionId === "answer") return "Answered D6 for CTL-153: break-glass accounts are vaulted and need two officers";
  if (runId === "run-design-mfa" && actionId === "sign") return "Signed off CTL-153 and the change to POL-ISP-01 3.1";
  if (runId === "run-coverage-1026" && actionId === "link_and_raise") return "Linked POL-MTG-02 3.1 to D-1026-L2 and raised drift DR-029 to Grace Liu";
  if (runId === "run-coverage-1026" && actionId === "link_only") return "Linked POL-MTG-02 3.1 to D-1026-L2";
  return `${label} (${citation})`;
}
