"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { agentById, controls, getChange, getDuty, knownGaps, position, reportsV2, resolveRef, ruleChanges, userById, vendorsFor } from "@/data";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate, monthShort, relDays } from "@/lib/dates";
import { useChanges, STATE_WORD } from "@/lib/use-change";
import { Page, Section } from "@/components/layout/page";
import { Count } from "@/components/core/labels";
import { FOUR_STATES } from "@/components/core/status";
import { Button, ButtonLink } from "@/components/core/button";
import { Mark } from "@/components/core/mark";
import { Segmented } from "@/components/core/tabs";
import { WhatsNext } from "@/components/core/whats-next";

const BP = reportsV2.board_pack;
const EX = reportsV2.exam_pack;
const sourceName = (s: string) => agentById(s)?.name ?? s;

function useApproval() {
  const done = useStore((s) => s.tasksDone["T-280"]);
  return done ? { status: "Approved", by: done.by, at: done.at } : { status: "Draft", by: BP.prepared_by, at: BP.as_of };
}

export function ReportsIndex() {
  const ap = useApproval();
  return (
    <Page>
      <h1 className="t-page">Reports</h1>
      <p className="mt-2 text-ink2">Written from the record. Every number traces to an obligation, a link and a named decision.</p>
      <Section className="mt-10">
        <div className="grid gap-5 md:grid-cols-2">
          <ReportCard
            href="/reports/board-pack/"
            kind="Board pack"
            title={BP.title}
            asOf={fmtDate(BP.as_of)}
            status={ap.status === "Approved" ? `Approved by ${userById(ap.by)?.name}` : `Draft · prepared by ${userById(BP.prepared_by)?.name}, waiting on ${userById(BP.approver_id)?.name}`}
            approved={ap.status === "Approved"}
            conclusions={BP.conclusions}
          />
          <ReportCard
            href="/reports/exam/"
            kind="Exam pack"
            title={EX.title}
            asOf={`Starts ${fmtDate(EX.starts)}, ${relDays(EX.starts)}`}
            status={`${EX.proven} of ${EX.in_scope} areas proven`}
            approved={false}
            conclusions={[`${EX.in_scope - EX.proven} areas are not yet proven; each names what is missing.`, `The weakest is ${EX.areas.find((a) => !a.proven)?.name}.`]}
          />
        </div>
      </Section>
    </Page>
  );
}

function ReportCard({ href, kind, title, asOf, status, approved, conclusions }: { href: string; kind: string; title: string; asOf: string; status: string; approved: boolean; conclusions: string[] }) {
  return (
    <Link href={href} className="group flex flex-col rounded-[16px] border border-line bg-surface p-6 shadow-(--shadow-rest) transition-colors hover:border-ink/30">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink2">{kind}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium", approved ? "bg-ok-soft text-ok" : "bg-surface2 text-ink2")}>{approved ? "Approved" : kind === "Board pack" ? "Draft" : "In progress"}</span>
      </div>
      <h2 className="mt-3 text-[22px] leading-[28px] font-medium tracking-[-0.01em]">{title}</h2>
      <p className="mt-1 text-[13.5px] text-ink2">
        {asOf} · {status}
      </p>
      <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-[14px] leading-[21px]">
        {conclusions.slice(0, 2).map((c) => (
          <li key={c} className="flex gap-2.5">
            <span className="mt-[9px] block size-[5px] shrink-0 rounded-full bg-ink" />
            {c}
          </li>
        ))}
      </ul>
      <span className="mt-5 text-[14px] font-medium underline underline-offset-4">Open</span>
    </Link>
  );
}

/* ---------- the board pack ---------- */

export function BoardPack() {
  const persona = useStore((s) => s.persona);
  const store = useStore();
  const adds = useStore((s) => s.reportAdditions);
  const ap = useApproval();
  const [active, setActive] = useState(1);
  const go = (n: number) => {
    setActive(n);
    document.getElementById(`sec-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const approve = () => {
    const at = demoNowIso();
    store.completeTask("T-280", persona, at);
    store.decide({ label: "Approve the board pack", text: `Approved "${BP.title}" for the board`, by: persona, at });
    store.addRecord({ at, who: persona, kind: "person", what: `Approved the board pack "${BP.title}"`, live: true });
    store.toast("Board pack approved and written to the record.");
  };

  return (
    <div className="bg-ground print:bg-white">
      <div className="no-print mx-auto flex max-w-[1400px] items-center justify-between gutter-x pt-6">
        <Link href="/reports/" className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink">
          <Mark kind="chevron-left" size={12} /> Reports
        </Link>
        <Button variant="quiet" size={32} onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-8 gutter-x pt-6 pb-24 xl:grid-cols-[176px_minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_280px] print:block print:p-0">
        <nav aria-label="Sections" className="no-print self-start xl:sticky xl:top-6 max-xl:hidden">
          <ol className="flex flex-col gap-0.5">
            {BP.sections.map((s) => (
              <li key={s.n}>
                <button onClick={() => go(s.n)} aria-current={active === s.n ? "true" : undefined} className={cn("flex w-full gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] leading-[18px]", active === s.n ? "bg-surface font-medium shadow-[inset_0_0_0_1px_var(--line)]" : "text-ink2 hover:bg-surface2 hover:text-ink")}>
                  <span className="t-data w-4 shrink-0 text-[11px] text-ink3">{s.n}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <article className="doc min-w-0 rounded-[16px] border border-line bg-surface px-10 py-10 max-md:px-6 max-md:py-8 print:rounded-none print:border-0 print:p-0" aria-label="Board pack">
          <header className="doc-cover flex min-h-[420px] flex-col border-b border-line pb-10 print:min-h-[90vh]">
            <div className="flex items-start justify-between gap-4 text-[14px]">
              <span className="font-medium">Northgate Community Bank</span>
              <span className="text-ink2">Board risk committee</span>
            </div>
            <div className="mt-auto">
              <p className="text-[13.5px] text-ink2">Board pack · as of {fmtDate(BP.as_of)}</p>
              <h1 className="mt-3 text-[40px] leading-[46px] font-medium tracking-[-0.02em] max-md:text-[30px] max-md:leading-9">{BP.title}</h1>
              <p className="mt-4 text-[13.5px] text-ink2">
                Prepared by {userById(BP.prepared_by)?.name} · {ap.status === "Approved" ? `approved by ${userById(ap.by)?.name}` : `for approval by ${userById(BP.approver_id)?.name}`}
              </p>
            </div>
          </header>

          <section className="border-b border-line py-10">
            <h2 className="text-[13px] font-medium text-ink3">Conclusions</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {BP.conclusions.map((c, i) => (
                <li key={c} className="flex gap-4 text-[17px] leading-[27px]">
                  <span className="t-data mt-1 text-[12px] text-ink3">{i + 1}</span>
                  {c}
                </li>
              ))}
            </ol>
          </section>

          {BP.sections.map((s) => (
            <section key={s.n} id={`sec-${s.n}`} className="doc-section scroll-mt-6 border-b border-line py-10 last:border-b-0">
              <div className="flex items-baseline gap-4">
                <span className="t-data text-[12px] text-ink3">{String(s.n).padStart(2, "0")}</span>
                <h2 className="text-[22px] leading-[28px] font-medium tracking-[-0.01em]">{s.title}</h2>
              </div>
              <p className="mt-3 max-w-[64ch] pl-9 text-[16px] leading-[26px] max-md:pl-0">{s.summary}</p>
              <div className="mt-6 flex flex-col gap-6 pl-9 max-md:pl-0">
                {s.blocks.map((b) => (
                  <Block key={b} kind={b} />
                ))}
                {adds
                  .filter((a) => a.section === s.n)
                  .map((a) => (
                    <div key={a.id} className={cn("rounded-[12px] px-4 py-3 text-[14px] leading-[22px]", a.status === "pending" ? "border border-dashed border-line-strong" : "bg-surface2")}>
                      <span className="text-[12px] text-ink3">
                        {a.kind === "note" ? "Note" : a.kind === "section" ? "Added section" : "Attachment"} from {userById(a.by)?.name} · {a.status === "pending" ? `pending ${userById(BP.approver_id)?.name}'s acceptance` : "accepted"}
                      </span>
                      <p className="mt-1">{a.text}</p>
                    </div>
                  ))}
              </div>
            </section>
          ))}
          <footer className="doc-foot mt-8 flex justify-between border-t border-line pt-4 text-[11px] text-ink3">
            <span>Northgate Community Bank · {BP.title}</span>
            <span>Prepared from the record · confidential</span>
          </footer>
        </article>

        <aside className="no-print flex flex-col gap-5 self-start lg:sticky lg:top-6">
          <div className="rounded-[14px] border border-line bg-surface p-4">
            <div className="text-[13px] font-medium text-ink3">Approval</div>
            <p className="mt-1 text-[15px] font-medium">{ap.status}</p>
            <p className="text-[13px] text-ink2">
              {ap.status === "Approved" ? `By ${userById(ap.by)?.name}, ${fmtDate(ap.at.slice(0, 10))}` : `Waiting on ${userById(BP.approver_id)?.name}`}
            </p>
            {ap.status === "Approved" ? <WhatsNext className="mt-3" text="Approved and signed. The signature is in the record." links={[{ label: "See it in the record", href: "/record/?view=list&day=2026-10-16" }]} /> : null}
            {ap.status !== "Approved" && persona === BP.approver_id ? (
              <Button variant="primary" size={32} className="mt-3 w-full" onClick={approve} data-demo="D5-4">
                Approve the board pack
              </Button>
            ) : null}
          </div>
          <AddToReport section={active} />
          <div className="rounded-[14px] border border-line bg-surface p-4">
            <div className="text-[13px] font-medium text-ink3">How this report was built</div>
            <ol className="mt-2 flex flex-col gap-3">
              {BP.how_built.map((h) => (
                <li key={h.step} className="text-[13px] leading-5">
                  <div className="font-medium">{h.step}</div>
                  <div className="text-ink2">{h.detail}</div>
                  <div className="text-[12px] text-ink3">Source: {sourceName(h.source)}</div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[14px] border border-line bg-surface p-4">
            <div className="text-[13px] font-medium text-ink3">Comments · {BP.comments.length}</div>
            <ul className="mt-2 flex flex-col gap-3">
              {BP.comments.map((c, i) => (
                <li key={i} className="text-[13px] leading-5">
                  <button onClick={() => go(c.section)} className="text-left hover:underline">
                    <span className="font-medium">{userById(c.by)?.name}</span>
                    <span className="text-ink3"> · section {c.section} · {fmtDate(c.at)}</span>
                    <span className="block">{c.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AddToReport({ section }: { section: number }) {
  const persona = useStore((s) => s.persona);
  const add = useStore((s) => s.addReport);
  const accept = useStore((s) => s.acceptReport);
  const addRecord = useStore((s) => s.addRecord);
  const toast = useStore((s) => s.toast);
  const all = useStore((s) => s.reportAdditions);
  const pending = all.filter((a) => a.status === "pending");
  const [kind, setKind] = useState<"note" | "section" | "attachment">("note");
  const [text, setText] = useState("");
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <div className="text-[13px] font-medium text-ink3">Add to this report · section {section}</div>
      <Segmented<"note" | "section" | "attachment">
        className="mt-2"
        label="What to add"
        size={28}
        value={kind}
        onChange={setKind}
        options={[
          { value: "note", label: "Note" },
          { value: "section", label: "Section" },
          { value: "attachment", label: "File" },
        ]}
      />
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={kind === "attachment" ? "File name, for example vendor-sla.pdf" : "What should the board read here?"}
        className="mt-2 w-full rounded-[10px] bg-surface2 px-3 py-2 text-[13.5px] outline-none focus:shadow-[inset_0_0_0_1px_var(--ink)]"
      />
      <Button
        variant="quiet"
        size={32}
        className="mt-2 w-full"
        disabled={!text.trim()}
        onClick={() => {
          add({ kind, section, text: text.trim(), by: persona, at: demoNowIso(), status: "pending" });
          setText("");
          toast(`Added to section ${section}. It shows as pending until ${userById(BP.approver_id)?.name} accepts it.`);
        }}
      >
        Add, pending acceptance
      </Button>
      {pending.length && persona === BP.approver_id ? (
        <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          {pending.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-2 text-[13px] leading-5">
              <span>
                {a.text}
                <span className="block text-[12px] text-ink3">From {userById(a.by)?.name} · section {a.section}</span>
              </span>
              <Button
                variant="quiet"
                size={32}
                onClick={() => {
                  accept(a.id);
                  addRecord({ at: demoNowIso(), who: persona, kind: "person", what: `Accepted an addition to the board pack, section ${a.section}`, live: true });
                  toast("Accepted and written to the record.");
                }}
              >
                Accept
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Block({ kind }: { kind: string }) {
  const pos = position();
  const h = pos.history.find((x) => BP.as_of.startsWith(x.month)) ?? pos.history[pos.history.length - 1];
  const changes = useChanges(ruleChanges);
  if (kind === "conclusions") return null;
  if (kind === "counts")
    return (
      <div className="grid grid-cols-2 overflow-clip rounded-[12px] border border-line 2xl:grid-cols-4">
        {FOUR_STATES.map((k, j) => (
          <div key={k} className={cn("px-4 py-4", j % 2 === 1 && "border-l border-line", j >= 2 && "border-t border-line 2xl:border-t-0", j === 2 && "2xl:border-l")}>
            <Count value={h[k as "covered"]} state={k} animate={false} size="medium" />
          </div>
        ))}
      </div>
    );
  if (kind === "trend") {
    const hs = pos.history.filter((x) => x.month <= h.month);
    const min = Math.min(...hs.map((x) => x.covered));
    const max = Math.max(...hs.map((x) => x.covered));
    return (
      <figure>
        <div className="flex h-[96px] items-end gap-1.5" role="img" aria-label={`Covered obligations by month, from ${hs[0].covered} to ${hs[hs.length - 1].covered}`}>
          {hs.map((x) => (
            <span key={x.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="block w-full rounded-t-[4px] bg-viz-ok/80" style={{ height: `${20 + ((x.covered - min) / (max - min || 1)) * 70}px` }} />
              <span className="text-[10.5px] text-ink3">{monthShort(x.month)}</span>
            </span>
          ))}
        </div>
        <figcaption className="mt-2 text-[12.5px] text-ink2">Covered obligations by month, {hs[0].covered.toLocaleString("en-US")} to {hs[hs.length - 1].covered.toLocaleString("en-US")}.</figcaption>
      </figure>
    );
  }
  if (kind === "changes_table")
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12.5px] text-ink3">
              <th className="w-[24%] py-2 font-normal">Citation</th>
              <th className="py-2 font-normal">Change</th>
              <th className="w-[18%] py-2 font-normal">Effective</th>
              <th className="w-[20%] py-2 font-normal">Where it stands</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.id} className="border-b border-line">
                <td className="t-data py-2.5 pr-4 align-top text-[11.5px] [overflow-wrap:anywhere]">{c.citation}</td>
                <td className="py-2.5 pr-4 align-top">{c.title}</td>
                <td className="py-2.5 pr-4 align-top">{fmtDate(c.effective_date)}</td>
                <td className="py-2.5 align-top text-[13px] text-ink2">{STATE_WORD[c.state]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (kind === "asks") {
    const c = getChange("RC-2026-011")!;
    return (
      <div className="rounded-[12px] bg-surface2 p-5">
        <div className="text-[12.5px] font-medium text-ink3">For decision</div>
        <p className="mt-1 text-[16px] leading-[26px]">{c.summary}</p>
        <p className="mt-2 text-[14px] text-ink2">Effective {fmtDate(c.effective_date)}. The fix is a new control, CTL-153, and one sentence in POL-ISP-01 3.1.</p>
      </div>
    );
  }
  if (kind === "gaps_table")
    return (
      <ul className="flex flex-col border-t border-line">
        {knownGaps.map((g) => (
          <li key={g.id} className="grid grid-cols-[1fr_150px] gap-4 border-b border-line py-3 text-[14px] max-md:grid-cols-1">
            <span>
              {getDuty(g.obligation_id)?.plain}
              <span className="mt-1 block text-[13px] leading-5 text-ink2">{g.rationale}</span>
              <span className="mt-1 block text-[12px] text-ink3">Accepted by {userById(g.accepted_by_user_id)?.name}, {fmtDate(g.accepted_at)}</span>
            </span>
            <span className="text-right max-md:text-left">
              Until {fmtDate(g.expiry)}
              <span className="block text-[12px] text-ink3">{relDays(g.expiry)}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  if (kind === "quiet_controls")
    return (
      <ul className="flex flex-col border-t border-line">
        {controls
          .filter((c) => c.freshness_status === "quiet")
          .map((c) => (
            <li key={c.id} className="flex justify-between gap-4 border-b border-line py-2.5 text-[14px]">
              <span>
                <span className="t-data mr-2 text-[12px] text-ink2">{c.id}</span>
                {c.name}
              </span>
              <span className="shrink-0 text-[13px] text-warn">No evidence for {c.quiet_days} days</span>
            </li>
          ))}
      </ul>
    );
  if (kind === "vendors")
    return (
      <ul className="flex flex-col border-t border-line">
        {vendorsFor("RC-2026-014").map(({ vendor, why }) => (
          <li key={vendor.id} className="flex justify-between gap-4 border-b border-line py-2.5 text-[14px]">
            <span>
              {vendor.name}
              <span className="block text-[13px] text-ink2">{why}</span>
            </span>
            <span className="shrink-0 text-[13px] text-ink2">{vendor.criticality}</span>
          </li>
        ))}
      </ul>
    );
  if (kind === "how_built")
    return (
      <ol className="flex flex-col gap-2">
        {BP.how_built.map((x, i) => (
          <li key={x.step} className="flex gap-4 text-[14px] leading-[22px]">
            <span className="t-data mt-0.5 text-[12px] text-ink3">{i + 1}</span>
            <span>
              <span className="font-medium">{x.step}.</span> {x.detail} <span className="text-ink3">Source: {sourceName(x.source)}.</span>
            </span>
          </li>
        ))}
      </ol>
    );
  return null;
}

/* ---------- the exam pack ---------- */

export function ExamReadiness() {
  const [pick, setPick] = useState<number | null>(EX.areas.findIndex((a) => !a.proven));
  const area = pick !== null ? EX.areas[pick] : null;
  return (
    <Page>
      <Link href="/reports/" className="no-print flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink">
        <Mark kind="chevron-left" size={12} /> Reports
      </Link>
      <h1 className="t-page mt-4">{EX.title}</h1>
      <p className="mt-2 text-ink2">
        {EX.proven} of {EX.in_scope} areas proven · starts {fmtDate(EX.starts)}, {relDays(EX.starts)}. An area is proven when every obligation in it has a confirmed link and fresh evidence.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ul className="grid grid-cols-3 gap-3 max-md:grid-cols-2" aria-label="Exam areas">
          {EX.areas.map((a, i) => (
            <li key={a.name}>
              <button
                onClick={() => setPick(i)}
                aria-pressed={pick === i}
                className={cn(
                  "flex h-full min-h-[104px] w-full flex-col justify-between rounded-[14px] border p-4 text-left transition-colors",
                  a.proven ? "border-transparent bg-ok-soft" : "border-line bg-surface hover:bg-surface2",
                  pick === i && "border-ink",
                )}
              >
                <span className={cn("text-[12px] font-medium", a.proven ? "text-ok" : "text-warn")}>{a.proven ? "Proven" : "Not yet proven"}</span>
                <span className="mt-2 text-[14.5px] leading-5 font-medium">{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <aside className="self-start rounded-[14px] border border-line bg-surface p-5">
          {area ? (
            <>
              <div className={cn("text-[12.5px] font-medium", area.proven ? "text-ok" : "text-warn")}>{area.proven ? "Proven" : "Not yet proven"}</div>
              <h2 className="mt-1 text-[19px] leading-[26px] font-medium">{area.name}</h2>
              <p className="mt-2 text-[14px] leading-[22px] text-ink2">{area.proven ? "Every obligation here has a confirmed link and evidence inside its cadence." : area.why}</p>
              {area.items?.length ? (
                <ul className="mt-4 flex flex-col border-t border-line">
                  {area.items.map((it) => {
                    const r = resolveRef(it);
                    return (
                      <li key={it} className="border-b border-line">
                        {r ? (
                          <Link href={r.href} className="block py-2.5 text-[14px] leading-5 hover:underline">
                            {r.label}
                            {r.detail ? <span className="block text-[12.5px] text-ink2">{r.detail}</span> : null}
                          </Link>
                        ) : (
                          <span className="block py-2.5 text-[14px]">{it}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-[14px] text-ink2">Pick an area to see its proof, or why it is not proven.</p>
          )}
          <ButtonLink href="/reports/" variant="quiet" size={32} className="mt-5">
            Back to reports
          </ButtonLink>
        </aside>
      </div>
    </Page>
  );
}
