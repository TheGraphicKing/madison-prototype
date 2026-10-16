"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Regulation, RuleChange } from "@/data/types";
import { regulations, ruleChanges, sectionsFor, tasks } from "@/data";
import { useChanges, stepsDone, STATE_WORD } from "@/lib/use-change";
import { useStore } from "@/lib/store";
import { daysFrom, fmtDate, fmtTime, relDays } from "@/lib/dates";
import { Page, Section } from "@/components/layout/page";
import { DataTable, type Col } from "@/components/core/data-table";
import { Segmented } from "@/components/core/tabs";
import { MonoLabel } from "@/components/core/labels";
import { JourneyTrack } from "@/components/core/journey";
import { PersonTag } from "@/components/core/tags";
import { Mark, Square } from "@/components/core/mark";
import { ButtonLink } from "@/components/core/button";
import { Diff } from "@/components/change/diff";

type Filter = "all" | "new" | "decision" | "progress" | "closed" | "out";

const FILTERS: { value: Filter; label: string; test: (c: RuleChange, open: Set<string>) => boolean }[] = [
  { value: "all", label: "All", test: () => true },
  { value: "new", label: "New this week", test: (c) => daysFrom(c.published_at) >= -21 || c.state === "new" },
  { value: "decision", label: "Needs a decision", test: (c, open) => open.has(c.id) || ["new", "uncertain", "duties"].includes(c.state) },
  { value: "progress", label: "In progress", test: (c) => ["applies", "duties", "linked", "whats_left"].includes(c.state) },
  { value: "closed", label: "Closed", test: (c) => ["closed", "covered"].includes(c.state) },
  { value: "out", label: "Doesn't apply", test: (c) => c.state === "screened_out" },
];

const AGENCIES = Array.from(new Set([...ruleChanges.map((c) => c.agency), ...regulations.map((r) => r.agency)]));
const WHEN = [
  { value: "past", label: "In force", test: (iso: string) => daysFrom(iso) <= 0 },
  { value: "q4", label: "By 31 Dec", test: (iso: string) => daysFrom(iso) > 0 && iso <= "2026-12-31" },
  { value: "2027", label: "2027", test: (iso: string) => iso >= "2027-01-01" },
];

export function Rules() {
  const changes = useChanges(ruleChanges);
  const done = useStore((s) => s.tasksDone);
  const openTasks = new Set(tasks.filter((t) => !done[t.id] && t.change_id).map((t) => t.change_id!));
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [agency, setAgency] = useState<string | null>(null);
  const [when, setWhen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>("RC-2026-014");
  const [onlyChanges, setOnlyChanges] = useState(true);

  const f = FILTERS.find((x) => x.value === filter)!;
  const ql = q.trim().toLowerCase();
  const match = (s: string) => !ql || s.toLowerCase().includes(ql);
  const rows = changes.filter(
    (c) =>
      f.test(c, openTasks) &&
      (!agency || c.agency === agency) &&
      (!when || WHEN.find((w) => w.value === when)!.test(c.effective_date)) &&
      match(`${c.citation} ${c.title} ${c.summary} ${c.agency}`),
  );
  const watched = filter === "all" || filter === "new" ? regulations.filter((r) => (!agency || r.agency === agency) && match(`${r.citation} ${r.title} ${r.agency}`)) : [];

  const cols: Col<RuleChange>[] = useMemo(
    () => [
      {
        id: "citation",
        header: "Citation",
        width: "190px",
        sortValue: (c) => c.citation,
        cell: (c) => (
          <Link href={`/rules/${c.id}/`} onClick={(e) => e.stopPropagation()} className="t-data text-ink hover:underline">
            {c.citation}
          </Link>
        ),
      },
      {
        id: "what",
        header: "What changed",
        sortValue: (c) => c.title,
        cell: (c) => (
          <div className="min-w-0 py-1">
            <div className="text-[14px] leading-5 text-ink">{c.title}</div>
            {c.screen_reason ? (
              <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] leading-[18px] text-ink2">
                <Square size={5} color={c.state === "uncertain" ? "var(--warn)" : "var(--ink3)"} />
                {c.screen_reason}
              </div>
            ) : null}
          </div>
        ),
      },
      { id: "agency", header: "Agency", width: "130px", sortValue: (c) => c.agency, hideOnMobile: true, cell: (c) => <span className="text-[13px] text-ink2">{c.agency}</span> },
      {
        id: "effective",
        header: "Effective",
        width: "150px",
        sortValue: (c) => c.effective_date,
        hideOnMobile: true,
        cell: (c) => (
          <span className="text-[13px] leading-[18px]">
            {fmtDate(c.effective_date)}
            <span className="block text-[12px] text-ink3">{relDays(c.effective_date)}</span>
          </span>
        ),
      },
      {
        id: "journey",
        header: "Where it stands",
        width: "200px",
        sortValue: (c) => stepsDone(c),
        cell: (c) => (
          <span className="flex flex-col gap-1">
            <JourneyTrack done={stepsDone(c)} current={c.state !== "closed" && c.state !== "screened_out"} />
            <span className="text-[12px] text-ink2">{STATE_WORD[c.state]}</span>
          </span>
        ),
      },
      { id: "owner", header: "Owner", width: "170px", hideOnMobile: true, sortValue: (c) => c.owner_id, cell: (c) => <PersonTag id={c.owner_id} /> },
    ],
    [],
  );

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">Rule changes</h1>
          <p className="mt-2 max-w-[62ch] text-ink2">
            Every rule Madison has read for Northgate, and what changed. {ruleChanges.length} changes and {regulations.length} regulations watched, checked every morning.
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Segmented<Filter>
          label="Filter rule changes"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((x) => ({ value: x.value, label: x.label, count: changes.filter((c) => x.test(c, openTasks)).length }))}
        />
        <label className="relative flex h-8 min-w-[240px] flex-1 items-center rounded-[2px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_1px_var(--ink)] md:max-w-[320px]">
          <span className="sr-only">Search rule changes</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search citations, titles, agencies"
            className="h-full w-full bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-ink3"
          />
          {q ? (
            <button onClick={() => setQ("")} className="px-2 text-ink3 hover:text-ink" aria-label="Clear search">
              <Mark kind="close" size={12} />
            </button>
          ) : null}
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="t-label mr-1">Agency</span>
        {AGENCIES.map((a) => (
          <Chip key={a} on={agency === a} onClick={() => setAgency(agency === a ? null : a)}>
            {a}
          </Chip>
        ))}
        <span className="t-label mr-1 ml-4">Effective</span>
        {WHEN.map((w) => (
          <Chip key={w.value} on={when === w.value} onClick={() => setWhen(when === w.value ? null : w.value)}>
            {w.label}
          </Chip>
        ))}
      </div>

      <Section className="mt-8">
        <DataTable<RuleChange>
          ariaLabel="Rule changes"
          data={rows}
          columns={cols}
          getRowId={(c) => c.id}
          expandedId={expanded}
          onRowClick={(c) => setExpanded((e) => (e === c.id ? null : c.id))}
          renderExpanded={(c) => <Expanded c={c} onlyChanges={onlyChanges} setOnlyChanges={setOnlyChanges} />}
          empty="No rule changes match these filters."
          stickyTop={64}
        />
      </Section>

      {watched.length ? (
        <Section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="t-section">Watched regulations</h2>
              <MonoLabel className="mt-1 block">{watched.length} · source eCFR · checked 16 Oct 2026 from 05:00</MonoLabel>
            </div>
          </div>
          <DataTable<Regulation>
            ariaLabel="Watched regulations"
            data={watched}
            getRowId={(r) => r.id}
            columns={[
              { id: "c", header: "Citation", width: "190px", sortValue: (r) => r.citation, cell: (r) => <span className="t-data">{r.citation}</span> },
              { id: "t", header: "Regulation", sortValue: (r) => r.title, cell: (r) => <span className="text-[14px]">{r.title}</span> },
              { id: "a", header: "Agency", width: "130px", hideOnMobile: true, sortValue: (r) => r.agency, cell: (r) => <span className="text-[13px] text-ink2">{r.agency}</span> },
              { id: "l", header: "Last amended", width: "150px", hideOnMobile: true, sortValue: (r) => r.last_amended_at, cell: (r) => <span className="text-[13px]">{fmtDate(r.last_amended_at)}</span> },
              {
                id: "k",
                header: "Last check",
                width: "200px",
                sortValue: (r) => r.last_check.status,
                cell: (r) => (
                  <span className="flex items-center gap-2 text-[13px] text-ink2">
                    <Square size={6} color={r.last_check.status === "changed" ? "var(--highlight)" : r.last_check.status === "rate_limited" ? "var(--warn)" : "var(--ink3)"} style={r.last_check.status === "changed" ? { boxShadow: "0 0 0 1px var(--ink)" } : undefined} />
                    {r.last_check.status === "changed" ? "Changed" : r.last_check.status === "rate_limited" ? "Retry later (rate limited)" : "No change"} · {fmtTime(r.last_check.checked_at)}
                  </span>
                ),
              },
              { id: "d", header: "Duties", width: "90px", align: "right", sortValue: (r) => r.duties_on_record, cell: (r) => <span className="t-data">{r.duties_on_record}</span> },
            ]}
            stickyTop={64}
          />
        </Section>
      ) : null}
    </Page>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[2px] px-2.5 text-[12.5px] transition-colors",
        on ? "bg-ink text-surface" : "bg-surface text-ink2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink",
      )}
    >
      {on ? <Mark kind="check" size={11} /> : null}
      {children}
    </button>
  );
}

function Expanded({ c, onlyChanges, setOnlyChanges }: { c: RuleChange; onlyChanges: boolean; setOnlyChanges: (v: boolean) => void }) {
  const secs = sectionsFor(c.id);
  const shown = onlyChanges ? secs.filter((s) => s.changed) : secs;
  return (
    <div className="grid gap-8 px-4 py-6 pl-[calc(190px+28px)] max-lg:pl-4 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0">
        <p className="max-w-[70ch] text-[14px] leading-[22px] text-ink2">{c.summary}</p>
        {secs.length ? (
          <>
            <div className="mt-5 flex items-center justify-between gap-4">
              <MonoLabel>
                Before and after · {secs.filter((s) => s.changed).length} of {secs.length} sections changed
              </MonoLabel>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
                <input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} className="accent-(--ink)" />
                Show only changes
              </label>
            </div>
            <ul className="mt-3 flex flex-col">
              {shown.map((s) => (
                <li key={s.id} className="grid grid-cols-[140px_1fr] gap-5 border-t border-line py-3.5 max-md:grid-cols-1 max-md:gap-1">
                  <span className="t-data text-[11.5px] text-ink2">
                    {s.section_number}
                    <span className="mt-0.5 block font-sans text-[12px] text-ink3">{s.heading}</span>
                  </span>
                  <p className="max-w-[72ch] text-[14px] leading-[23px]">
                    {s.changed ? <Diff before={s.before} after={s.after} onlyChanges={onlyChanges} /> : <span className="text-ink2">{s.after}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-[13px] text-ink3">The section text for this change is in the change room.</p>
        )}
      </div>
      <div className="flex flex-col items-start gap-3">
        <MonoLabel>Published {fmtDate(c.published_at)}</MonoLabel>
        <ButtonLink href={`/rules/${c.id}/`} variant="quiet" size={32}>
          Open the change room
        </ButtonLink>
      </div>
    </div>
  );
}
