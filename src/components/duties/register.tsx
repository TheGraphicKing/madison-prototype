"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Duty } from "@/data/types";
import { duties, getChange, linksFor, regulations, userById } from "@/data";
import { useStore } from "@/lib/store";
import { Page, Section } from "@/components/layout/page";
import { DataTable, type Col } from "@/components/core/data-table";
import { CertaintyWord, certaintyFrom, STATE_LABEL, StatusChip } from "@/components/core/status";
import { PersonTag } from "@/components/core/tags";
import { Mark } from "@/components/core/mark";

const regOf = (d: Duty) => regulations.find((r) => d.citation.startsWith(r.citation.replace(/ Subpart.*/, "") + ".") || d.citation.startsWith(r.citation + " "));

export function Register() {
  const router = useRouter();
  const sp = useSearchParams();
  const mfaDone = useStore((s) => Boolean(s.finishedRuns["run-design-mfa"]));
  const rows = useMemo(() => duties.map((d) => (mfaDone && d.id === "D-208-M1" ? { ...d, coverage_state: "covered" as const } : d)), [mfaDone]);
  const [state, setState] = useState<string | null>(sp.get("state"));
  const [owner, setOwner] = useState<string | null>(null);
  const [reg, setReg] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const control = sp.get("control");

  const states = Array.from(new Set(rows.map((d) => d.coverage_state)));
  const owners = Array.from(new Set(rows.map((d) => d.owner_id)));
  const regs = Array.from(new Set(rows.map((d) => regOf(d)?.id).filter(Boolean))) as string[];
  const tags = Array.from(new Set(rows.flatMap((d) => d.process_tags)));
  const filtered = rows.filter(
    (d) =>
      (!state || d.coverage_state === state) &&
      (!owner || d.owner_id === owner) &&
      (!reg || regOf(d)?.id === reg) &&
      (!tag || d.process_tags.includes(tag)) &&
      (!control || linksFor(d.id).some((l) => l.control_id === control)),
  );

  const cols: Col<Duty>[] = [
    { id: "id", header: "Duty", width: "120px", sortValue: (d) => d.id, cell: (d) => <span className="t-data text-ink2">{d.id}</span> },
    {
      id: "plain",
      header: "What it asks",
      sortValue: (d) => d.plain,
      cell: (d) => (
        <div className="py-1">
          <div className="text-[14px] leading-5">{d.plain}</div>
          <div className="t-data mt-0.5 text-[11px] text-ink3">{d.citation}</div>
        </div>
      ),
    },
    { id: "cert", header: "Certainty", width: "110px", hideOnMobile: true, sortValue: (d) => d.confidence, cell: (d) => <CertaintyWord value={certaintyFrom(d.confidence)} quiet /> },
    { id: "state", header: "Coverage", width: "180px", sortValue: (d) => d.coverage_state, cell: (d) => <StatusChip state={d.coverage_state} /> },
    { id: "owner", header: "Owner", width: "180px", hideOnMobile: true, sortValue: (d) => userById(d.owner_id)?.name ?? "", cell: (d) => <PersonTag id={d.owner_id} /> },
    { id: "change", header: "Change", width: "150px", hideOnMobile: true, sortValue: (d) => d.change_id, cell: (d) => <span className="t-data text-[11.5px] text-ink2">{getChange(d.change_id)?.citation}</span> },
  ];

  return (
    <Page>
      <h1 className="t-page">Duties</h1>
      <p className="mt-2 max-w-[64ch] text-ink2">
        The register of duties Madison has found in the rules that apply to Northgate. This view holds the {duties.length} duties named in the demo; the full register counts 1,894 applicable.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <FilterRow label="Coverage" value={state} onChange={setState} options={states.map((s) => ({ value: s, label: STATE_LABEL[s] }))} />
        <FilterRow label="Owner" value={owner} onChange={setOwner} options={owners.map((o) => ({ value: o, label: userById(o)?.name ?? o }))} />
        <FilterRow label="Regulation" value={reg} onChange={setReg} options={regs.map((r) => ({ value: r, label: regulations.find((x) => x.id === r)!.citation }))} />
        <FilterRow label="Process" value={tag} onChange={setTag} options={tags.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} />
        {control ? (
          <div className="flex items-center gap-3 text-[13px] text-ink2">
            Linked to {control}
            <button className="underline underline-offset-4" onClick={() => router.replace("/duties/")}>
              Clear
            </button>
          </div>
        ) : null}
      </div>
      <Section className="mt-8">
        <div className="t-label mb-2">{filtered.length} of {rows.length}</div>
        <DataTable<Duty>
          ariaLabel="Duty register"
          data={filtered}
          columns={cols}
          getRowId={(d) => d.id}
          onRowClick={(d) => router.push(`/duties/${d.id}/`)}
          empty="No duties match these filters. Filters combine."
          stickyTop={64}
        />
      </Section>
    </Page>
  );
}

function FilterRow({ label, value, onChange, options }: { label: string; value: string | null; onChange: (v: string | null) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="t-label w-[96px]">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-[2px] px-2.5 text-[12.5px] capitalize-first transition-colors",
            value === o.value ? "bg-ink text-surface" : "bg-surface text-ink2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink",
          )}
        >
          {value === o.value ? <Mark kind="check" size={11} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
