"use client";

// "Where every change stands": seven columns, one small tile per change, coloured by how many
// days are left to the bank's deadline. Clicking a tile opens that change's map.
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RuleChange } from "@/data/types";
import { areaForChange, datesFor, userById } from "@/data";
import { daysLeftWord } from "@/components/core/dates4";

const COLUMNS: { key: string; label: string; test: (c: RuleChange) => boolean }[] = [
  { key: "new", label: "Not started", test: (c) => c.state === "new" || c.state === "uncertain" },
  { key: "applies", label: "Applies", test: (c) => c.state === "applies" },
  { key: "duties", label: "Obligations", test: (c) => c.state === "duties" },
  { key: "linked", label: "Linked", test: (c) => c.state === "linked" || c.state === "covered" },
  { key: "whats_left", label: "What's left", test: (c) => c.state === "whats_left" },
  { key: "closed", label: "Closed", test: (c) => c.state === "closed" },
  { key: "out", label: "Doesn't apply", test: (c) => c.state === "screened_out" },
];

export function StageStrip({ changes }: { changes: RuleChange[] }) {
  return (
    <section aria-label="Where every change stands" className="mt-8">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="t-section">Where every change stands</h2>
        <span className="flex items-center gap-3 text-[12px] text-ink3 max-md:hidden">
          <Key cls="bg-risk-soft shadow-[inset_0_0_0_1px_var(--risk)]" label="Overdue or under 30 days" />
          <Key cls="bg-warn-soft shadow-[inset_0_0_0_1px_var(--warn)]" label="Under 60 days" />
          <Key cls="bg-surface shadow-[inset_0_0_0_1px_var(--line)]" label="More time, or done" />
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2 max-lg:grid-cols-4 max-sm:grid-cols-2">
        {COLUMNS.map((col) => {
          const list = changes.filter(col.test);
          return (
            <div key={col.key} className="flex min-h-[132px] flex-col gap-1.5 rounded-[14px] bg-surface2/70 p-2">
              <div className="flex items-baseline justify-between px-1 pt-0.5 pb-1">
                <span className="text-[12.5px] font-medium">{col.label}</span>
                <span className="t-data text-[11px] text-ink3">{list.length}</span>
              </div>
              {list.map((c) => (
                <Tile key={c.id} c={c} />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tile({ c }: { c: RuleChange }) {
  const d = datesFor(c.id);
  const done = c.state === "closed" || c.state === "screened_out";
  const left = daysLeftWord(d?.northgate_deadline);
  const urgent = !done && left.n <= 30;
  const soon = !done && !urgent && left.n <= 60;
  const area = areaForChange(c.id);
  const demo = c.id === "RC-2026-018" ? "D4-1" : c.id === "RC-2026-019" ? "D4-2" : undefined;
  return (
    <Link
      href={`/rules/${c.id}/`}
      data-demo={demo}
      title={`${c.citation} · ${c.title}`}
      className={cn(
        "block rounded-[10px] px-2.5 py-2 transition-transform hover:-translate-y-px",
        urgent ? "bg-risk-soft shadow-[inset_0_0_0_1px_var(--risk)]" : soon ? "bg-warn-soft shadow-[inset_0_0_0_1px_var(--warn)]" : "bg-surface shadow-[inset_0_0_0_1px_var(--line)]",
      )}
    >
      <span className="t-data block text-[10.5px] text-ink2">{c.citation}</span>
      <span className="mt-0.5 block text-[12.5px] leading-[16px] font-medium">{c.title}</span>
      <span className={cn("mt-1 block text-[11.5px]", urgent ? "text-risk" : soon ? "text-warn" : "text-ink3")}>
        {done ? (c.state === "closed" ? "Closed" : "No work") : left.text}
        {area && !done ? ` · ${userById(area.owner_id)?.name?.split(" ")[0]}` : ""}
      </span>
    </Link>
  );
}

function Key({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("block size-[10px] rounded-[3px]", cls)} />
      {label}
    </span>
  );
}
