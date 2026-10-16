"use client";

// One plot's detail: its four counts, what covers it, what does not and why, what the bank is
// accepting, what it means in practice, and the next steps. Exposure is words only, never a figure.
import Link from "next/link";
import { consequenceFor, controlById, gapFor, getChange, getDuty, linksFor, policyById, userById } from "@/data";
import type { Duty } from "@/data/types";
import { STATES, type Plot } from "@/lib/coverage-field";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/dates";
import { StatusChip } from "@/components/core/status";
import { ButtonLink } from "@/components/core/button";
import { Mark } from "@/components/core/mark";

export function PlotDetail({ plot, onClose }: { plot: Plot; onClose: () => void }) {
  const states = useStore((s) => s.obligationStates);
  const duties = plot.dutyIds.map((id) => getDuty(id)).filter(Boolean) as Duty[];
  const stateOf = (d: Duty) => states[d.id] ?? d.coverage_state;

  // what covers it: the policies and controls linked to its obligations, most used first
  const by = new Map<string, { label: string; href: string; n: number }>();
  for (const d of duties)
    for (const l of linksFor(d.id)) {
      if (l.policy_section_id) {
        const p = policyById(l.policy_section_id);
        if (p) {
          const k = `p:${p.id}`;
          by.set(k, { label: `${p.document_code} ${p.section_number} ${p.heading}`, href: `/coverage/?view=documents&doc=${p.id}`, n: (by.get(k)?.n ?? 0) + 1 });
        }
      }
      if (l.control_id) {
        const c = controlById(l.control_id);
        if (c) {
          const k = `c:${c.id}`;
          by.set(k, { label: `${c.id} ${c.name}`, href: `/obligations/?control=${c.id}`, n: (by.get(k)?.n ?? 0) + 1 });
        }
      }
    }
  const coveredBy = [...by.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  const notCovered = duties.filter((d) => ["nothing_behind", "not_yet_confirmed"].includes(stateOf(d)));
  const accepted = duties.filter((d) => stateOf(d) === "known_gap");
  const worst = [...notCovered, ...accepted].map((d) => consequenceFor(d.id)).find(Boolean);
  const gaps = plot.counts.nothing_behind + plot.counts.known_gap + plot.counts.not_yet_confirmed;

  return (
    <aside aria-label={`${plot.short} detail`} className="flex flex-col gap-6 rounded-[14px] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="t-data text-[12px] text-ink2">{plot.citation}</div>
          <h2 className="t-section mt-1">{plot.title}</h2>
        </div>
        <button onClick={onClose} aria-label="Back to all plots" className="-mr-1 inline-flex size-8 items-center justify-center rounded-[10px] text-ink2 hover:bg-surface2 hover:text-ink">
          <Mark kind="close" />
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {STATES.map((s) => (
          <li key={s} className="rounded-[12px] bg-surface2 px-3 py-2.5">
            <div className="text-[22px] leading-7 font-medium tabular-nums">{plot.counts[s]}</div>
            <StatusChip state={s} size="sm" />
          </li>
        ))}
      </ul>

      <Block title="What we're covered by">
        {coveredBy.length ? (
          <ul className="flex flex-col">
            {coveredBy.map((c) => (
              <li key={c.href} className="border-b border-line last:border-b-0">
                <Link href={c.href} className="flex items-baseline justify-between gap-3 py-2 text-[13.5px] leading-5 hover:underline">
                  <span>{c.label}</span>
                  <span className="shrink-0 text-[12px] text-ink3">{c.n} {c.n === 1 ? "obligation" : "obligations"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] leading-5 text-ink2">{plot.counts.covered} obligations are covered by policies and controls on record. Open the register to see each link.</p>
        )}
      </Block>

      <Block title="What isn't covered">
        {notCovered.length ? (
          <ul className="flex flex-col gap-2">
            {notCovered.map((d) => (
              <li key={d.id} className="rounded-[12px] bg-surface2 px-3.5 py-3">
                <Link href={`/obligations/${d.id}/`} className="text-[14px] leading-5 font-medium hover:underline">
                  {d.plain}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink2">
                  <StatusChip state={stateOf(d)} size="sm" />
                  <span>Owner {userById(d.owner_id)?.name}</span>
                  {d.change_id && (getChange(d.change_id)?.effective_date ?? "") > "2026-10-16" ? <span className="text-ink3">From the change effective {fmtDate(getChange(d.change_id)!.effective_date)}, not yet in the counts</span> : null}
                </div>
                <p className="mt-1.5 text-[13px] leading-5 text-ink2">{consequenceFor(d.id)?.headline ?? (stateOf(d) === "nothing_behind" ? "No policy or control stands behind it yet." : "Linked, but the owner has not confirmed the evidence.")}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] leading-5 text-ink2">{gaps ? `${gaps} obligations here are not fully covered; the register lists each with its owner.` : "Everything in this regulation is covered."}</p>
        )}
      </Block>

      <Block title="What we're accepting">
        {accepted.length ? (
          <ul className="flex flex-col gap-2">
            {accepted.map((d) => {
              const g = gapFor(d.id);
              return (
                <li key={d.id} className="rounded-[12px] bg-info-soft px-3.5 py-3 text-[13px] leading-5">
                  <div className="font-medium text-ink">{d.plain}</div>
                  {g ? (
                    <p className="mt-1 text-ink2">
                      Accepted by {userById(g.accepted_by_user_id)?.name} on {fmtDate(g.accepted_at)}, until {fmtDate(g.expiry)}. {g.rationale}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13.5px] leading-5 text-ink2">{plot.counts.known_gap ? `${plot.counts.known_gap} known gaps are accepted on record, each with an owner and an expiry.` : "No known gaps are accepted here."}</p>
        )}
      </Block>

      <Block title="What it means">
        {worst ? (
          <div className="flex flex-col gap-2 text-[13.5px] leading-[21px]">
            <p className="text-[15px] leading-[22px] font-medium">{worst.headline}</p>
            <p className="text-ink2">{worst.what_happens}</p>
            <p>
              <span className="text-ink3">Who is affected · </span>
              {worst.who_is_affected}
            </p>
            <p>
              <span className="text-ink3">Exam risk · </span>
              <span className={worst.exam_risk === "High" ? "font-medium text-risk" : worst.exam_risk === "Medium" ? "font-medium text-warn" : "font-medium"}>{worst.exam_risk}</span>
              <span className="text-ink2"> · {worst.exam_note}</span>
            </p>
            <p className="rounded-[10px] bg-surface2 px-3 py-2 text-[12.5px] text-ink2">
              {worst.illustrative_exposure.label}: {worst.illustrative_exposure.text}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-[13.5px] leading-[21px] text-ink2">
            <p>{gaps ? "Where nothing stands behind an obligation, the bank cannot show an examiner how it meets it." : "Nothing here needs attention."}</p>
            <p>
              <span className="text-ink3">Exam risk · </span>
              <span className="font-medium text-ink">{plot.counts.nothing_behind > 1 ? "Medium" : "Low"}</span>
            </p>
            <p className="rounded-[10px] bg-surface2 px-3 py-2 text-[12.5px]">Illustrative only (synthetic): exposure is described in words, never as a figure.</p>
          </div>
        )}
      </Block>

      <div className="flex flex-wrap gap-2">
        {notCovered[0] ? (
          <ButtonLink href={`/obligations/${notCovered[0].id}/`} variant="primary" size={32}>
            Open the obligation
          </ButtonLink>
        ) : null}
        {worst ? (
          <ButtonLink href={`/obligations/${worst.obligation_id}/?tab=open`} variant="quiet" size={32}>
            Start a fix
          </ButtonLink>
        ) : null}
        <ButtonLink href="/tasks/" variant="quiet" size={32}>
          Open my tasks
        </ButtonLink>
      </div>
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-medium text-ink3">{title}</h3>
      {children}
    </section>
  );
}
