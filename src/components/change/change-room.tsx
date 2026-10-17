"use client";

// The change room: one screen. The 3D change map (about 65%), the side panel (about 35%) with
// "Your task now" or the selected platform's detail, and the four-answers strip below.
// Runs play in place on the map; "List" shows the same journey as the step list.
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { areaForChange, dutiesFor, getDuty, handoffById, regulationById, run as getRun, userById } from "@/data";
import type { PersonEvent, Run, RuleChange } from "@/data/types";
import { useStore } from "@/lib/store";
import { useChange } from "@/lib/use-change";
import { useBlockers, useTaskViews, raiseHandoff, handoffStatus } from "@/lib/work";
import { useRunPlayer } from "@/lib/player/use-run-player";
import { personEvents, type RunState } from "@/lib/player/derive";
import { onPersonResponse } from "@/lib/player/results";
import { demoNowIso, fmtDate } from "@/lib/dates";
import { PLATFORMS, PLATFORM_LABEL, RUN_ACTION, RUN_FOR, STAGE_PLACE, runPlatforms, staticPlatforms, type PlaceKey, type PlatformModel } from "@/lib/change-map";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/core/button";
import { Segmented } from "@/components/core/tabs";
import { FourDates, daysLeftWord } from "@/components/core/dates4";
import { WhoOwns } from "@/components/core/who-owns";
import { Initials } from "@/components/core/tags";
import { TaskDecision } from "@/components/tasks/task-action";
import { Checkpoint, decisionText } from "@/components/run/run-view";
import { useSceneSupport } from "@/components/scene/support";
import { appliesVerdict, AppliesBody, AppliesChip, CloseBody, CoveredBody, LinkedBody, ObligationsBody, WhatsLeftBody } from "./battle-cards";
import { ChangeList } from "./change-list";
import { datesFor } from "@/data";

const ChangeMap = dynamic(() => import("./change-map").then((m) => m.ChangeMap), { ssr: false, loading: () => <div className="h-full w-full" /> });

export function ChangeRoom({ id }: { id: string }) {
  const runId = RUN_FOR[id];
  return runId ? <WithRun id={id} runId={runId} /> : <Room id={id} run={null} />;
}

type RunCtx = {
  run: Run;
  st: RunState | null;
  playing: boolean;
  active: boolean;
  live: boolean;
  start: () => void;
  replay: (fromStage?: string) => void;
  respond: (eventKey: string, actionId: string, label: string) => void;
  speed: number;
  setSpeed: (s: 1 | 2 | 4) => void;
};

/** A change with a run: the run plays in place on the map. */
function WithRun({ id, runId }: { id: string; runId: string }) {
  const sp = useSearchParams();
  const persona = useStore((s) => s.persona);
  const finished = useStore((s) => s.finishedRuns[runId]);
  const handoffState = useStore((s) => s.handoffs);
  const decide = useStore((s) => s.decide);
  const { run, state, instance, controls } = useRunPlayer(runId, { key: runId });
  const change = useChange(id);
  const playing = Boolean(instance?.playing);
  const started = Boolean(instance && (instance.playing || instance.t > 0));
  const active = Boolean(run && started && !(instance?.completed && !playing && (finished || instance.mode === "replay")) && !(finished && instance?.mode === "live" && instance.completed));
  const live = Boolean(instance?.mode === "live" && started && !instance.completed && !finished);

  // answers given in a task (Priya's D6 answer, Anthony's sign-off) move the run on
  const responses = () => {
    const out: Record<string, string> = {};
    if (!run || run.id !== "run-design-mfa") return out;
    const s = useStore.getState();
    for (const { e, i } of personEvents(run)) {
      const h = e.waiting_for === "u-priya" ? handoffById("H-117") : e.waiting_for === "u-anthony" ? handoffById("H-116") : undefined;
      if (h && handoffStatus(h, s) === "done") out[String(i)] = e.actions[0].id;
    }
    return out;
  };
  useEffect(() => {
    if (!run || run.id !== "run-design-mfa" || !instance || !state) return;
    // the owner's question exists only once the design checks reach it
    if (state.pending?.waiting_for === "u-priya") raiseHandoff("H-117");
    const want = responses();
    for (const [k, a] of Object.entries(want)) if (!instance.responses[k]) controls.respond(k, a, persona, demoNowIso());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState, instance?.responses, state?.pending?.key, run]);

  // ?replay=1 (from the record or "How Madison did this") replays in place
  const replayed = useRef(false);
  useEffect(() => {
    if (!run || replayed.current || sp.get("replay") !== "1") return;
    replayed.current = true;
    controls.restart({ mode: "replay", playing: true, speed: 2, responses: { ...(finished?.responses ?? {}), ...responses() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, sp]);

  if (!run || !change) return null;
  const ctx: RunCtx = {
    run,
    st: state,
    playing,
    active,
    live,
    start: () => controls.restart({ mode: "live", playing: true, speed: instance?.speed ?? 1, responses: responses() }),
    replay: (fromStage) => {
      const t = fromStage ? (run.events.find((e) => e.type === "stage" && e.stage === fromStage && e.state === "running")?.t ?? 0) : 0;
      controls.restart({ mode: "replay", playing: true, speed: 2, t, responses: { ...(finished?.responses ?? {}), ...responses() } });
    },
    speed: instance?.speed ?? 1,
    setSpeed: (v) => controls.setSpeed(v),
    respond: (eventKey, actionId, label) => {
      const at = demoNowIso();
      controls.respond(eventKey, actionId, persona, at);
      decide({ label, text: decisionText(run.id, actionId, label, change.citation), by: persona, at, runId: run.id, changeId: run.change_id });
      onPersonResponse(run.id, actionId);
    },
  };
  return <Room id={id} run={ctx} />;
}

function Room({ id, run }: { id: string; run: RunCtx | null }) {
  const c = useChange(id)!;
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const persona = useStore((s) => s.persona);
  const fact = useStore((s) => s.facts.flood_zone_lending);
  const finished = useStore((s) => (run ? s.finishedRuns[run.run.id] : undefined));
  const handoffs = useStore((s) => s.handoffs);
  const support = useSceneSupport();
  const blockers = useBlockers(id);
  const views = useTaskViews();
  const [view, setView] = useState<"map" | "list">(sp.get("view") === "list" ? "list" : "map");
  const [selected, setSelected] = useState<string | null>(null);
  const [focusAgent, setFocusAgent] = useState<string | null>(null);
  const [journey, setJourney] = useState<number | null>(null);
  const blockedOn = blockers[0] ? (userById(blockers[0].h.to_user_id)?.name ?? null) : null;
  const regulation = regulationById(c.regulation_id)?.citation ?? c.citation;

  // a closed change without a recorded run replays its journey, platform by platform
  useEffect(() => {
    if (journey === null) return;
    if (journey > PLATFORMS.length) {
      const t = setTimeout(() => setJourney(null), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setJourney((j) => (j === null ? null : j + 1)), 700);
    return () => clearTimeout(t);
  }, [journey]);
  const startedJourney = useRef(false);
  useEffect(() => {
    if (!run && sp.get("replay") === "1" && !startedJourney.current) {
      startedJourney.current = true;
      setTimeout(() => setJourney(0), 0);
    }
  }, [run, sp]);

  const platforms: PlatformModel[] = useMemo(() => {
    let base = staticPlatforms(c, blockedOn);
    if (journey !== null) base = base.map((p, i) => ({ ...p, status: p.status === "hidden" ? "hidden" : i < journey ? "done" : i === journey ? "current" : "waiting", working: i === journey }));
    if (run?.active && run.st) return runPlatforms(base, run.run.id, run.st, run.run.stages);
    // the control design, once started, keeps its three platforms beside What's left
    if (run?.run.id === "run-design-mfa" && (handoffs["H-117"] || finished)) {
      const waiting = handoffs["H-117"]?.status !== "done" ? userById("u-priya")?.name : handoffs["H-116"]?.status !== "done" ? userById("u-anthony")?.name : null;
      const design: PlatformModel[] = [
        { key: "suggest", status: "done", note: "New control and one sentence", working: false },
        { key: "draft", status: "done", note: "CTL-153 drafted", working: false },
        { key: "checks", status: finished || !waiting ? "done" : "blocked", note: finished || !waiting ? "7 of 7 pass" : `Waiting on ${waiting}`, working: false },
      ];
      return [...base, ...design];
    }
    return base;
  }, [c, blockedOn, journey, run?.active, run?.st, run?.run, handoffs, finished]);

  const current = platforms.find((p) => p.status === "current" || p.status === "blocked");
  const shownKey = selected ?? current?.key ?? (c.state === "screened_out" ? "applies" : "close");

  // where a person answers on the map
  const ring = useMemo(() => {
    if (run?.active && run.st) {
      const pending = run.st.pending;
      if (pending) return { at: STAGE_PLACE[run.run.id]?.[pending.stage] ?? "obligations", pending: true, who: pending.waiting_for } as { at: PlaceKey; pending: boolean; who?: string };
      const answered = run.st.responded.at(-1);
      if (answered) return { at: STAGE_PLACE[run.run.id]?.[answered.event.stage] ?? "obligations", pending: false };
    }
    if (run?.run.id === "run-rule-1005" && finished) return { at: "obligations" as PlaceKey, pending: false };
    return null;
  }, [run?.active, run?.st, run?.run, finished]);

  const heldReason = run?.run.id === "run-rule-1005" && finished ? (run.run.events.find((e) => e.type === "check" && e.result === "block" && e.kind !== "drift") as { reason?: string } | undefined)?.reason : undefined;

  // the persona's task here, and the action that starts this change's run
  const myTask = useMemo(() => views.filter((v) => v.task.change_id === id && v.task.assignee_id === persona && v.state !== "done").sort((a, b) => a.task.priority - b.task.priority)[0], [views, id, persona]);
  const action = run && !finished && !run.active ? RUN_ACTION[run.run.id] : undefined;
  const actionReady = Boolean(action && (run!.run.id !== "run-design-mfa" || !handoffs["H-117"]) && (run!.run.id !== "run-coverage-1026" || c.state === "linked"));

  const setViewUrl = (v: "map" | "list") => {
    setView(v);
    const q = new URLSearchParams(sp.toString());
    if (v === "list") q.set("view", "list");
    else q.delete("view");
    q.delete("replay");
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  const map = view === "map" && support !== "2d";
  const area = areaForChange(id);
  const owner = userById(area?.owner_id ?? c.owner_id);

  return (
    <Page wide className="pt-6">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="t-data text-ink">{c.citation}</span>
            <AppliesChip verdict={appliesVerdict(c, fact?.value)} />
            {run?.live ? (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface2 px-2.5 text-[12px] font-medium">
                <span className="breathe block size-[6px] rounded-full bg-ok" /> Live
              </span>
            ) : run?.active ? (
              <span className="inline-flex h-6 items-center rounded-full bg-surface2 px-2.5 text-[12px] font-medium">Replay</span>
            ) : null}
            {run?.active ? (
              <Segmented<string> label="Speed" size={28} value={String(run.speed)} onChange={(v) => run.setSpeed(Number(v) as 1 | 2 | 4)} options={["1", "2", "4"].map((v) => ({ value: v, label: `${v}×` }))} />
            ) : null}
          </div>
          <h1 className="mt-2 text-[26px] leading-[32px] font-medium tracking-[-0.015em]">{c.title}</h1>
          <FourDates changeId={id} className="mt-3" />
        </div>
        <div className="flex flex-col items-end gap-3">
          <Segmented<"map" | "list">
            label="Change room view"
            size={28}
            value={map ? "map" : "list"}
            onChange={setViewUrl}
            options={[
              { value: "map", label: "Map", disabled: support === "2d" },
              { value: "list", label: "List" },
            ]}
          />
          {c.state !== "screened_out" && owner ? (
            <span className="flex items-center gap-2.5 rounded-full bg-surface px-1.5 py-1 pr-3.5 shadow-[inset_0_0_0_1px_var(--line)]">
              <Initials initials={owner.initials} size={26} />
              <span className="text-[13px] leading-4">
                <span className="block font-medium">{owner.name}</span>
                <span className="block text-ink2">{area?.name ?? "Owner"}</span>
              </span>
            </span>
          ) : null}
        </div>
      </header>

      {map ? (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
            <div className="relative h-[600px] overflow-hidden rounded-[16px] border border-line max-md:h-[460px]">
              <ChangeMap
                change={c}
                regulation={regulation}
                platforms={platforms}
                run={run?.run}
                st={run?.st}
                runActive={Boolean(run?.active)}
                playing={Boolean(run?.playing)}
                ring={ring}
                selected={selected}
                onSelect={setSelected}
                focusAgent={focusAgent}
                onFocusAgent={setFocusAgent}
                heldReason={heldReason}
                onOpenCoverage={() => router.push(`/coverage/?view=field&plot=${c.regulation_id}`)}
              />
            </div>
            <aside aria-label="Side panel" className="flex max-h-[600px] min-w-0 flex-col gap-3 overflow-y-auto pr-1 max-lg:max-h-none">
              <YourTask c={c} run={run} myTask={myTask?.task.id} action={actionReady ? action : undefined} blockedOn={blockedOn} />
              <PlatformDetail c={c} k={shownKey} model={platforms.find((p) => p.key === shownKey)} run={run} recorded={Boolean(run && (finished || run.run.id !== "run-rule-1005"))} onReplayJourney={() => setJourney(0)} />
            </aside>
          </div>
          <AnswersStrip c={c} blockedOn={blockedOn} next={actionReady && action ? { label: action.label, onClick: run!.start, demo: action.demo } : undefined} onOpenCoverage={() => router.push(`/coverage/?view=field&plot=${c.regulation_id}`)} />
        </>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <ChangeList id={id} />
        </div>
      )}
    </Page>
  );
}

/* ---------- side panel ---------- */

function YourTask({ c, run, myTask, action, blockedOn }: { c: RuleChange; run: RunCtx | null; myTask?: string; action?: { label: string; demo: string }; blockedOn: string | null }) {
  const persona = useStore((s) => s.persona);
  const [reviewAll, setReviewAll] = useState(false);
  const pending = run?.active ? run.st?.pending : null;
  if (pending && run?.st) {
    if (pending.waiting_for === persona)
      return (
        <section aria-label="Your task now">
          <h2 className="mb-2 text-[13px] font-medium text-ink3">Your task now</h2>
          <Checkpoint run={run.run} st={run.st} pending={pending as PersonEvent & { key: string }} reviewAll={reviewAll} onReview={() => setReviewAll(true)} onRespond={run.respond} compact />
        </section>
      );
    return <Note title={`Waiting on ${userById(pending.waiting_for)?.name}`} text={pending.prompt} />;
  }
  if (run?.active) return <Note title="Madison is working" text={run.st?.narration?.text ?? "Reading the rule."} live />;
  if (action && myTask)
    return (
      <section aria-label="Your task now" className="rounded-[14px] border border-line bg-surface p-4">
        <h2 className="text-[13px] font-medium text-ink3">Your task now</h2>
        <p className="mt-1 text-[16px] leading-[23px] font-medium">{action.label === "Choose a fix" ? "Choose a fix for the gap Madison found" : action.label === "Check coverage" ? "Check coverage for the revised Loan Estimate obligation" : "Let Madison read the amended rule"}</p>
        <p className="mt-1 text-[13.5px] leading-[21px] text-ink2">
          {action.label === "Choose a fix"
            ? "One obligation has nothing behind it. Madison drafts the smallest fix and checks its design; you see every check."
            : action.label === "Check coverage"
              ? "Madison compares the rule, the policy, the procedure and the control, then asks you to confirm."
              : "Madison reads the official text, checks it applies, finds the obligations and stops for your decision."}
        </p>
        <Button variant="primary" size={40} className="mt-3 w-full" onClick={run!.start} data-demo={action.demo}>
          {action.label}
        </Button>
      </section>
    );
  if (myTask) return <TaskDecision taskId={myTask} compact className="[&_.grid]:grid-cols-1" />;
  if (c.state === "closed") return <Note title="This change is closed" text={`Closed ${fmtDate(c.closed_at)} by ${userById(c.closed_by ?? "")?.name ?? "the CCO"}.`} />;
  if (c.state === "screened_out") return <Note title="Nothing to do" text="This rule doesn't apply to the bank." />;
  return <Note title="Nothing needs you here" text={blockedOn ? `Waiting on ${blockedOn}.` : `${userById(c.owner_id)?.name} has the next step.`} />;
}

function Note({ title, text, live }: { title: string; text: string; live?: boolean }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-[15px] font-medium">
        {live ? <span className="breathe block size-[7px] rounded-full bg-ok" /> : null}
        {title}
      </p>
      <p className="mt-1 text-[13.5px] leading-[21px] text-ink2">{text}</p>
    </div>
  );
}

function PlatformDetail({ c, k, model, run, recorded, onReplayJourney }: { c: RuleChange; k: string; model?: PlatformModel; run: RunCtx | null; recorded: boolean; onReplayJourney: () => void }) {
  const stage = run ? run.run.stages.find((s) => STAGE_PLACE[run.run.id]?.[s.key] === k) : undefined;
  const label = PLATFORM_LABEL[k as keyof typeof PLATFORM_LABEL] ?? k;
  return (
    <section aria-label={`${label} detail`} className="rounded-[14px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-medium">{label}</h2>
        <span className={cn("text-[12.5px]", model?.status === "blocked" ? "font-medium text-warn" : "text-ink3")}>{model?.status === "waiting" ? "Not started" : model?.note}</span>
      </div>
      <div className="mt-3 text-[14px] [&_.grid]:grid-cols-1">
        {model?.status === "waiting" || !model ? (
          <p className="text-[13.5px] leading-[21px] text-ink2">Nothing here yet. {k === "applies" ? "Madison has not read this rule." : "This step starts when the one before it is done."}</p>
        ) : k === "applies" ? (
          <AppliesBody change={c} />
        ) : k === "obligations" ? (
          <ObligationsBody change={c} />
        ) : k === "linked" ? (
          <LinkedBody change={c} />
        ) : k === "covered" ? (
          <CoveredBody change={c} />
        ) : k === "whats_left" ? (
          <WhatsLeftBody change={c} />
        ) : k === "close" ? (
          <CloseBody change={c} />
        ) : (
          <DesignDetail k={k} run={run} />
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
        {c.state !== "screened_out" ? <WhoOwns changeId={c.id} compact /> : null}
        {run && recorded ? (
          <Button variant="quiet" size={32} className="self-start" onClick={() => run.replay(stage?.key)}>
            How Madison did this
          </Button>
        ) : c.state === "closed" ? (
          <Button variant="quiet" size={32} className="self-start" onClick={onReplayJourney}>
            Replay how Madison did this
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function DesignDetail({ k, run }: { k: string; run: RunCtx | null }) {
  const checks = (run?.st?.checks ?? []).filter((x) => /^D\d$/.test(x.gate));
  if (k === "suggest") return <p className="text-[13.5px] leading-[21px]">A new control, CTL-153, plus one sentence in POL-ISP-01 3.1. Changing the policy words alone would leave nothing to test.</p>;
  if (k === "draft") return <p className="text-[13.5px] leading-[21px]">CTL-153: phishing-resistant MFA for privileged access, including vendors, checked monthly.</p>;
  return (
    <ul className="flex flex-col gap-1.5" data-demo="D2-3">
      {(checks.length ? checks : []).map((x, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] leading-5">
          <span className={cn("mt-1 block size-[8px] shrink-0 rounded-[2px]", x.result === "pass" ? "bg-ok" : "bg-warn")} />
          <span>
            <span className="font-medium">{x.gate} {x.label}</span>
            <span className="block text-ink2">{x.result === "pass" ? "Passes" : x.reason}</span>
          </span>
        </li>
      ))}
      {!checks.length ? <li className="text-[13.5px] text-ink2">Seven design checks. D6, "cannot be bypassed", needs the owner's answer.</li> : null}
    </ul>
  );
}

/* ---------- the four answers strip ---------- */

function AnswersStrip({ c, blockedOn, next, onOpenCoverage }: { c: RuleChange; blockedOn: string | null; next?: { label: string; onClick: () => void; demo: string }; onOpenCoverage: () => void }) {
  const fact = useStore((s) => s.facts.flood_zone_lending);
  const states = useStore((s) => s.obligationStates);
  const ds = dutiesFor(c.id);
  const inScope = ds.filter((d) => d.applicability === "in_scope");
  const excluded = ds.filter((d) => d.applicability === "excluded").length;
  const known = !["new", "uncertain", "screened_out", "applies"].includes(c.state);
  const st = (id: string) => states[id] ?? getDuty(id)?.coverage_state;
  // the change's own counts cover obligations the demo does not name one by one
  const k = c.counts;
  const total = k ? Math.max(k.duties, inScope.length) : inScope.length;
  const named = inScope.filter((d) => st(d.id) === "covered").length;
  const covered = k ? Math.max(k.covered, named) + (states["D-208-M1"] === "covered" && c.id === "RC-2026-011" && k.covered < 3 ? 1 : 0) : named;
  const gaps = inScope.filter((d) => ["nothing_behind", "not_yet_confirmed"].includes(st(d.id) ?? ""));
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const area = areaForChange(c.id);
  const deadline = datesFor(c.id)?.northgate_deadline;
  const left = daysLeftWord(deadline);
  const verdict = appliesVerdict(c, fact?.value);
  const cells = [
    { q: "Applies?", a: verdict === "Applies" ? "Yes" : verdict, sub: c.state === "screened_out" ? c.screen_reason : c.state === "uncertain" ? (blockedOn ? `Waiting on ${blockedOn}` : "Needs a bank fact") : verdict === "Applies" ? "Checked against the bank profile" : "Madison has not read it" },
    { q: "What it asks", a: c.state === "screened_out" ? "Nothing here" : known ? plural(total, "obligation") : "Not read yet", sub: c.state === "screened_out" ? "The rule does not apply" : known && excluded ? `${excluded} excluded` : known ? "Each with the rule's own words" : "" },
    { q: "Are we covered?", a: c.state === "screened_out" ? "Not needed" : known && c.state !== "duties" ? `${covered} of ${total}` : "Not yet known", sub: known && c.state !== "duties" ? `${gaps.length} still open` : "" },
    {
      q: "What's left",
      a: c.state === "closed" || c.state === "screened_out" ? "Nothing" : gaps.length && known ? `${gaps.length} to fix` : blockedOn ? `Waiting on ${blockedOn}` : known ? "Nothing open" : "Not known yet",
      sub: c.state === "screened_out" ? "Madison re-checks if the bank's products change" : c.state === "closed" ? `Closed ${fmtDate(c.closed_at)}` : `${area ? userById(area.owner_id)?.name : userById(c.owner_id)?.name} · due ${deadline ? fmtDate(deadline) : "no deadline"}${deadline ? ` · ${left.text}` : ""}`,
    },
  ];
  return (
    <section aria-label="Four answers" className="mt-4 grid overflow-clip rounded-[16px] border border-line bg-surface md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
      {cells.map((x, i) => (
        <div key={x.q} className={cn("px-5 py-3.5", i && "md:border-l md:border-line", "max-md:border-b max-md:border-line")}>
          <div className="text-[12px] font-medium text-ink3">{x.q}</div>
          <div className="mt-0.5 text-[16px] leading-[22px] font-medium">{x.a}</div>
          {x.sub ? <div className="mt-0.5 text-[12.5px] leading-[18px] text-ink2">{x.sub}</div> : null}
        </div>
      ))}
      <div className="flex items-center px-5 py-3.5 md:border-l md:border-line">
        {next ? (
          <Button variant="primary" size={40} onClick={next.onClick} data-demo={next.demo}>
            {next.label}
          </Button>
        ) : c.state !== "screened_out" && c.state !== "uncertain" && c.state !== "new" ? (
          <Button variant="quiet" size={40} onClick={onOpenCoverage}>
            Open in Coverage
          </Button>
        ) : (
          <Link href="/rules/" className="text-[13.5px] underline underline-offset-4">
            All rule changes
          </Link>
        )}
      </div>
    </section>
  );
}
