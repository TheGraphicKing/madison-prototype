"use client";

import Link from "next/link";
import { useState } from "react";
import type { Run } from "@/data/types";
import type { RunState } from "@/lib/player/derive";
import { agentById, driftFlags, getDuty, impactFor, institution, linksFor, policyById, controlById, ruleSections, sectionsFor, userById, vendorById } from "@/data";
import { STEP_CARD, stepResult, stepTitle } from "@/lib/run-steps";
import { CertaintyWord, certaintyFrom, StatusChip } from "@/components/core/status";
import { Mark } from "@/components/core/mark";
import { Diff } from "@/components/change/diff";
import { DriftPair } from "@/components/change/drift-pair";
import { Quoted } from "@/components/run/quoted";
import { GlyphChevron } from "@/components/glyphs";

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2 text-[12.5px] font-medium text-ink3">{title}</h4>
      {children}
    </section>
  );
}

/** What a step read, what it found (in the rule's own words), the certainty and what it means for the bank. */
export function StepDetail({ run, stageKey, st, onClose }: { run: Run; stageKey: string; st: RunState; onClose?: () => void }) {
  const [how, setHow] = useState(false);
  const stage = run.stages.find((s) => s.key === stageKey)!;
  const s = st.stages[stageKey];
  const card = STEP_CARD[stageKey];
  const waiting = s.state === "waiting";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-medium text-ink3">Step {run.stages.indexOf(stage) + 1} of {run.stages.length}</div>
          <h3 className="mt-0.5 text-[21px] leading-7 font-medium tracking-[-0.01em]">{stepTitle(run, stageKey)}</h3>
          {!waiting ? <p className="mt-1 text-[14px] text-ink2">{stepResult(run, stageKey, st)}</p> : null}
        </div>
        {onClose ? (
          <button onClick={onClose} className="text-[13px] text-ink3 hover:text-ink" aria-label="Close the step">
            <Mark kind="close" />
          </button>
        ) : null}
      </div>
      {waiting ? <p className="text-[14px] text-ink3">This step has not started yet.</p> : <Body run={run} stageKey={stageKey} st={st} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {card && !waiting ? (
          <Link href={`/rules/${run.change_id}/#card-${card}`} className="text-[13.5px] font-medium underline underline-offset-4">
            See the result
          </Link>
        ) : (
          <span />
        )}
        <button onClick={() => setHow((h) => !h)} aria-expanded={how} className="flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink">
          <GlyphChevron dir={how ? "left" : "right"} size={14} className={how ? "-rotate-90" : "rotate-90"} />
          Show how Madison did this
        </button>
      </div>
      {how ? (
        <div data-how className="rounded-[12px] bg-surface2 px-4 py-3">
          <div className="text-[12.5px] font-medium text-ink3">Who worked on this step</div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {stage.agents.map((a) =>
              a.startsWith("person:") ? (
                <li key={a} className="text-[13.5px]">
                  {userById(a.slice(7))?.name} <span className="text-ink3">· a person decides</span>
                </li>
              ) : (
                <li key={a} className="text-[13.5px]">
                  {agentById(a)?.name} <span className="text-ink3">· {agentById(a)?.job}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Body({ run, stageKey, st }: { run: Run; stageKey: string; st: RunState }) {
  if (run.id === "run-rule-1005") {
    switch (stageKey) {
      case "text":
        return (
          <>
            <Part title="What was read">
              <p className="text-[14px] leading-[22px]">The amended 12 CFR 1005.11 from eCFR (Title 12, Part 1005), checked line by line against the Federal Register notice 2026-21877.</p>
            </Part>
            <Part title="What it means">
              <p className="text-[14px] leading-[22px]">Madison is working from the official text, so every obligation it finds can be traced to the rule&apos;s own words.</p>
            </Part>
          </>
        );
      case "sections":
        return (
          <Part title="What changed">
            <ul className="flex flex-col gap-3">
              {sectionsFor(run.change_id)
                .filter((x) => x.changed)
                .map((x) => (
                  <li key={x.id}>
                    <div className="t-data text-[11.5px] text-ink2">
                      {x.section_number} · {x.heading}
                    </div>
                    <p className="mt-1 text-[14px] leading-[23px]">
                      <Diff before={x.before} after={x.after} />
                    </p>
                  </li>
                ))}
            </ul>
          </Part>
        );
      case "scope":
        return (
          <>
            <Part title="What was read">
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["Electronic transfers", institution.product_flags.consumer_eft],
                  ["Debit cards", institution.product_flags.debit_cards],
                  ["Prepaid cards", institution.product_flags.prepaid_cards],
                ].map(([k, v]) => (
                  <span key={k as string} className="rounded-full bg-surface2 px-2.5 py-1 text-[12.5px]">
                    {k as string}: {v ? "yes" : "no"}
                  </span>
                ))}
              </div>
            </Part>
            <Part title="What it found">
              <p className="text-[14px] leading-[22px]">It applies. Northgate offers consumer electronic transfers and debit cards. Prepaid accounts are not offered, so the prepaid parts do not apply.</p>
              <CertaintyWord value="Clear" className="mt-2" />
            </Part>
          </>
        );
      case "duties":
      case "checks": {
        const ds = st.items.filter((i) => i.kind === "duty" && i.to === "duties");
        return (
          <Part title={stageKey === "duties" ? "What it found, in the rule's own words" : "Each one, checked twice"}>
            <ul className="flex flex-col gap-3">
              {ds.map((it) => {
                const d = getDuty(it.id);
                const rc = st.checkFor[`RC-04|${it.id}`];
                const sec = d?.rule_section_id ? ruleSections.find((x) => x.id === d.rule_section_id) : undefined;
                return (
                  <li key={it.key} className="rounded-[10px] bg-surface2 px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[14px] font-medium">{d?.plain ?? it.label}</span>
                      {stageKey === "checks" && rc ? (
                        <span className={rc.result === "pass" ? "text-[12.5px] text-ok" : "text-[12.5px] text-risk"}>{rc.result === "pass" ? "Verified" : "Held back"}</span>
                      ) : d ? (
                        <CertaintyWord value={certaintyFrom(d.confidence)} quiet />
                      ) : null}
                    </div>
                    {sec ? (
                      <p className="mt-1 text-[13px] leading-[21px] text-ink2">
                        <Quoted text={sec.after} quote={d?.source_text} />
                      </p>
                    ) : rc?.result === "block" ? (
                      <p className="mt-1 text-[13px] leading-[21px] text-risk">{rc.reason}</p>
                    ) : null}
                    {d?.applicability === "excluded" ? <p className="mt-1 text-[12.5px] text-ink3">Outside scope: {d.applicability_reason}</p> : null}
                  </li>
                );
              })}
            </ul>
          </Part>
        );
      }
      case "decide": {
        const r = st.responded[0];
        return r ? (
          <Part title="What was decided">
            <p className="text-[14px] leading-[22px]">
              6 obligations accepted, 1 excluded (prepaid accounts are not offered). The held-back proposal stays in the record with its reason.
            </p>
          </Part>
        ) : (
          <p className="text-[14px] text-ink2">Madison is waiting for a person.</p>
        );
      }
      case "coverage": {
        const ids = ["D-1005-E1", "D-1005-E2", "D-1005-E3", "D-1005-E4", "D-1005-E5", "D-1005-E6"];
        return (
          <>
            <Part title="What each obligation is matched to">
              <ul className="flex flex-col gap-2">
                {ids.map((id) => {
                  const d = getDuty(id)!;
                  const placed = st.resting[id];
                  const links = linksFor(id);
                  return (
                    <li key={id} className="flex items-start justify-between gap-3 rounded-[10px] bg-surface2 px-3.5 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium">{d.plain}</span>
                        <span className="t-data mt-0.5 block text-[11px] text-ink3">{links.map((l) => (l.policy_section_id ? policyById(l.policy_section_id)?.document_code + " " + policyById(l.policy_section_id)?.section_number : l.control_id)).join(" · ")}</span>
                      </span>
                      {placed && placed.coverageState ? <StatusChip state={placed.coverageState as "covered"} size="sm" /> : <span className="text-[12px] text-ink3">Matching</span>}
                    </li>
                  );
                })}
              </ul>
            </Part>
            {st.checkFor["RC-12|D-1005-E2"] ? (
              <Part title="Drift found">
                <DriftPair drift={driftFlags.find((x) => x.id === "DR-031")!} stacked />
              </Part>
            ) : null}
          </>
        );
      }
      case "touches": {
        const imp = impactFor(run.change_id)!;
        return (
          <>
            <Part title="Vendors in scope">
              <ul className="flex flex-col gap-1.5">
                {imp.vendors.map((v) => (
                  <li key={v.vendor_id} className="text-[14px]">
                    {vendorById(v.vendor_id)?.name} <span className="text-ink2">· {v.why}</span>
                  </li>
                ))}
              </ul>
            </Part>
            <Part title="Controls that are quiet">
              <ul className="flex flex-col gap-1.5">
                {imp.quiet_controls.map((c) => (
                  <li key={c} className="text-[14px]">
                    {c} {controlById(c)?.name} <span className="text-warn">· no evidence for {controlById(c)?.quiet_days} days</span>
                  </li>
                ))}
              </ul>
            </Part>
          </>
        );
      }
    }
  }
  if (run.id === "run-coverage-1026") {
    const d = getDuty("D-1026-L2")!;
    if (stageKey === "read")
      return (
        <Part title="The rule's own words">
          <p className="text-[14px] leading-[23px]">&ldquo;{d.source_text}&rdquo;</p>
          <CertaintyWord value="Clear" className="mt-2" />
        </Part>
      );
    if (stageKey === "search")
      return (
        <Part title="What it found">
          <ul className="flex flex-col gap-1.5">
            {st.items
              .filter((i) => i.kind === "candidate")
              .map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="t-data text-[12px]">{c.label}</span>
                  {c.score ? <CertaintyWord value={c.score as "Clear"} quiet /> : null}
                </li>
              ))}
          </ul>
        </Part>
      );
    if (stageKey === "compare" || stageKey === "decide") return <DriftPair drift={driftFlags.find((x) => x.id === "DR-029")!} stacked />;
  }
  if (run.id === "run-design-mfa") {
    if (stageKey === "suggest" || stageKey === "draft") {
      const out = st.outputs.find((o) => (stageKey === "suggest" ? o.card.label === "Suggested fix" : o.card.label.startsWith("Draft")));
      return out ? (
        <Part title={stageKey === "suggest" ? "The fix" : "The draft"}>
          <p className="text-[15px] leading-[24px]">{out.card.value}</p>
          {out.card.reason ? <p className="mt-1 text-[13.5px] text-ink2">{out.card.reason}</p> : null}
        </Part>
      ) : null;
    }
    if (stageKey === "checks")
      return (
        <Part title="The seven design checks">
          <ul className="flex flex-col gap-1.5">
            {["D1", "D2", "D3", "D4", "D5", "D6", "D7"].map((g) => {
              const c = st.checkFor[`${g}|CTL-153`];
              return (
                <li key={g} className="flex items-start gap-3 text-[14px]">
                  <span className="t-data w-6 text-[12px] text-ink3">{g}</span>
                  <span className="flex-1">{c?.label ?? "Waiting"}{c?.result === "cannot_tell" ? <span className="block text-[13px] text-warn">{c.reason}</span> : null}</span>
                  <span className={c?.result === "pass" ? "text-[12.5px] text-ok" : "text-[12.5px] text-warn"}>{c ? (c.result === "pass" ? "Passes" : "Can't tell") : ""}</span>
                </li>
              );
            })}
          </ul>
        </Part>
      );
    if (stageKey === "handoff")
      return (
        <Part title="Who it went to">
          <ul className="flex flex-col gap-1.5">
            {st.items
              .filter((i) => i.kind === "handoff")
              .map((h) => (
                <li key={h.key} className="text-[14px]">
                  {h.to === "tprm" ? `Vendor review: ${vendorById(h.label)?.name ?? h.label}` : h.label}
                </li>
              ))}
          </ul>
        </Part>
      );
  }
  return <p className="text-[14px] text-ink2">{stepResult(run, stageKey, st)}</p>;
}
