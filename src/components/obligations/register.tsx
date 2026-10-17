"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Duty } from "@/data/types";
import { auditTrail, duties, linksFor, regulations, userById } from "@/data";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/dates";
import { Page, Section } from "@/components/layout/page";
import { DataTable, type Col } from "@/components/core/data-table";
import { CertaintyWord, certaintyFrom, STATE_LABEL, StatusChip } from "@/components/core/status";
import { PersonTag } from "@/components/core/tags";
import { Mark } from "@/components/core/mark";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const regOf = (d: Duty) => regulations.find((r) => d.citation.startsWith(r.citation.replace(/ Subpart.*/, "") + ".") || d.citation.startsWith(r.citation + " "));
const TAG_WORD = (t: string) => t.replace(/_/g, " ").replace(/\bach\b/i, "ACH");

type Facet = "state" | "reg" | "owner" | "tag";
type Picks = Record<Facet, Set<string>>;
const none = (): Picks => ({ state: new Set(), reg: new Set(), owner: new Set(), tag: new Set() });

/** The most recent change on record for an obligation: a link decision or an audit entry. */
function lastChange(d: Duty) {
  const dates = [...linksFor(d.id).map((l) => l.decided_at).filter(Boolean), ...auditTrail.filter((a) => a.what.includes(d.id)).map((a) => a.at)] as string[];
  return dates.sort().pop();
}

export function Register() {
  const router = useRouter();
  const sp = useSearchParams();
  const persona = useStore((s) => s.persona);
  const overrides = useStore((s) => s.obligationStates);
  const mfaDone = useStore((s) => Boolean(s.finishedRuns["run-design-mfa"]));
  const rows = useMemo(
    () => duties.map((d) => ({ ...d, coverage_state: overrides[d.id] ?? (mfaDone && d.id === "D-208-M1" ? ("covered" as const) : d.coverage_state) })),
    [mfaDone, overrides],
  );
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<Picks>(() => {
    const p = none();
    const s = sp.get("state");
    if (s) p.state.add(s);
    const r = sp.get("reg");
    if (r) p.reg.add(r);
    // from a plot: "Open these obligations" shows what is not covered first
    if (r && sp.get("open")) ["nothing_behind", "not_yet_confirmed", "known_gap"].forEach((x) => p.state.add(x));
    return p;
  });
  const control = sp.get("control");

  const options: Record<Facet, { value: string; label: string }[]> = {
    state: Array.from(new Set(rows.map((d) => d.coverage_state))).map((s) => ({ value: s, label: STATE_LABEL[s] })),
    reg: (Array.from(new Set(rows.map((d) => regOf(d)?.id).filter(Boolean))) as string[]).map((r) => {
      const x = regulations.find((y) => y.id === r)!;
      return { value: r, label: `${x.citation} · ${x.title.replace(/.*\(([^)]+)\).*/, "$1")}` };
    }),
    owner: Array.from(new Set(rows.map((d) => d.owner_id))).map((o) => ({ value: o, label: userById(o)?.name ?? o })),
    tag: Array.from(new Set(rows.flatMap((d) => d.process_tags))).map((t) => ({ value: t, label: TAG_WORD(t) })),
  };
  const ql = q.trim().toLowerCase();
  const filtered = rows.filter(
    (d) =>
      (!picks.state.size || picks.state.has(d.coverage_state)) &&
      (!picks.owner.size || picks.owner.has(d.owner_id)) &&
      (!picks.reg.size || picks.reg.has(regOf(d)?.id ?? "")) &&
      (!picks.tag.size || d.process_tags.some((t) => picks.tag.has(t))) &&
      (!control || linksFor(d.id).some((l) => l.control_id === control)) &&
      (!ql || `${d.plain} ${d.citation} ${d.id}`.toLowerCase().includes(ql)),
  );

  const toggle = (f: Facet, v: string) =>
    setPicks((p) => {
      const n = { ...p, [f]: new Set(p[f]) };
      if (n[f].has(v)) n[f].delete(v);
      else n[f].add(v);
      return n;
    });
  const saved = (k: "mine" | "gaps" | "nyc") => {
    const p = none();
    if (k === "mine") p.owner.add(persona);
    if (k === "gaps") (p.state.add("nothing_behind"), p.state.add("known_gap"));
    if (k === "nyc") p.state.add("not_yet_confirmed");
    setPicks(p);
  };
  const active = Object.values(picks).some((s) => s.size) || Boolean(ql) || Boolean(control);

  const cols: Col<Duty>[] = [
    {
      id: "plain",
      header: "Obligation",
      sortValue: (d) => d.plain,
      cell: (d) => <div className="py-1 text-[14px] leading-5">{d.plain}</div>,
    },
    { id: "cite", header: "Citation", width: "170px", hideOnMobile: true, sortValue: (d) => d.citation, cell: (d) => <span className="t-data text-[12px] text-ink2">{d.citation}</span> },
    { id: "cert", header: "Certainty", width: "110px", hideOnMobile: true, sortValue: (d) => d.confidence, cell: (d) => <CertaintyWord value={certaintyFrom(d.confidence)} quiet /> },
    { id: "owner", header: "Owner", width: "170px", hideOnMobile: true, sortValue: (d) => userById(d.owner_id)?.name ?? "", cell: (d) => <PersonTag id={d.owner_id} /> },
    { id: "state", header: "State", width: "170px", sortValue: (d) => d.coverage_state, cell: (d) => <StatusChip state={d.coverage_state} /> },
    {
      id: "last",
      header: "Last change",
      width: "120px",
      hideOnMobile: true,
      sortValue: (d) => lastChange(d) ?? "",
      cell: (d) => {
        const l = lastChange(d);
        return <span className="text-[13px] text-ink2">{l ? fmtDate(l.slice(0, 10)) : "No change"}</span>;
      },
    },
  ];

  return (
    <Page>
      <h1 className="t-page">Obligations</h1>
      <p className="mt-2 max-w-[64ch] text-ink2">
        Every obligation Madison has found in the rules that apply. This view holds the {duties.length} obligations named in the demo; the full register counts 1,894 applicable.
      </p>

      {/* one compact row: search, four filters, saved views and the count (at most 56 px) */}
      <div className="mt-8 flex min-h-12 flex-wrap items-center gap-2 rounded-[14px] border border-line bg-surface px-2 py-2 md:max-h-14 md:flex-nowrap">
        <label className="relative flex h-9 min-w-[180px] flex-1 items-center rounded-[10px] bg-surface2 focus-within:shadow-[inset_0_0_0_1px_var(--ink)]">
          <span className="sr-only">Search obligations</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search obligations or citations" className="h-full w-full bg-transparent px-3 text-[13.5px] outline-none placeholder:text-ink3" />
        </label>
        <FacetChip label="State" facet="state" picks={picks} options={options.state} onToggle={toggle} />
        <FacetChip label="Regulation" facet="reg" picks={picks} options={options.reg} onToggle={toggle} />
        <FacetChip label="Owner" facet="owner" picks={picks} options={options.owner} onToggle={toggle} />
        <FacetChip label="Process" facet="tag" picks={picks} options={options.tag} onToggle={toggle} />
        <Popover>
          <PopoverTrigger className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[13px] text-ink2 hover:bg-surface2 hover:text-ink">
            Saved views <Mark kind="chevron-down" size={11} />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            {(
              [
                ["mine", "My obligations"],
                ["gaps", "Gaps"],
                ["nyc", "Not yet confirmed"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} onClick={() => saved(k)} className="rounded-[8px] px-2.5 py-2 text-left text-[13.5px] hover:bg-surface2">
                {l}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="ml-auto shrink-0 px-2 text-[13px] whitespace-nowrap text-ink2">
          {filtered.length} of {rows.length}
          {active ? (
            <button
              className="ml-2 underline underline-offset-4 hover:text-ink"
              onClick={() => {
                setPicks(none());
                setQ("");
                if (control) router.replace("/obligations/");
              }}
            >
              Clear
            </button>
          ) : null}
        </span>
      </div>
      {control ? <p className="mt-2 text-[13px] text-ink2">Showing obligations linked to control {control}.</p> : null}

      <Section className="mt-6">
        <DataTable<Duty>
          ariaLabel="Obligation register"
          data={filtered}
          columns={cols}
          getRowId={(d) => d.id}
          onRowClick={(d) => router.push(`/obligations/${d.id}/`)}
          empty="No obligations match. Filters combine; clear one to see more."
          stickyTop={64}
        />
      </Section>
    </Page>
  );
}

function FacetChip({ label, facet, picks, options, onToggle }: { label: string; facet: Facet; picks: Picks; options: { value: string; label: string }[]; onToggle: (f: Facet, v: string) => void }) {
  const n = picks[facet].size;
  return (
    <Popover>
      <PopoverTrigger className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[13px] transition-colors", n ? "bg-ink text-surface" : "text-ink2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink")}>
        {label}
        {n ? <span className="rounded-full bg-surface/20 px-1.5 text-[11.5px]">{n}</span> : null}
        <Mark kind="chevron-down" size={11} />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[320px] w-64 overflow-auto">
        {options.map((o) => {
          const on = picks[facet].has(o.value);
          return (
            <label key={o.value} className="flex cursor-pointer items-start gap-2.5 rounded-[8px] px-2.5 py-2 text-[13.5px] leading-5 hover:bg-surface2">
              <input type="checkbox" checked={on} onChange={() => onToggle(facet, o.value)} className="mt-[3px] accent-[var(--ink)]" />
              <span className="first-letter:uppercase">{o.label}</span>
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
