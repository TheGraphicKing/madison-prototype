"use client";

import Link from "next/link";
import type { Run } from "@/data/types";
import type { ItemInstance, RunState } from "@/lib/player/derive";
import { agentMeta, coverageLinks, driftFlags, getDuty, impactFor, policyById, controlById, procedureById, ruleSections, sectionsFor, userById, vendorById } from "@/data";
import { SlideOver } from "@/components/core/overlays";
import { MonoLabel } from "@/components/core/labels";
import { AgentTag, PersonTag } from "@/components/core/tags";
import { CertaintyWord, certaintyFrom, StatusChip } from "@/components/core/status";
import { Mark } from "@/components/core/mark";
import { TextScramble } from "@/components/motion-primitives/text-scramble";
import { ButtonLink } from "@/components/core/button";
import { fmtClock, fmtStamp, fmtUsd } from "@/lib/dates";
import type { Instance } from "@/lib/player/engine";

/** Highlights the quoted sentence inside the rule's own words. */
export function Quoted({ text, quote }: { text: string; quote?: string }) {
  if (!quote) return <>{text}</>;
  const i = text.toLowerCase().indexOf(quote.toLowerCase().slice(0, 40));
  if (i < 0) return <>{text}</>;
  const end = Math.min(text.length, i + quote.length);
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-highlight px-0.5 text-highlight-ink">{text.slice(i, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-4 border-b border-line py-3 last:border-b-0">
      <MonoLabel variant="plain" className="pt-[3px]">
        {label}
      </MonoLabel>
      <div className="min-w-0 text-[14px] leading-[22px] text-ink">{children}</div>
    </div>
  );
}

function sectionForLabel(label: string, changeId: string) {
  return sectionsFor(changeId).find((s) => s.section_number === label) ?? ruleSections.find((s) => s.section_number === label);
}

export function Inspector({
  run,
  state,
  item,
  instance,
  onClose,
}: {
  run: Run;
  state: RunState;
  item: ItemInstance | null;
  instance?: Instance;
  onClose: () => void;
}) {
  const open = Boolean(item);
  if (!item) return <SlideOver open={false} onOpenChange={() => onClose()} title="" children={null} />;

  const moves = run.events.filter((e) => e.type === "item" && e.id === item.id);
  const first = moves[0];
  const checks = state.checks.filter((c) => c.item_ref === item.id);
  const agent = item.agentId ?? (first?.type === "item" ? first.agent_id : undefined);
  const meta = agent ? agentMeta(agent) : undefined;
  const lastCheck = checks[checks.length - 1];
  const duration = lastCheck ? lastCheck.t - item.t : 700;
  // cost: the stage's cost spread evenly over what it produced (derived from the metric events)
  const stageKey = item.to;
  const st = state.stages[stageKey] ?? state.stages[item.from];
  const costAt = (t: number) => {
    let c = 0;
    for (const e of run.events) if (e.type === "metric" && e.key === "cost_usd" && e.t <= t) c = e.value;
    return c;
  };
  const stageItems = state.items.filter((i) => i.to === item.to).length || 1;
  const stageCost = st?.doneAt !== undefined && st.startedAt !== undefined ? Math.max(0, costAt(st.doneAt) - costAt(st.startedAt - 1)) : 0;
  const decided = state.responded.find((r) => r.event.items?.includes(item.id));
  const decidedBy = decided && instance?.answeredBy[decided.key];

  const duty = getDuty(item.id) ?? (item.parentRef ? getDuty(item.parentRef) : undefined);
  const isDuty = item.kind === "duty";
  const sec =
    isDuty && duty?.rule_section_id
      ? ruleSections.find((s) => s.id === duty.rule_section_id)
      : item.kind === "section"
        ? sectionForLabel(item.label, run.change_id)
        : isDuty && item.parentRef
          ? sectionForLabel(state.resting[item.parentRef]?.label ?? "", run.change_id)
          : undefined;
  const review = checks.find((c) => c.gate === "RC-04" || /^D\d$/.test(c.gate) || c.gate === "RC-12");
  const quote = checks.find((c) => c.gate === "QC-01");

  const linkTarget = item.kind === "link" ? item.id.split(">")[1] : null;
  const link = linkTarget ? coverageLinks.find((l) => l.obligation_id === item.parentRef && (l.policy_section_id === linkTarget || l.control_id === linkTarget)) : null;
  const touchRef = item.kind === "impact" ? item.id.replace(/^touch-/, "") : null;
  const vendor = touchRef ? vendorById(touchRef) : item.kind === "handoff" ? vendorById(item.label) : undefined;
  const why = touchRef ? impactFor(run.change_id)?.vendors.find((v) => v.vendor_id === touchRef)?.why : undefined;

  const title = isDuty ? duty?.plain ?? item.label : item.kind === "section" ? sec?.heading ?? item.label : item.label;
  const citation = isDuty ? duty?.citation ?? `${item.id}` : item.kind === "section" ? `12 CFR ${item.label}` : item.id;

  return (
    <SlideOver
      open={open}
      onOpenChange={(o) => !o && onClose()}
      subtitle={
        <MonoLabel>
          {item.kind.replace("_", " ")} · <TextScramble key={item.id} as="span" duration={0.6}>{citation}</TextScramble>
        </MonoLabel>
      }
      title={title}
      footer={
        duty && getDuty(duty.id) ? (
          <div className="flex items-center justify-between gap-4">
            <span className="t-small text-ink2">The duty room shows its whole lineage and history.</span>
            <ButtonLink href={`/duties/${duty.id}/`} variant="primary" size={32}>
              Open the duty room
            </ButtonLink>
          </div>
        ) : undefined
      }
    >
      {sec ? (
        <section className="mb-6">
          <MonoLabel>The rule&apos;s own words · {sec.section_number}</MonoLabel>
          <blockquote className="mt-2 border-l-2 border-ink pl-4 text-[15px] leading-[25px] text-ink">
            <Quoted text={sec.after} quote={duty?.source_text} />
          </blockquote>
          {sec.changed && item.kind === "section" ? (
            <p className="mt-3 text-[13px] leading-5 text-ink2">
              <span className="t-label mr-2">Before</span>
              {sec.before}
            </p>
          ) : null}
        </section>
      ) : null}
      {item.kind === "duty" && !getDuty(item.id) ? (
        <section className="mb-6 rounded-[2px] bg-risk-soft px-4 py-3">
          <div className="flex items-center gap-2 text-[14px] font-medium text-risk">
            <Mark kind="cross" /> Held back by the reviewer
          </div>
          <p className="mt-1 text-[14px] leading-[22px] text-ink">{review?.reason}</p>
          <p className="mt-1 text-[13px] leading-5 text-ink2">This proposal never became a duty. It stays in the record so an examiner can see what was rejected and why.</p>
        </section>
      ) : null}

      <div className="flex flex-col">
        {duty && isDuty ? <Row label="Plain version">{duty.plain}</Row> : null}
        {duty && isDuty ? (
          <Row label="Certainty">
            <CertaintyWord value={review?.certainty ?? certaintyFrom(duty.confidence)} />
          </Row>
        ) : null}
        {duty && isDuty ? (
          <Row label="Deadline">
            {duty.deadline_text} · <span className="text-ink2">{duty.actor}, {duty.action}</span>
          </Row>
        ) : null}
        {quote ? (
          <Row label="Quote check">
            <span className="inline-flex items-center gap-1.5">
              <Mark kind={quote.result === "pass" ? "check" : "cross"} className={quote.result === "pass" ? "text-ok" : "text-risk"} />
              {quote.reason}
            </span>
            <AgentTag id="QC-01" className="mt-1" />
          </Row>
        ) : null}
        {review ? (
          <Row label={review.gate === "RC-12" ? "Drift check" : /^D\d$/.test(review.gate) ? "Design check" : "Reviewer"}>
            <span className="inline-flex items-start gap-1.5">
              <Mark kind={review.result === "pass" ? "check" : "cross"} className={review.result === "pass" ? "mt-1 text-ok" : "mt-1 text-risk"} />
              <span>
                {review.result === "pass" ? "Verified. " : review.result === "block" ? "Held back. " : "Can't tell. "}
                {review.reason}
              </span>
            </span>
            {!/^D\d$/.test(review.gate) ? <AgentTag id={review.gate} className="mt-1" /> : null}
          </Row>
        ) : null}
        {link ? (
          <>
            <Row label="Linked to">
              {link.policy_section_id ? `${policyById(link.policy_section_id)?.document_code} ${policyById(link.policy_section_id)?.section_number} ${policyById(link.policy_section_id)?.heading}` : `${link.control_id} ${controlById(link.control_id!)?.name}`}
            </Row>
            <Row label="Quote">&ldquo;{link.quote}&rdquo;</Row>
            <Row label="Strength">{link.strength === "full" ? "Full" : "Partial"} · {link.status === "proposed" ? "Proposed" : "Confirmed"}</Row>
            {link.policy_section_id ? <Row label="Policy text">{policyById(link.policy_section_id)?.text}</Row> : null}
            {link.control_id && controlById(link.control_id)?.freshness_status === "quiet" ? (
              <Row label="Freshness">Quiet for {controlById(link.control_id)?.quiet_days} days on a {controlById(link.control_id)?.cadence} control</Row>
            ) : null}
          </>
        ) : null}
        {touchRef ? (
          <>
            {vendor ? <Row label="Vendor">{vendor.name} · {vendor.criticality} criticality</Row> : null}
            {why ? <Row label="Why in scope">{why}</Row> : null}
            {policyById(touchRef) ? <Row label="Policy text">{policyById(touchRef)?.text}</Row> : null}
            {procedureById(touchRef) ? <Row label="Procedure text">{procedureById(touchRef)?.text}</Row> : null}
            {driftFlags.filter((d) => d.procedure_section_id === touchRef || d.policy_section_id === touchRef).map((d) => (
              <Row key={d.id} label={`Drift ${d.id}`}>
                {d.summary}
              </Row>
            ))}
            {controlById(touchRef) ? <Row label="Control">{controlById(touchRef)?.name} · quiet {controlById(touchRef)?.quiet_days} days</Row> : null}
          </>
        ) : null}
        {item.kind === "candidate" ? <Row label="Match">{item.score ? <CertaintyWord value={item.score as "Clear"} /> : null}</Row> : null}
        {item.kind === "handoff" && vendor ? <Row label="Handoff">Vendor review of phishing-resistant MFA for {vendor.name}, owned by {userById(vendor.relationship_owner_id)?.name}</Row> : null}
        {duty && isDuty && getDuty(item.id) ? (
          <Row label="Coverage now">
            <StatusChip state={(state.resting[item.id]?.coverageState as "covered") ?? (decided ? "proposed" : "proposed")} label={state.resting[item.id]?.coverageState ? undefined : "Not matched yet"} />
          </Row>
        ) : null}
        <Row label="Agent">
          {agent ? <AgentTag id={agent} /> : <span className="text-ink2">Code step</span>}
          {meta ? <span className="t-data mt-1 block text-[11.5px] text-ink2">{meta.runs_on} · {meta.version}</span> : null}
        </Row>
        <Row label="Time and cost">
          <span className="t-data">
            at {fmtClock(item.t)} · {(duration / 1000).toFixed(1)} s{stageCost ? ` · ${fmtUsd(stageCost / stageItems)}` : ""}
          </span>
        </Row>
        <Row label="Decided by">
          {decidedBy ? (
            <span className="flex flex-col gap-1">
              <PersonTag id={decidedBy.by} />
              <span className="t-data text-[11.5px] text-ink2">{fmtStamp(decidedBy.at)}</span>
            </span>
          ) : (
            <span className="text-ink2">{isDuty ? "Proposed. Waits for a named person to accept it." : "No decision needed for this item."}</span>
          )}
        </Row>
      </div>
      {duty && !getDuty(item.id) && item.parentRef && getDuty(item.parentRef) ? (
        <Link href={`/duties/${item.parentRef}/`} className="mt-5 inline-block text-[14px] underline underline-offset-4">
          Open {item.parentRef}
        </Link>
      ) : null}
    </SlideOver>
  );
}
