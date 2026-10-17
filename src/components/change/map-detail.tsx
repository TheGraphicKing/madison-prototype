"use client";

// The side panel for anything clicked on the change map that is not a platform: a source stack,
// an agent, an obligation block, the held-back block, the gate or the coverage plot.
import Link from "next/link";
import { cn } from "@/lib/utils";
import { agentById, controlById, dutiesFor, getDuty, institution, linksFor, ownersOf, policyById, run as getRun, sectionsFor, userById, vendorsFor, datesFor } from "@/data";
import type { Run, RuleChange } from "@/data/types";
import type { RunState } from "@/lib/player/derive";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/dates";
import { RUN_FOR, STAGE_PLACE } from "@/lib/change-map";
import { stepResult, stepTitle } from "@/lib/run-steps";
import { StatusChip } from "@/components/core/status";
import { ButtonLink } from "@/components/core/button";
import { Diff } from "./diff";
import { FACTS_FOR, FLAG_LABEL } from "./battle-cards";

export const ROLE: Record<string, string> = {
  "RC-01": "Reads the rule", "RC-02": "Splits it into sections", "RC-17": "Checks it applies", "RC-03": "Finds obligations", "QC-01": "Checks every quote",
  "RC-04": "Double-checks", "RC-06": "Finalises obligations", "RC-11": "Matches policies and controls", "RC-12": "Spots drift", "RC-13": "Updates where we stand",
  "RC-14": "Works out the impact", "CD-1": "Drafts the control", "CD-2": "Checks the design",
};

export function MapDetail({ k, c, run, st }: { k: string; c: RuleChange; run?: Run; st?: RunState | null }) {
  const [kind, id] = k.split(":");
  return (
    <section aria-label="Map detail" className="rounded-[14px] border border-line bg-surface p-4 text-[14px]">
      {kind === "src" ? <Source id={id} c={c} /> : null}
      {kind === "agent" ? <Agent id={id} c={c} run={run} st={st} /> : null}
      {kind === "duty" ? <Obligation id={id} /> : null}
      {kind === "held" ? <Held c={c} /> : null}
      {kind === "gate" ? <GateChecks c={c} st={st} /> : null}
      {kind === "plot" ? <PlotDetail c={c} /> : null}
    </section>
  );
}

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[16px] leading-[22px] font-medium">{children}</h2>
      {sub ? <p className="mt-0.5 text-[12.5px] text-ink2">{sub}</p> : null}
    </div>
  );
}

function Source({ id, c }: { id: string; c: RuleChange }) {
  const ds = dutiesFor(c.id);
  const links = ds.flatMap((d) => linksFor(d.id));
  if (id === "ecfr") {
    const secs = sectionsFor(c.id);
    return (
      <>
        <Title sub={`${secs.filter((s) => s.changed).length} of ${secs.length} sections changed · read from eCFR today 05:00`}>The rule's text · {c.citation}</Title>
        <ul className="flex flex-col gap-2">
          {secs.map((s) => (
            <li key={s.id} className={cn("rounded-[10px] px-3 py-2.5", s.changed ? "bg-highlight/25 shadow-[inset_0_0_0_1px_var(--highlight)]" : "bg-surface2")}>
              <div className="text-[12px] text-ink2">
                {s.section_number} · {s.heading} {s.changed ? <span className="font-medium text-ink">· changed</span> : null}
              </div>
              <p className="mt-1 text-[13.5px] leading-[21px]">{s.changed ? <Diff before={s.before} after={s.after} /> : s.after}</p>
            </li>
          ))}
          {!secs.length ? <li className="text-ink2">The section text for this rule is not part of the demo data.</li> : null}
        </ul>
      </>
    );
  }
  if (id === "fr") {
    const d = datesFor(c.id);
    return (
      <>
        <Title sub={c.agency}>The Federal Register notice</Title>
        <dl className="grid grid-cols-2 gap-3">
          <Fact k="Citation" v={c.citation} />
          <Fact k="Kind" v={c.kind === "amendment" ? "Amendment" : "Guidance"} />
          <Fact k="Published" v={fmtDate(d?.published ?? c.published_at)} />
          <Fact k="Effective" v={fmtDate(d?.effective ?? c.effective_date)} />
        </dl>
        <p className="mt-3 leading-[22px]">{c.summary}</p>
      </>
    );
  }
  if (id === "profile") {
    const used = FACTS_FOR[c.id] ?? [];
    const facts = useStore.getState().facts;
    const value = (f: string) => (f === "flood_zone_lending" && facts.flood_zone_lending ? facts.flood_zone_lending.value === "Yes" : institution.product_flags[f as keyof typeof institution.product_flags]);
    const word = (v: boolean | null | undefined) => (v === null || v === undefined ? "Not answered" : v ? "Yes" : "No");
    return (
      <>
        <Title sub={`${institution.name} · checked ${fmtDate(institution.profile_retrieved_at)}`}>The bank profile</Title>
        <div className="text-[12.5px] font-medium text-ink3">Used for this rule</div>
        <ul className="mt-1.5 mb-4 flex flex-wrap gap-1.5">
          {used.map((f) => (
            <li key={f} className={cn("rounded-full px-3 py-1 text-[13px]", value(f) === null || value(f) === undefined ? "bg-warn-soft text-warn" : value(f) ? "bg-ok-soft text-ok" : "bg-surface2 text-ink2")}>
              {FLAG_LABEL[f] ?? f}: {word(value(f)).toLowerCase()}
            </li>
          ))}
        </ul>
        <div className="text-[12.5px] font-medium text-ink3">The full profile</div>
        <ul className="mt-1 flex flex-col">
          {Object.keys(institution.product_flags).map((f) => (
            <li key={f} className={cn("flex justify-between border-b border-line py-1.5 last:border-b-0", used.includes(f) && "font-medium")}>
              <span>{FLAG_LABEL[f] ?? f}</span>
              <span className="text-ink2">{word(value(f))}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (id === "policies") {
    const pols = Array.from(new Map(links.filter((l) => l.policy_section_id).map((l) => [l.policy_section_id!, l])).values());
    return (
      <>
        <Title sub={`${pols.length} policy sections linked to this change`}>Policies</Title>
        <ul className="flex flex-col">
          {pols.map((l) => {
            const p = policyById(l.policy_section_id!)!;
            const status = useStore.getState().linkDecisions[l.id] ?? l.status;
            return (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <Link href={`/coverage/?view=documents&doc=${p.id}`} className="block py-2.5 hover:underline">
                  <span className="block font-medium">
                    {p.document_code} {p.section_number} {p.heading}
                  </span>
                  <span className="block text-[12.5px] text-ink2">
                    {l.strength === "full" ? "Fully meets it" : "Partly meets it"} · {status === "confirmed" ? "confirmed" : status === "rejected" ? "rejected" : "proposed, waiting for a person"}
                    {p.drift ? " · disagrees with its procedure" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
          {!pols.length ? <li className="text-ink2">No policy is linked yet. Madison links them at the Linked step.</li> : null}
        </ul>
      </>
    );
  }
  if (id === "controls") {
    const ids = Array.from(new Set(links.map((l) => l.control_id).filter(Boolean) as string[]));
    const extra = c.id === "RC-2026-011" && useStore.getState().handoffs["H-116"]?.status === "done";
    return (
      <>
        <Title sub={`${ids.length + (extra ? 1 : 0)} controls relevant to this change`}>Controls</Title>
        <ul className="flex flex-col">
          {ids.map((cid) => {
            const ctl = controlById(cid)!;
            return (
              <li key={cid} className="border-b border-line py-2.5 last:border-b-0">
                <Link href={`/obligations/?control=${cid}`} className="font-medium hover:underline">
                  {cid} {ctl.name}
                </Link>
                <span className="block text-[12.5px] text-ink2">
                  Owner {userById(ctl.owner_id)?.name} · {ctl.cadence ?? "no set cadence"} · <span className={ctl.freshness_status === "quiet" ? "text-warn" : undefined}>{ctl.freshness_status === "quiet" ? `quiet ${ctl.quiet_days} days` : ctl.freshness_status === "fresh" ? `fresh, last evidence ${fmtDate(ctl.last_artifact_date)}` : "no evidence yet"}</span>
                </span>
              </li>
            );
          })}
          {extra ? (
            <li className="py-2.5">
              <span className="font-medium">CTL-153 Phishing-resistant MFA for privileged access</span>
              <span className="block text-[12.5px] text-ink2">Owner {userById("u-priya")?.name} · monthly · in force today</span>
            </li>
          ) : null}
          {!ids.length && !extra ? <li className="text-ink2">No control is linked yet.</li> : null}
        </ul>
      </>
    );
  }
  const vs = vendorsFor(c.id);
  return (
    <>
      <Title sub={`${vs.length} vendors in scope of this change`}>Vendors</Title>
      <ul className="flex flex-col">
        {vs.map(({ vendor, why }) => (
          <li key={vendor.id} className="border-b border-line py-2.5 last:border-b-0">
            <span className="font-medium">{vendor.name}</span>
            <span className="block text-[12.5px] text-ink2">
              {why} · {vendor.criticality} · owner {userById(vendor.relationship_owner_id)?.name}
            </span>
          </li>
        ))}
        {!vs.length ? <li className="text-ink2">No vendor is in scope of this change.</li> : null}
      </ul>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[12px] text-ink3">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Agent({ id, c, run, st }: { id: string; c: RuleChange; run?: Run; st?: RunState | null }) {
  const a = agentById(id);
  const r = run ?? (RUN_FOR[c.id] ? getRun(RUN_FOR[c.id]) : undefined);
  const finished = useStore((s) => (r ? s.finishedRuns[r.id] : undefined));
  const stages = r ? r.stages.filter((s) => s.agents.includes(id)) : [];
  return (
    <>
      <Title sub={ROLE[id] ?? "Works on this change"}>{a?.name ?? "Madison"}</Title>
      {stages.length && st ? (
        <ul className="flex flex-col gap-2">
          {stages.map((s) => (
            <li key={s.key} className="rounded-[10px] bg-surface2 px-3 py-2.5">
              <div className="font-medium">{stepTitle(r!, s.key)}</div>
              <div className="text-[13px] text-ink2">{stepResult(r!, s.key, st) ?? (st.stages[s.key].state === "done" ? "Done" : st.stages[s.key].state === "running" ? "Working now" : "Not started")}</div>
              <div className="mt-0.5 text-[12px] text-ink3">{finished ? `On ${fmtDate(finished.at.slice(0, 10))}` : st.stages[s.key].state === "running" ? "Now" : "During this run"}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="leading-[22px] text-ink2">
          {a?.name ?? "This agent"} {(ROLE[id] ?? "worked on this change").toLowerCase()} when Madison read {c.citation}
          {c.closed_at ? `, before it closed on ${fmtDate(c.closed_at)}` : ""}. Its work is in the record.
        </p>
      )}
      <Link href={`/record/?view=list&change=${c.id}`} className="mt-3 inline-block text-[13.5px] font-medium underline underline-offset-4">
        Its entries in the record
      </Link>
    </>
  );
}

function Obligation({ id }: { id: string }) {
  const d = getDuty(id);
  const st = useStore((s) => s.obligationStates[id]);
  if (!d) return null;
  const o = ownersOf(id);
  return (
    <>
      <Title sub={d.citation}>{d.plain}</Title>
      <blockquote className="rounded-[10px] bg-surface2 px-3 py-2.5 text-[13.5px] leading-[21px]">&ldquo;{d.source_text}&rdquo;</blockquote>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink2">
        <StatusChip state={st ?? d.coverage_state} size="sm" />
        <span>Owner {userById(o?.accountable ?? d.owner_id)?.name}</span>
        <span>· deadline {d.deadline_text}</span>
      </div>
      <ButtonLink href={`/obligations/${id}/`} variant="quiet" size={32} className="mt-3">
        Open obligation
      </ButtonLink>
    </>
  );
}

function heldCheck(c: RuleChange) {
  const r = RUN_FOR[c.id] ? getRun(RUN_FOR[c.id]) : undefined;
  return r?.events.find((e) => e.type === "check" && e.result === "block" && e.kind !== "drift") as { reason: string; item_ref: string } | undefined;
}

function Held({ c }: { c: RuleChange }) {
  const h = heldCheck(c);
  return (
    <>
      <Title sub="Held back by the double-check">One proposed obligation</Title>
      <p className="leading-[22px]">{h?.reason.replace(/\s*Held back\.$/, "") ?? "Nothing was held back."}</p>
      <p className="mt-2 text-[13px] text-ink2">It is not counted and needs no decision. It stays in the record with its reason.</p>
    </>
  );
}

function GateChecks({ c, st }: { c: RuleChange; st?: RunState | null }) {
  const r = RUN_FOR[c.id] ? getRun(RUN_FOR[c.id]) : undefined;
  const gate = r?.stages.find((s) => s.kind === "gate");
  const checks = (st?.checks.length ? st.checks : (r?.events.filter((e) => e.type === "check") as RunState["checks"]) ?? []).filter((x) => gate?.agents.includes(x.gate) || /^D\d$/.test(x.gate));
  const byItem = new Map<string, { pass: number; block: string | null; label: string }>();
  for (const x of checks) {
    const key = /^D\d$/.test(x.gate) ? x.gate : x.item_ref;
    const cur = byItem.get(key) ?? { pass: 0, block: null, label: /^D\d$/.test(x.gate) ? `${x.gate} ${x.label}` : (getDuty(x.item_ref)?.plain ?? "One proposed obligation") };
    if (x.result === "pass") cur.pass++;
    else cur.block = x.reason;
    if (/^D\d$/.test(x.gate) && x.result === "pass") cur.block = null;
    byItem.set(key, cur);
  }
  const rows = [...byItem.values()];
  return (
    <>
      <Title sub={gate ? `${rows.filter((x) => !x.block).length} passed · ${rows.filter((x) => x.block).length} held back or waiting` : "This change was checked before this demo"}>The double-check</Title>
      <ul className="flex flex-col gap-1.5">
        {rows.map((x, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-5">
            <span className={cn("mt-1 block size-[8px] shrink-0 rounded-[2px]", x.block ? "bg-warn" : "bg-ok")} />
            <span>
              {x.label}
              <span className="block text-ink2">{x.block ?? "Quote found in the rule; actor, action and deadline supported"}</span>
            </span>
          </li>
        ))}
        {!rows.length ? <li className="text-ink2">Every obligation here passed its quote check and its review when it was first proposed.</li> : null}
      </ul>
      {!gate ? null : <p className="mt-2 text-[12.5px] text-ink3">Done by {STAGE_PLACE[r!.id] ? "Quote check and Obligation reviewer" : "Madison"}.</p>}
    </>
  );
}

function PlotDetail({ c }: { c: RuleChange }) {
  return (
    <>
      <Title sub="The same plot as in Coverage">This regulation in Coverage</Title>
      <p className="leading-[22px] text-ink2">Every applicable obligation in this regulation, as blocks coloured by state. The ones from this change are at full colour.</p>
      <ButtonLink href={`/coverage/?view=field&plot=${c.regulation_id}`} variant="primary" size={32} className="mt-3">
        Open in Coverage
      </ButtonLink>
    </>
  );
}
