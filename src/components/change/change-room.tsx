"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RuleChange } from "@/data/types";
import { controlById, dutiesFor, getChange, impactFor, linksFor, policyById, procedureById, regulationById, sectionsFor, userById, vendorsFor, getDuty } from "@/data";
import { useStore } from "@/lib/store";
import { STEPS, STEP_LABEL, stepsDone, useChange } from "@/lib/use-change";
import { useBlockers, useTaskViews, useWaitingOn } from "@/lib/work";
import { daysFrom, fmtDate, fmtTime, relDays } from "@/lib/dates";
import { Page } from "@/components/layout/page";
import { PersonTag, Initials } from "@/components/core/tags";
import { Button } from "@/components/core/button";
import { SlideOver } from "@/components/core/overlays";
import { StatusChip } from "@/components/core/status";
import { Square } from "@/components/core/mark";
import { RunStrip } from "@/components/run/strip";
import { usePlayback } from "@/lib/player/engine";
import { TaskDecision } from "@/components/tasks/task-action";
import { Diff } from "./diff";
import { appliesVerdict, AppliesBody, Card, CloseBody, CoveredBody, LinkedBody, ObligationsBody, WhatsLeftBody, type CardKey } from "./battle-cards";

const RUN_FOR: Record<string, string> = { "RC-2026-014": "run-rule-1005", "RC-2026-011": "run-design-mfa", "RC-2026-016": "run-coverage-1026" };
const TAG_WORDS: Record<string, string> = {
  card_disputes: "card disputes",
  ach_disputes: "ACH disputes",
  privileged_access: "privileged access",
  vendor_access: "vendor access",
  data_hosting: "data hosting",
  mortgage_origination: "mortgage lending",
  consumer_deposits: "consumer deposits",
  brokered_deposits: "brokered deposits",
  wires: "wire transfers",
  prepaid: "prepaid accounts",
};

export function ChangeRoom({ id }: { id: string }) {
  const c = useChange(id)!;
  const sp = useSearchParams();
  const router = useRouter();
  const persona = useStore((s) => s.persona);
  const finished = useStore((s) => s.finishedRuns);
  const fact = useStore((s) => s.facts.flood_zone_lending);
  const runId = RUN_FOR[id];
  const recorded = runId === "run-design-mfa" || (runId ? Boolean(finished[runId]) : false);
  const beforeRun = id === "RC-2026-014" && !finished["run-rule-1005"];
  const doesntApply = c.state === "screened_out";
  const views = useTaskViews();
  const blockers = useBlockers(id);
  const waiting = useWaitingOn(persona).filter((w) => w.changeId === id);
  const [touches, setTouches] = useState(false);

  // the persona's task on this change, most urgent first
  const myTask = useMemo(() => {
    const mine = views.filter((v) => v.task.change_id === id && v.task.assignee_id === persona && v.state !== "done");
    return mine.sort((a, b) => a.task.priority - b.task.priority || a.task.due.localeCompare(b.task.due))[0];
  }, [views, id, persona]);
  const lastDone = useMemo(() => views.filter((v) => v.task.change_id === id && v.task.assignee_id === persona && v.state === "done").pop(), [views, id, persona]);

  const cards: CardKey[] = useMemo(() => {
    if (beforeRun) return [];
    if (doesntApply || c.state === "uncertain" || c.state === "new") return ["applies"];
    const out: CardKey[] = ["applies"];
    if (dutiesFor(id).length) out.push("obligations");
    if (dutiesFor(id).some((d) => linksFor(d.id).length)) out.push("linked");
    if (c.counts) out.push("covered");
    if (["linked", "whats_left", "covered", "closed"].includes(c.state)) out.push("whats_left");
    out.push("close");
    return out;
  }, [beforeRun, doesntApply, c.state, c.counts, id]);
  const done = stepsDone(c);
  const current: CardKey = useMemo(() => {
    const byStep: Record<string, CardKey> = { applies: "applies", duties: "obligations", linked: "linked", covered: "covered", whats_left: "whats_left", close: "close" };
    const k = byStep[STEPS[Math.min(done, 5)]] ?? "applies";
    return cards.includes(k) ? k : cards[cards.length - 1];
  }, [done, cards]);
  const [open, setOpen] = useState<Set<CardKey>>(() => new Set([current]));
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#card-", "") : "";
    const k = (cards.includes(hash as CardKey) ? hash : current) as CardKey;
    const t = setTimeout(() => {
      setOpen(new Set([k]));
      if (sp.get("touches")) setTouches(true);
      if (hash) document.getElementById(`card-${hash}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.state, cards.length, sp]);
  const toggle = (k: CardKey) => setOpen((s) => (s.has(k) ? new Set([...s].filter((x) => x !== k)) : new Set([...s, k])));

  const inst = usePlayback((s) => (runId ? s.instances[runId] : undefined));
  const live = Boolean(inst && inst.mode === "live" && !inst.completed && (inst.playing || inst.t > 0));
  const effDays = daysFrom(c.effective_date);
  const verdict = appliesVerdict(c, fact?.value);
  return (
    <Page>
      {live && runId ? (
        <div className="mb-8">
          <RunStrip runId={runId} instanceKey={runId} href={`/runs/${runId}/?mode=live&from=/rules/${id}/`} />
        </div>
      ) : null}

      <header className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="t-data text-ink">{c.citation}</span>
            <AppliesChip verdict={verdict} />
            <span className="text-[13px] text-ink3">
              {c.agency} · {c.kind}
            </span>
          </div>
          <h1 className="t-page mt-3 max-w-[32ch]">{c.title}</h1>
          <p className="mt-2 text-[14.5px] text-ink2">
            Effective {fmtDate(c.effective_date)} · {effDays >= 0 ? relDays(c.effective_date) : `in force for ${-effDays} days`}
            {c.synthetic_note ? <span className="text-ink3"> · {c.synthetic_note}</span> : null}
          </p>
        </div>
        <WhoHasThis change={c} myTaskOwner={myTask?.task.assignee_id} blockers={blockers.map((b) => b.h.to_user_id)} />
      </header>

      <div className="mt-10 flex flex-col gap-10">
        <section aria-label="Your task now">
          <h2 className="t-section mb-3">Your task now</h2>
          {myTask ? (
            <TaskDecision taskId={myTask.task.id} hideEvidence={beforeRun} />
          ) : (
            <NothingForYou change={c} waiting={[...waiting.map((w) => w.who), ...blockers.map((b) => userById(b.h.to_user_id)?.name ?? "")]} lastDone={lastDone?.task.title} />
          )}
        </section>

        {beforeRun ? <WhatWeKnow change={c} /> : null}

        {cards.length ? (
          <section aria-label="Results" className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <h2 className="t-section">{doesntApply ? "The verdict" : "What Madison found"}</h2>
              {runId && recorded ? (
                <Link href={`/runs/${runId}/?mode=replay&from=/rules/${id}/`} className="text-[14px] font-medium underline underline-offset-4">
                  How Madison got here
                </Link>
              ) : null}
            </div>
            {cards.map((key) => (
              <Card
                key={key}
                k={key}
                change={c}
                open={open.has(key)}
                onToggle={() => toggle(key)}
                runId={runId}
                showHow={Boolean(runId && recorded)}
                blocked={key === "whats_left" && blockers.length > 0}
                summary={cardSummary(key, c, verdict, blockers.length)}
              >
                {key === "applies" ? (
                  <>
                    <AppliesBody change={c} />
                    {doesntApply ? <Reopen change={c} /> : null}
                  </>
                ) : null}
                {key === "obligations" ? <ObligationsBody change={c} /> : null}
                {key === "linked" ? <LinkedBody change={c} /> : null}
                {key === "covered" ? <CoveredBody change={c} /> : null}
                {key === "whats_left" ? (
                  <>
                    <WhatsLeftBody change={c} />
                    {impactFor(id) || vendorsFor(id).length ? (
                      <Button variant="quiet" size={32} className="mt-5" onClick={() => setTouches(true)}>
                        Open what it touches
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {key === "close" ? <CloseBody change={c} /> : null}
              </Card>
            ))}
          </section>
        ) : null}

      </div>

      <TouchesOver change={c} open={touches} onOpenChange={(o) => {
        setTouches(o);
        if (!o && sp.get("touches")) router.replace(`/rules/${id}/`, { scroll: false });
      }} />
    </Page>
  );
}

function AppliesChip({ verdict }: { verdict: string }) {
  const tone = verdict === "Applies" ? "bg-ok-soft text-ok" : verdict === "Doesn't apply" ? "bg-surface2 text-ink2" : verdict === "Needs a bank fact" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", tone)}>{verdict}</span>;
}

function cardSummary(key: CardKey, c: RuleChange, verdict: string, blocked: number): string {
  const ds = dutiesFor(c.id);
  const k = c.counts;
  switch (key) {
    case "applies":
      return c.state === "screened_out" ? "" : verdict === "Applies" ? `Applies to the bank · confirmed by ${userById(c.owner_id)?.name}` : verdict;
    case "obligations":
      return `${ds.filter((d) => d.applicability === "in_scope").length} obligations${ds.some((d) => d.applicability === "excluded") ? " · 1 excluded" : ""}`;
    case "linked":
      return `${ds.reduce((n, d) => n + linksFor(d.id).length, 0)} links to policies and controls`;
    case "covered":
      return k ? `${k.covered} covered · ${k.not_yet_confirmed} not yet confirmed · ${k.nothing_behind} nothing behind it · ${k.known_gap} known gaps` : "";
    case "whats_left":
      return blocked ? `Blocked on ${blocked} request${blocked > 1 ? "s" : ""}` : k && k.nothing_behind + k.not_yet_confirmed === 0 ? "Nothing left" : "Gaps, drift and tasks";
    case "close":
      return c.state === "closed" ? `Closed ${fmtDate(c.closed_at)}` : "What must be true to close";
  }
}

function NothingForYou({ change, waiting, lastDone }: { change: RuleChange; waiting: string[]; lastDone?: string }) {
  const who = Array.from(new Set(waiting.filter(Boolean)));
  return (
    <div className="rounded-[14px] border border-line bg-surface px-6 py-5">
      <p className="text-[16px] font-medium">{change.state === "closed" ? "This change is closed." : change.state === "screened_out" ? "Nothing to do. This rule doesn't apply." : "Nothing needs you here."}</p>
      <p className="mt-1 text-[14px] text-ink2">
        {who.length ? `Waiting on ${who.join(" and ")}.` : change.state === "closed" ? `Closed by ${userById(change.closed_by ?? "")?.name} on ${fmtDate(change.closed_at)}.` : `${userById(change.owner_id)?.name} owns the next step.`}
        {lastDone ? ` You did: ${lastDone}.` : ""}
      </p>
      {who.length ? (
        <Link href="/tasks/" className="mt-3 inline-block text-[14px] font-medium underline underline-offset-4">
          See who has it
        </Link>
      ) : null}
    </div>
  );
}

function WhoHasThis({ change, myTaskOwner, blockers }: { change: RuleChange; myTaskOwner?: string; blockers: string[] }) {
  const closed = change.state === "closed" || change.state === "screened_out";
  const now = closed ? null : myTaskOwner ?? blockers[0] ?? change.owner_id;
  const rows = [
    { k: "Now", v: now },
    { k: "Next", v: closed ? null : "u-anthony" },
    { k: "Waiting on", v: closed ? null : blockers[0] && blockers[0] !== now ? blockers[0] : blockers[1] ?? null },
  ];
  return (
    <dl className="flex flex-col self-end rounded-[14px] border border-line bg-surface px-5 py-3 lg:col-span-4">
      <div className="flex items-center justify-between border-b border-line py-2">
        <dt className="text-[13px] text-ink2">Owner</dt>
        <dd>
          <PersonTag id={change.owner_id} />
        </dd>
      </div>
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between border-b border-line py-2 last:border-b-0">
          <dt className="text-[13px] text-ink2">{r.k}</dt>
          <dd>{r.v ? <PersonTag id={r.v} /> : <span className="text-[13px] text-ink3">{change.state === "screened_out" ? "Not needed" : closed ? "Closed" : "No one"}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Before a run: what is known already, and the one action. No empty cards. */
function WhatWeKnow({ change }: { change: RuleChange }) {
  const changed = sectionsFor(change.id).filter((s) => s.changed);
  const tags = Array.from(new Set(dutiesFor(change.id).filter((d) => d.applicability === "in_scope").flatMap((d) => d.process_tags)));
  const reg = regulationById(change.regulation_id);
  return (
    <section aria-label="What we know" className="rounded-[14px] border border-line bg-surface shadow-(--shadow-rest)">
      <div className="border-b border-line px-6 py-4">
        <h2 className="t-section">What we know</h2>
      </div>
      <div className="grid gap-8 px-6 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-[24px]">{change.summary}</p>
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink3">What changed · {changed.length} sections</div>
            <ul className="flex flex-col gap-3">
              {changed.map((s) => (
                <li key={s.id} className="rounded-[12px] bg-surface2 px-4 py-3">
                  <div className="t-data text-[11.5px] text-ink2">
                    {s.section_number} · {s.heading}
                  </div>
                  <p className="mt-1 text-[14px] leading-[23px]">
                    <Diff before={s.before} after={s.after} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <dl className="flex flex-col gap-4 text-[14px]">
          <div>
            <dt className="text-[12.5px] font-medium text-ink3">Effective</dt>
            <dd className="mt-0.5">
              {fmtDate(change.effective_date)} · {relDays(change.effective_date)}
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] font-medium text-ink3">Likely touches</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-surface2 px-2.5 py-1 text-[13px]">
                  {TAG_WORDS[t] ?? t}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] font-medium text-ink3">Last read by Madison</dt>
            <dd className="mt-0.5">Today {reg ? fmtTime(reg.last_check.checked_at) : "05:00"}, from eCFR</dd>
          </div>
          <div>
            <dt className="text-[12.5px] font-medium text-ink3">Steps</dt>
            <dd className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink3">
              {STEPS.map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  {i ? <span className="h-px w-3 bg-line-strong" /> : null}
                  <Square size={7} filled={false} color="var(--lineStrong)" className="rounded-[2px]" />
                  {STEP_LABEL[s]}
                </span>
              ))}
              <span className="ml-1 rounded-full bg-surface2 px-2 py-0.5">Not read yet</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Reopen({ change }: { change: RuleChange }) {
  const persona = useStore((s) => s.persona);
  const decide = useStore((s) => s.decide);
  const toast = useStore((s) => s.toast);
  const done = useStore((s) => s.decisions.some((d) => d.changeId === change.id && d.label === "Reopen if this changes"));
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-surface2 px-4 py-3">
      <span className="text-[14px] text-ink2">If Northgate starts offering prepaid accounts, this rule applies and Madison reads it again.</span>
      <Button
        variant="quiet"
        size={32}
        disabled={done}
        onClick={() => {
          decide({ label: "Reopen if this changes", text: `Asked Madison to re-check ${change.citation} if prepaid accounts are offered`, by: persona, at: new Date().toISOString(), changeId: change.id });
          toast("Saved. Madison re-checks this rule if prepaid accounts are offered.");
        }}
      >
        {done ? "Watching for a change" : "Reopen if this changes"}
      </Button>
    </div>
  );
}

function TouchesOver({ change, open, onOpenChange }: { change: RuleChange; open: boolean; onOpenChange: (o: boolean) => void }) {
  const imp = impactFor(change.id);
  const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
  const vendors = vendorsFor(change.id);
  const policies = imp?.policy_sections ?? Array.from(new Set(ds.flatMap((d) => linksFor(d.id).map((l) => l.policy_section_id).filter(Boolean) as string[])));
  const controls = imp?.controls ?? Array.from(new Set(ds.flatMap((d) => linksFor(d.id).map((l) => l.control_id).filter(Boolean) as string[])));
  const procedures = imp?.procedure_sections ?? [];
  const Row = ({ href, title, sub, right }: { href: string; title: string; sub?: string; right?: React.ReactNode }) => (
    <li className="border-b border-line last:border-b-0">
      <Link href={href} onClick={() => onOpenChange(false)} className="flex items-start justify-between gap-3 py-2.5 hover:bg-surface2">
        <span className="min-w-0">
          <span className="block text-[14px]">{title}</span>
          {sub ? <span className="block text-[12.5px] text-ink2">{sub}</span> : null}
        </span>
        {right}
      </Link>
    </li>
  );
  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title="What it touches" subtitle={change.citation}>
      <div className="flex flex-col gap-7">
        <section>
          <h3 className="mb-1 text-[13px] font-medium text-ink3">Vendors · {vendors.length}</h3>
          <ul>
            {vendors.map(({ vendor, why }) => (
              <Row key={vendor.id} href={`/rules/${change.id}/#card-whats_left`} title={vendor.name} sub={`${why} · owner ${userById(vendor.relationship_owner_id)?.name}`} right={<span className="text-[12px] text-ink3">{vendor.criticality}</span>} />
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-[13px] font-medium text-ink3">Obligations · {ds.length}</h3>
          <ul>{ds.map((d) => <Row key={d.id} href={`/obligations/${d.id}/`} title={d.plain} right={<ObState id={d.id} />} />)}</ul>
        </section>
        <section>
          <h3 className="mb-1 text-[13px] font-medium text-ink3">Policy sections · {policies.length}</h3>
          <ul>
            {policies.map((id) => {
              const p = policyById(id)!;
              return <Row key={id} href={`/coverage/?view=documents&doc=${id}`} title={`${p.document_code} ${p.section_number} ${p.heading}`} sub={p.drift ? "Disagrees with its procedure" : undefined} />;
            })}
          </ul>
        </section>
        {procedures.length ? (
          <section>
            <h3 className="mb-1 text-[13px] font-medium text-ink3">Procedures · {procedures.length}</h3>
            <ul>
              {procedures.map((id) => {
                const p = procedureById(id)!;
                return <Row key={id} href={`/coverage/?view=documents&doc=${id}`} title={`${p.document_code} ${p.section_number.toLowerCase()} ${p.heading}`} />;
              })}
            </ul>
          </section>
        ) : null}
        <section>
          <h3 className="mb-1 text-[13px] font-medium text-ink3">Controls · {controls.length}</h3>
          <ul>
            {controls.map((id) => {
              const ctl = controlById(id)!;
              return <Row key={id} href={`/obligations/?control=${id}`} title={`${id} ${ctl.name}`} sub={ctl.freshness_status === "quiet" ? `No evidence for ${ctl.quiet_days} days` : `${ctl.cadence ?? "No cadence"} · evidence ${fmtDate(ctl.last_artifact_date)}`} />;
            })}
          </ul>
        </section>
      </div>
    </SlideOver>
  );
}

function ObState({ id }: { id: string }) {
  const d = getDuty(id)!;
  const st = useStore((s) => s.obligationStates[id]) ?? d.coverage_state;
  return <StatusChip state={st} size="sm" />;
}

export { Initials, getChange };
