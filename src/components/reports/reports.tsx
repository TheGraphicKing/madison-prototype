"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { examHistory, getChange, getDuty, knownGaps, position, reports, ruleChanges, userById } from "@/data";
import { fmtDate, fmtMonth, monthShort, relDays } from "@/lib/dates";
import { Page, Section } from "@/components/layout/page";
import { Count, MonoLabel } from "@/components/core/labels";
import { FOUR_STATES } from "@/components/core/status";
import { StepChart } from "@/components/core/charts";
import { Button, ButtonLink } from "@/components/core/button";
import { Mark, Square } from "@/components/core/mark";
import { Tilt } from "@/components/motion-primitives/tilt";
import { JourneyTrack } from "@/components/core/journey";
import { stepsDone, STATE_WORD } from "@/lib/use-change";
import { useChanges } from "@/lib/use-change";

const BP = reports.board_pack;
const EX = reports.exam_readiness;

/** The month the board pack is as of, moved by the date control; counts come from position history. */
function useAsOf() {
  const hist = position().history;
  const base = hist.findIndex((h) => BP.as_of.startsWith(h.month));
  const [i, setI] = useState(base);
  return { i, set: setI, h: hist[i], hist, latest: hist.length - 1 };
}

export function ReportsIndex() {
  const { i, set, h, hist, latest } = useAsOf();
  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">Reports</h1>
          <p className="mt-2 text-ink2">Two documents, written from the record. Pick the month they are as of.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" size={32} onClick={() => set(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous month">
            <Mark kind="chevron-left" size={12} />
          </Button>
          <span className="min-w-[150px] text-center text-[14px]">As of {fmtMonth(h.month, true)}</span>
          <Button variant="quiet" size={32} onClick={() => set(Math.min(latest, i + 1))} disabled={i === latest} aria-label="Next month">
            <Mark kind="chevron-right" size={12} />
          </Button>
        </div>
      </div>

      <Section className="mt-10">
        <div className="grid gap-10 md:grid-cols-2">
          <Cover
            href="/reports/board-pack/"
            kind="Board pack"
            title={i === hist.findIndex((x) => BP.as_of.startsWith(x.month)) ? BP.title : `Compliance position, ${fmtMonth(h.month)}`}
            meta={`For the board risk committee · as of ${fmtMonth(h.month)}`}
            tiles={[
              { k: "Covered", v: h.covered.toLocaleString("en-US") },
              { k: "Nothing behind it", v: String(h.nothing_behind) },
              { k: "Known gaps", v: String(h.known_gap) },
            ]}
          />
          <Cover
            href="/reports/exam/"
            kind="Exam readiness"
            title={EX.exam}
            meta={`Starts ${fmtDate(EX.starts)} · ${relDays(EX.starts)}`}
            tiles={[
              { k: "Areas proven", v: `${EX.proven} of ${EX.in_scope}` },
              { k: "Not yet proven", v: String(EX.in_scope - EX.proven) },
              { k: "Exam starts", v: fmtDate(EX.starts) },
            ]}
            grid
          />
        </div>
      </Section>
    </Page>
  );
}

function Cover({ href, kind, title, meta, tiles, grid }: { href: string; kind: string; title: string; meta: string; tiles: { k: string; v: string }[]; grid?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Tilt rotationFactor={3}>
        <Link href={href} className="group block aspect-[0.78] bg-surface p-9 shadow-[0_0_0_1px_var(--line)] transition-shadow hover:shadow-[0_0_0_1px_var(--ink)]" aria-label={`Open the ${kind.toLowerCase()}`}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="text-[15px] font-medium">Northgate Community Bank</span>
              <MonoLabel variant="plain">{kind}</MonoLabel>
            </div>
            <div className="mt-auto">
              {grid ? (
                <div className="mb-8 grid w-[150px] grid-cols-4 gap-1.5" aria-hidden>
                  {EX.items.map((it) => (
                    <span key={it} className="block aspect-square" style={{ background: examHistory.not_proven.includes(it) ? "transparent" : "var(--ink)", boxShadow: "inset 0 0 0 1px var(--ink)" }} />
                  ))}
                </div>
              ) : (
                <div className="mb-8 flex h-[60px] w-[200px] items-end gap-[3px]" aria-hidden>
                  {position().history.map((h) => (
                    <span key={h.month} className="block flex-1 bg-ink" style={{ height: `${((h.covered - 1300) / 450) * 100}%` }} />
                  ))}
                </div>
              )}
              <h2 className="text-[30px] leading-[36px] font-medium tracking-[-0.015em]">{title}</h2>
              <p className="mt-3 text-[14px] text-ink2">{meta}</p>
            </div>
            <div className="mt-8 border-t border-line pt-3 text-[12px] text-ink3">Prepared by Madison from the record · confidential</div>
          </div>
        </Link>
      </Tilt>
      <dl className="grid grid-cols-3 gap-px bg-line shadow-[0_0_0_1px_var(--line)]">
        {tiles.map((t) => (
          <div key={t.k} className="bg-surface px-3 py-2.5">
            <dt className="t-label text-[9.5px]">{t.k}</dt>
            <dd className="mt-1 text-[15px] tabular">{t.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DocChrome({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="bg-ground py-10 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-6 flex max-w-[860px] items-center justify-between px-5">
        <Link href="/reports/" className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink">
          <Mark kind="chevron-left" size={12} /> Reports
        </Link>
        <Button variant="primary" size={32} onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <article className="doc mx-auto max-w-[860px] bg-surface px-20 py-16 shadow-[0_0_0_1px_var(--line)] max-md:px-6 max-md:py-8 print:max-w-none print:px-0 print:py-0 print:shadow-none" aria-label={title}>
        {children}
      </article>
    </div>
  );
}

export function BoardPack() {
  const pos = position();
  const h = pos.history.find((x) => BP.as_of.startsWith(x.month))!;
  const changes = useChanges(ruleChanges);
  const quarter = changes.filter((c) => c.published_at >= "2026-07-01" || c.closed_at);
  return (
    <DocChrome title="Board pack">
      <header className="doc-cover flex min-h-[560px] flex-col border-b border-line pb-12 print:min-h-[90vh]">
        <div className="flex items-start justify-between">
          <span className="text-[16px] font-medium">Northgate Community Bank</span>
          <MonoLabel variant="plain">Board risk committee</MonoLabel>
        </div>
        <div className="mt-auto">
          <MonoLabel>Board pack · as of {fmtDate(BP.as_of)}</MonoLabel>
          <h1 className="mt-3 text-[44px] leading-[50px] font-medium tracking-[-0.02em]">{BP.title}</h1>
          <p className="mt-4 max-w-[52ch] text-[16px] leading-[26px] text-ink2">
            Prepared by the compliance team from Madison&apos;s record. Every number traces to an obligation, a link and a named decision.
          </p>
          <p className="mt-6 text-[13px] text-ink3">
            Owner {userById("u-anthony")?.name}, {userById("u-anthony")?.role}
          </p>
        </div>
      </header>
      {BP.sections.map((s, i) => (
        <section key={s.title} className="doc-section border-b border-line py-12 last:border-b-0">
          <div className="flex items-baseline gap-4">
            <span className="t-data text-[12px] text-ink3">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="text-[24px] leading-[30px] font-medium tracking-[-0.01em]">{s.title}</h2>
          </div>
          <p className="mt-3 max-w-[62ch] pl-9 text-[16px] leading-[26px]">{s.summary}</p>
          <div className="mt-8 pl-9">
            {s.kind === "counts" ? (
              <>
                <div className="grid grid-cols-4 border-y border-line max-md:grid-cols-2">
                  {FOUR_STATES.map((k, j) => (
                    <div key={k} className={cn("py-5", j && "border-l border-line pl-5")}>
                      <Count value={h[k as "covered"]} state={k} animate={false} size="medium" />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[13px] text-ink2">{h.total.toLocaleString("en-US")} applicable obligations. The four counts add up; there are no percentages in this pack.</p>
                <div className="mt-6">
                  <StepChart ariaLabel="Covered obligations, last 11 months" points={pos.history.filter((x) => x.month <= h.month).map((x) => ({ x: monthShort(x.month), y: x.covered }))} yMin={1350} yMax={1750} height={200} formatY={(v) => v.toLocaleString("en-US")} latestLabel="As of 30 Sep" />
                </div>
              </>
            ) : null}
            {s.kind === "changes" ? (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="t-label py-2 font-normal">Citation</th>
                    <th className="t-label py-2 font-normal">Change</th>
                    <th className="t-label py-2 font-normal">Effective</th>
                    <th className="t-label py-2 font-normal">Where it stands</th>
                  </tr>
                </thead>
                <tbody>
                  {quarter.map((c) => (
                    <tr key={c.id} className="border-b border-line">
                      <td className="t-data py-2.5 pr-4 align-top text-[12px]">{c.citation}</td>
                      <td className="py-2.5 pr-4 align-top">{c.title}</td>
                      <td className="py-2.5 pr-4 align-top whitespace-nowrap">{fmtDate(c.effective_date)}</td>
                      <td className="py-2.5 align-top">
                        <span className="flex items-center gap-2">
                          <JourneyTrack done={stepsDone(c)} />
                          <span className="text-[13px] text-ink2">{STATE_WORD[c.state]}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : null}
            {s.kind === "gaps" ? (
              <ul className="flex flex-col border-t border-line">
                {knownGaps.map((g) => (
                  <li key={g.id} className="grid grid-cols-[90px_1fr_150px] gap-4 border-b border-line py-3 text-[14px] max-md:grid-cols-1">
                    <span className="t-data text-[12px]">{g.id}</span>
                    <span>
                      {getDuty(g.obligation_id)?.plain}
                      <span className="mt-1 block text-[13px] leading-5 text-ink2">{g.rationale}</span>
                      <span className="mt-1 block text-[12px] text-ink3">Accepted by {userById(g.accepted_by_user_id)?.name}, {fmtDate(g.accepted_at)}</span>
                    </span>
                    <span className="text-right max-md:text-left">
                      Expires {fmtDate(g.expiry)}
                      <span className="block text-[12px] text-ink3">{relDays(g.expiry)}</span>
                    </span>
                  </li>
                ))}
                <li className="py-3 text-[13px] text-ink2">One gap is shown in full here; the other eight are listed in the gap register with the same fields.</li>
              </ul>
            ) : null}
            {s.kind === "asks" ? (
              <div className="rounded-[10px] p-5 shadow-[inset_0_0_0_1px_var(--ink)]">
                <MonoLabel tone="ink">For decision</MonoLabel>
                <p className="mt-2 text-[16px] leading-[26px]">{getChange("RC-2026-011")?.summary}</p>
                <p className="mt-2 text-[14px] text-ink2">
                  Effective {fmtDate(getChange("RC-2026-011")!.effective_date)}. Owner {userById("u-priya")?.name}. Fix: a new control (CTL-153) and one sentence in POL-ISP-01 3.1.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ))}
      <footer className="doc-foot mt-10 flex justify-between border-t border-line pt-4 text-[11px] text-ink3">
        <span>Northgate Community Bank · {BP.title}</span>
        <span>Prepared by Madison from the record · confidential</span>
      </footer>
    </DocChrome>
  );
}

export function ExamReadiness() {
  const [pick, setPick] = useState<string | null>(null);
  const proven = (it: string) => !examHistory.not_proven.includes(it);
  const pts = examHistory.proven_by_month.map((p) => ({ x: monthShort(p.month), y: p.proven }));
  const link = pick ? examHistory.area_links[pick] : undefined;
  const change = link ? getChange(link) : undefined;
  return (
    <DocChrome title="Exam readiness">
      <MonoLabel>Exam readiness · {EX.exam}</MonoLabel>
      <h1 className="mt-3 text-[40px] leading-[46px] font-medium tracking-[-0.02em]">
        {EX.proven} of {EX.in_scope} areas proven
      </h1>
      <p className="mt-3 text-[16px] text-ink2">
        The exam starts {fmtDate(EX.starts)}, {relDays(EX.starts)}. An area is proven when every obligation in it has a confirmed link and fresh evidence.
      </p>

      <section className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-4 gap-2.5" role="list" aria-label="Exam areas">
            {EX.items.map((it, i) => {
              const ok = proven(it);
              return (
                <button
                  key={it}
                  role="listitem"
                  onClick={() => setPick(pick === it ? null : it)}
                  aria-pressed={pick === it}
                  aria-label={`${it}: ${ok ? "proven" : "not yet proven"}`}
                  className={cn("flex aspect-square flex-col justify-between p-2.5 text-left transition-colors", pick === it && "outline outline-2 outline-offset-2 outline-focus")}
                  style={{ background: ok ? "var(--ink)" : "var(--surface)", boxShadow: "inset 0 0 0 1px var(--ink)", color: ok ? "var(--surface)" : "var(--ink)" }}
                >
                  <span className="t-data text-[10px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[11px] leading-[13px] [overflow-wrap:anywhere] hyphens-auto">{it}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-6 text-[12.5px] text-ink2">
            <span className="flex items-center gap-2">
              <Square size={8} color="var(--ink)" /> Proven
            </span>
            <span className="flex items-center gap-2">
              <Square size={8} filled={false} color="var(--ink)" /> Not yet proven
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {pick ? (
            <>
              <MonoLabel>{proven(pick) ? "Proven" : "Not yet proven"}</MonoLabel>
              <h2 className="text-[22px] leading-[28px] font-medium">{pick}</h2>
              <p className="text-[15px] leading-[24px] text-ink2">
                {proven(pick) ? "Every obligation in this area has a confirmed link and evidence inside its cadence." : "At least one obligation here has nothing behind it, a quiet control, or an open change."}
              </p>
              {change ? (
                <Link href={`/rules/${change.id}/`} className="no-print text-[14px] underline underline-offset-4">
                  {change.citation} · {change.title}
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <MonoLabel>Proven areas over time</MonoLabel>
              <StepChart ariaLabel="Proven exam areas by month" points={pts} yMin={0} yMax={EX.in_scope} width={380} height={230} ticks={4} latestLabel="Now" />
              <p className="text-[13px] text-ink2">Pick an area to see why it is or is not proven.</p>
            </>
          )}
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="text-[20px] font-medium">Not yet proven · {EX.in_scope - EX.proven}</h2>
        <ul className="mt-3 flex flex-col">
          {examHistory.not_proven.map((it) => {
            const c = getChange(examHistory.area_links[it]);
            return (
              <li key={it} className="grid grid-cols-[1fr_auto] gap-4 border-b border-line py-3 text-[15px]">
                <span>{it}</span>
                {c ? (
                  <Link href={`/rules/${c.id}/`} className="t-data text-[12px] text-ink2 hover:underline">
                    {c.citation}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="no-print mt-8">
          <ButtonLink href="/reports/" variant="text" size={40}>
            Back to reports
          </ButtonLink>
        </div>
      </section>
    </DocChrome>
  );
}
