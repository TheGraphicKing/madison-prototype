"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Duty, RuleChange } from "@/data/types";
import {
  consequenceFor,
  controlById,
  driftFlags,
  dutiesFor,
  handoffById,
  impactFor,
  institution,
  knownGaps,
  linksFor,
  policyById,
  procedureById,
  run as getRun,
  userById,
} from "@/data";
import { useStore } from "@/lib/store";
import { useCoverage } from "@/lib/use-change";
import { handoffStatus, useTaskViews } from "@/lib/work";
import { fmtDate, relDays } from "@/lib/dates";
import { CertaintyWord, certaintyFrom, FOUR_STATES, STATE_COLOR, STATE_LABEL, StatusChip } from "@/components/core/status";
import { Button } from "@/components/core/button";
import { Mark } from "@/components/core/mark";
import { PersonTag } from "@/components/core/tags";
import { DriftPair } from "./drift-pair";
import { BlockerBanner } from "@/components/decision/blocker-banner";
import { StateChip } from "@/components/tasks/task-drawer";

export type CardKey = "applies" | "obligations" | "linked" | "covered" | "whats_left" | "close";
export const CARD_TITLE: Record<CardKey, string> = {
  applies: "Applies",
  obligations: "Obligations",
  linked: "Linked",
  covered: "Covered",
  whats_left: "What's left",
  close: "Close",
};
/** The run step each card's "See how" opens. */
const CARD_STEP: Record<string, Partial<Record<CardKey, string>>> = {
  "run-rule-1005": { applies: "scope", obligations: "duties", linked: "coverage", covered: "coverage", whats_left: "touches", close: "decide" },
  "run-coverage-1026": { linked: "search", whats_left: "compare", covered: "decide" },
  "run-design-mfa": { whats_left: "checks", covered: "publish", close: "signoff", linked: "draft" },
};

export function Card({
  k,
  change,
  open,
  onToggle,
  summary,
  runId,
  showHow,
  blocked,
  children,
}: {
  k: CardKey;
  change: RuleChange;
  open: boolean;
  onToggle: () => void;
  summary: React.ReactNode;
  runId?: string;
  showHow: boolean;
  blocked?: boolean;
  children: React.ReactNode;
}) {
  const step = runId ? CARD_STEP[runId]?.[k] : undefined;
  return (
    <section id={`card-${k}`} className={cn("scroll-mt-24 rounded-[14px] border bg-surface shadow-(--shadow-rest)", open ? "border-line-strong" : "border-line")}>
      <div className="flex items-center gap-4 px-5 py-4">
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span className="t-section w-[130px] shrink-0">{CARD_TITLE[k]}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] text-ink2">{summary}</span>
        </button>
        {blocked ? <span className="shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-[12px] font-medium text-warn">Blocked</span> : null}
        {showHow && step && runId ? (
          <Link href={`/rules/${change.id}/?replay=1`} className="shrink-0 text-[13px] text-ink2 underline underline-offset-4 hover:text-ink">
            See how
          </Link>
        ) : null}
        <button onClick={onToggle} aria-label={open ? "Collapse" : "Expand"} className="shrink-0 text-ink3 hover:text-ink">
          <Mark kind={open ? "chevron-up" : "chevron-down"} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="border-t border-line px-5 py-5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

// ---------- Applies ----------

const FACTS_FOR: Record<string, string[]> = {
  "RC-2026-014": ["consumer_eft", "debit_cards", "prepaid_cards"],
  "RC-2026-011": ["consumer_deposits", "wires"],
  "RC-2026-016": ["mortgage_origination"],
  "RC-2026-013": ["consumer_deposits"],
  "RC-2026-018": ["prepaid_cards"],
  "RC-2026-019": ["flood_zone_lending", "mortgage_origination"],
  "RC-2026-009": ["brokered_deposits"],
  "RC-2026-012": ["wires"],
  "RC-2026-017": ["consumer_deposits"],
};
const FLAG_LABEL: Record<string, string> = {
  consumer_eft: "Electronic transfers",
  debit_cards: "Debit cards",
  prepaid_cards: "Prepaid cards",
  wires: "Wires",
  mortgage_origination: "Mortgage lending",
  flood_zone_lending: "Flood zone lending",
  consumer_deposits: "Consumer deposits",
  brokered_deposits: "Brokered deposits",
};

export function appliesVerdict(c: RuleChange, answered?: string) {
  if (c.state === "screened_out") return "Doesn't apply";
  if (c.state === "uncertain" && !answered) return "Needs a bank fact";
  if (c.state === "new") return "Not checked yet";
  return "Applies";
}

export function AppliesBody({ change }: { change: RuleChange }) {
  const fact = useStore((s) => s.facts.flood_zone_lending);
  const r = change.run_id ? getRun(change.run_id) : undefined;
  const scope = r?.events.find((e) => e.type === "check" && e.gate === "RC-17");
  const verdict = appliesVerdict(change, fact?.value);
  const raw =
    change.state === "screened_out" || change.state === "uncertain"
      ? change.screen_reason
      : scope && scope.type === "check"
        ? scope.reason
        : `${change.summary}`;
  // the bank facts are shown as chips below, so the sentence drops its "(profile: …)" note
  const sentence = raw?.replace(/\s*\((bank )?profile:[^)]*\)/i, "");
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="text-[20px] leading-7 font-medium">{verdict}</div>
        <p className="text-[14.5px] leading-[23px] text-ink2">{sentence}</p>
        <CertaintyWord value={change.state === "uncertain" && !fact ? "Unsure" : "Clear"} />
        <div className="text-[13px] text-ink2">
          Decided by Madison&apos;s scope check · confirmed by {userById(change.owner_id)?.name}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12.5px] font-medium text-ink3">Bank facts used · profile {fmtDate(institution.profile_retrieved_at)}</div>
        <div className="flex flex-wrap gap-1.5">
          {(FACTS_FOR[change.id] ?? []).map((f) => {
            const v = f === "flood_zone_lending" && fact ? fact.value === "Yes" : institution.product_flags[f];
            return (
              <span key={f} className={cn("rounded-full px-3 py-1 text-[13px]", v === null || v === undefined ? "bg-warn-soft text-warn" : v ? "bg-ok-soft text-ok" : "bg-surface2 text-ink2")}>
                {FLAG_LABEL[f] ?? f}: {v === null || v === undefined ? "not answered" : v ? "yes" : "no"}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Obligations ----------

export function ObligationsBody({ change }: { change: RuleChange }) {
  const all = dutiesFor(change.id);
  const inScope = all.filter((d) => d.applicability === "in_scope");
  const excluded = all.filter((d) => d.applicability === "excluded");
  const r = change.run_id ? getRun(change.run_id) : undefined;
  const finished = useStore((s) => (r ? Boolean(s.finishedRuns[r.id]) : false));
  const held = r && finished ? r.events.filter((e) => e.type === "check" && e.gate === "RC-04" && e.result === "block") : [];
  return (
    <div className="flex flex-col gap-6">
      <div className="text-[14px] text-ink2">
        {inScope.length} obligation{inScope.length === 1 ? "" : "s"} for Northgate{excluded.length ? `, ${excluded.length} excluded` : ""}
        {held.length ? `, ${held.length} held back` : ""}.
      </div>
      <ul className="flex flex-col overflow-clip rounded-[12px] border border-line">
        {inScope.map((d) => (
          <ObligationRow key={d.id} d={d} />
        ))}
      </ul>
      {excluded.length ? (
        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink3">Excluded ({excluded.length})</div>
          {excluded.map((d) => (
            <p key={d.id} className="text-[14px] leading-[22px]">
              {d.plain} <span className="text-ink2">· {d.applicability_reason}</span>
            </p>
          ))}
        </div>
      ) : null}
      {held.length ? (
        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink3">Held back ({held.length})</div>
          {held.map((e) =>
            e.type === "check" ? (
              <p key={e.item_ref} className="text-[14px] leading-[22px]">
                {heldLabel(r!, e.item_ref)}{" "}
                <span className="text-ink2">· {e.reason}</span>
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function heldLabel(r: NonNullable<ReturnType<typeof getRun>>, id: string) {
  for (const e of r.events) if (e.type === "item" && e.id === id) return e.label;
  return id;
}

function ObligationRow({ d }: { d: Duty }) {
  const st = useCoverage(d);
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={`/obligations/${d.id}/`} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-surface2 max-md:grid-cols-1 max-md:gap-1.5">
        <span className="min-w-0">
          <span className="block text-[14.5px] leading-[22px]">{d.plain}</span>
          <span className="t-data block text-[11px] text-ink3">{d.citation}</span>
        </span>
        <CertaintyWord value={certaintyFrom(d.confidence)} quiet />
        <PersonTag id={d.owner_id} />
        <StatusChip state={st} size="sm" />
      </Link>
    </li>
  );
}

// ---------- Linked ----------

export function LinkedBody({ change }: { change: RuleChange }) {
  const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
  const decisions = useStore((s) => s.linkDecisions);
  const decideLink = useStore((s) => s.decideLink);
  const decide = useStore((s) => s.decide);
  const toast = useStore((s) => s.toast);
  const persona = useStore((s) => s.persona);
  return (
    <ul className="flex flex-col gap-3">
      {ds.map((d) => {
        const links = linksFor(d.id);
        const drift = driftFlags.find((x) => x.obligation_id === d.id);
        return (
          <li key={d.id} className="rounded-[12px] bg-surface2 px-4 py-3">
            <Link href={`/obligations/${d.id}/`} className="text-[14.5px] font-medium hover:underline">
              {d.plain}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {links.length === 0 ? <span className="rounded-full bg-risk-soft px-2.5 py-1 text-[12.5px] text-risk">Nothing behind it</span> : null}
              {links.map((l, i) => {
                const status: string = decisions[l.id] ?? l.status;
                const target = l.policy_section_id ? policyById(l.policy_section_id)! : null;
                const ctl = l.control_id ? controlById(l.control_id)! : null;
                const label = target ? `Policy ${target.document_code} ${target.section_number}` : `Control ${ctl!.id}`;
                const href = target ? `/coverage/?view=documents&doc=${target.id}` : `/obligations/${d.id}/`;
                return (
                  <span key={l.id} className="flex items-center gap-1.5">
                    {i > 0 ? <span className="h-px w-3 bg-line-strong" aria-hidden /> : null}
                    <Link href={href} className={cn("rounded-full px-2.5 py-1 text-[12.5px]", status === "rejected" ? "bg-surface3 text-ink3 line-through" : l.strength === "full" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")} title={`“${l.quote}”`}>
                      {label} · {l.strength}
                      {status === "proposed" ? " · proposed" : ""}
                    </Link>
                    {status === "proposed" ? (
                      <>
                        <Button size={32} variant="quiet" onClick={() => {
                          decideLink(l.id, "confirmed");
                          decide({ label: "Confirm", text: `Confirmed link ${d.id} to ${label}`, by: persona, at: new Date().toISOString(), changeId: change.id });
                          toast(`Confirmed: ${label}`);
                        }}>
                          Confirm
                        </Button>
                        <Button size={32} variant="text" onClick={() => {
                          decideLink(l.id, "rejected");
                          decide({ label: "Reject", text: `Rejected link ${d.id} to ${label}`, by: persona, at: new Date().toISOString(), changeId: change.id });
                          toast(`Rejected: ${label}`);
                        }}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </span>
                );
              })}
              {drift ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-px w-3 bg-risk" aria-hidden />
                  <Link href={`/coverage/?view=documents&doc=${drift.procedure_section_id}`} className="rounded-full bg-risk-soft px-2.5 py-1 text-[12.5px] text-risk">
                    Procedure {procedureById(drift.procedure_section_id)?.document_code} {procedureById(drift.procedure_section_id)?.section_number.toLowerCase()} · drift
                  </Link>
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Covered ----------

export function CoveredBody({ change }: { change: RuleChange }) {
  const k = change.counts;
  if (!k) return <p className="text-[14px] text-ink3">Counts appear once obligations are linked.</p>;
  const total = FOUR_STATES.reduce((n, s) => n + (k[s as "covered"] ?? 0), 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface2" role="img" aria-label={FOUR_STATES.map((s) => `${k[s as "covered"]} ${STATE_LABEL[s].toLowerCase()}`).join(", ")}>
        {FOUR_STATES.map((s) => (k[s as "covered"] ? <span key={s} style={{ width: `${(k[s as "covered"] / total) * 100}%`, background: `var(--viz${s === "covered" ? "Ok" : s === "not_yet_confirmed" ? "Warn" : s === "nothing_behind" ? "Risk" : "Info"})` }} /> : null))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
        {FOUR_STATES.map((s) => (
          <Link key={s} href={`/obligations/?state=${s}`} className="rounded-[12px] bg-surface2 px-4 py-3 hover:bg-surface3">
            <span className="block text-[24px] leading-7 font-medium tabular-nums">{k[s as "covered"]}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[13px] text-ink2">
              <span className="block size-[7px] rounded-[2px]" style={{ background: STATE_COLOR[s] }} />
              {STATE_LABEL[s]}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-ink2">
        {k.covered + k.not_yet_confirmed + k.nothing_behind + k.known_gap} of {k.duties} obligations. The four counts always add up.
      </p>
    </div>
  );
}

// ---------- What's left ----------

export function WhatsLeftBody({ change }: { change: RuleChange }) {
  const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
  const overrides = useStore((s) => s.obligationStates);
  const views = useTaskViews();
  const openTask = useStore((s) => s.openTask);
  const stateOf = (d: Duty) => overrides[d.id] ?? d.coverage_state;
  const gaps = ds.filter((d) => stateOf(d) === "nothing_behind" || stateOf(d) === "not_yet_confirmed" || stateOf(d) === "known_gap");
  const drift = driftFlags.filter((dr) => ds.some((d) => d.id === dr.obligation_id) && stateOf(ds.find((d) => d.id === dr.obligation_id)!) !== "covered");
  const ts = views.filter((v) => v.task.change_id === change.id || (v.task.obligation_id && ds.some((d) => d.id === v.task.obligation_id)));
  const kg = knownGaps.filter((g) => ds.some((d) => d.id === g.obligation_id));
  return (
    <div className="flex flex-col gap-6">
      <BlockerBanner changeId={change.id} />
      {gaps.length ? (
        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink3">Gaps · {gaps.length}</div>
          <ul className="flex flex-col gap-2">
            {gaps.map((d) => {
              const c = consequenceFor(d.id);
              return (
                <li key={d.id} className="rounded-[12px] bg-surface2 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link href={`/obligations/${d.id}/`} className="min-w-0 flex-1 text-[14.5px] font-medium hover:underline">
                      {d.plain}
                    </Link>
                    <StatusChip state={stateOf(d)} size="sm" />
                  </div>
                  <p className="mt-1 text-[13.5px] leading-[21px] text-ink2">
                    {c ? (
                      <>
                        {c.headline}. Exam risk {c.exam_risk.toLowerCase()}. {c.next}
                      </>
                    ) : (
                      "The owner confirms the evidence, then it counts as covered."
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-[14px] text-ok">No gaps left on this change.</p>
      )}
      {drift.map((dr) => (
        <DriftPair key={dr.id} drift={dr} />
      ))}
      {kg.map((g) => (
        <div key={g.id} className="rounded-[12px] bg-info-soft px-4 py-3">
          <div className="text-[14px] font-medium text-info">
            Known gap {g.id} · accepted until {fmtDate(g.expiry)}
          </div>
          <p className="mt-1 text-[14px] leading-[22px]">{g.rationale}</p>
          <p className="mt-1 text-[12.5px] text-ink2">
            Accepted by {userById(g.accepted_by_user_id)?.name} on {fmtDate(g.accepted_at)}
          </p>
        </div>
      ))}
      {ts.length ? (
        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink3">Tasks · {ts.length}</div>
          <ul className="flex flex-col overflow-clip rounded-[12px] border border-line">
            {ts.map((v) => (
              <li key={v.task.id} className="border-b border-line last:border-b-0">
                <button onClick={() => openTask(v.task.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 px-4 py-3 text-left hover:bg-surface2 max-md:grid-cols-1 max-md:gap-1">
                  <span className={cn("text-[14px]", v.state === "done" && "text-ink3 line-through")}>{v.task.title}</span>
                  <PersonTag id={v.task.assignee_id} />
                  <span className="text-[13px] text-ink2">
                    {fmtDate(v.task.due)} · {relDays(v.task.due)}
                  </span>
                  <StateChip state={v.state} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Close ----------

export function CloseBody({ change }: { change: RuleChange }) {
  const s = useStore();
  const ds = dutiesFor(change.id).filter((d) => d.applicability === "in_scope");
  const stateOf = (d: Duty) => s.obligationStates[d.id] ?? d.coverage_state;
  const settled = ds.filter((d) => stateOf(d) === "covered" || stateOf(d) === "known_gap").length;
  const imp = impactFor(change.id);
  const vendorHandoff = handoffById("H-113");
  const vendorsDone = imp ? vendorHandoff && handoffStatus(vendorHandoff, s) === "done" : true;
  const signed =
    change.state === "closed" ||
    (change.id === "RC-2026-014" && s.decisions.some((d) => d.label === "Accept the impact")) ||
    (change.id === "RC-2026-011" && handoffStatus(handoffById("H-116")!, s) === "done");
  const items = [
    { label: "Every obligation is covered or accepted", ok: ds.length > 0 && settled === ds.length, detail: `${settled} of ${ds.length}` },
    { label: "Every vendor in scope has answered", ok: Boolean(vendorsDone), detail: imp ? `${imp.vendors.length} vendors` : "No vendors in scope" },
    { label: "The CCO has signed off", ok: signed, detail: signed ? (change.closed_by ? `${userById(change.closed_by)?.name}, ${fmtDate(change.closed_at)}` : "Signed") : "Not yet" },
  ];
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 rounded-[12px] bg-surface2 px-4 py-3">
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", i.ok ? "bg-ok text-surface" : "shadow-[inset_0_0_0_1.5px_var(--lineStrong)]")}>{i.ok ? <Mark kind="check" size={12} /> : null}</span>
            <span className="flex-1 text-[14.5px]">{i.label}</span>
            <span className="text-[13px] text-ink2">{i.detail}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13.5px] text-ink2">
        Signs to close: {userById("u-anthony")?.name}, Chief Compliance Officer. {items.every((i) => i.ok) ? "Everything is in place." : `${items.filter((i) => !i.ok).length} still to do.`}
      </p>
    </div>
  );
}

export function AppliesChip({ verdict, className }: { verdict: string; className?: string }) {
  const tone = verdict === "Applies" ? "bg-ok-soft text-ok" : verdict === "Doesn't apply" ? "bg-surface2 text-ink2" : verdict === "Needs a bank fact" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap", tone, className)}>{verdict}</span>;
}
