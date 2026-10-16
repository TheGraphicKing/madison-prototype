"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { knownGaps, policySections, ruleChanges, tasks, getDuty } from "@/data";
import { TODAY, fmtDate, monthLong } from "@/lib/dates";
import { Segmented } from "@/components/core/tabs";
import { Button } from "@/components/core/button";
import { Mark, Square } from "@/components/core/mark";
import { MonoLabel } from "@/components/core/labels";

type Ev = { date: string; kind: "effective" | "due" | "expiry" | "review"; label: string; href: string };
const KIND: Record<Ev["kind"], { label: string; color: string }> = {
  effective: { label: "Effective date", color: "var(--ink)" },
  due: { label: "Task due", color: "var(--warn)" },
  expiry: { label: "Known gap expires", color: "var(--info)" },
  review: { label: "Policy review due", color: "var(--ink3)" },
};

function useEvents(): Ev[] {
  return useMemo(() => {
    const out: Ev[] = [];
    for (const c of ruleChanges) out.push({ date: c.effective_date, kind: "effective", label: `${c.citation} in force`, href: `/rules/${c.id}/` });
    for (const t of tasks) out.push({ date: t.due, kind: "due", label: t.title, href: t.change_id ? `/rules/${t.change_id}/` : `/tasks/?open=${t.id}` });
    for (const g of knownGaps) out.push({ date: g.expiry, kind: "expiry", label: `${g.id} ${getDuty(g.obligation_id)?.object ?? ""}`.trim(), href: `/obligations/${g.obligation_id}/` });
    const seen = new Set<string>();
    for (const p of policySections) {
      if (seen.has(p.document_code)) continue;
      seen.add(p.document_code);
      out.push({ date: p.review_due_at, kind: "review", label: `${p.document_code} review`, href: `/coverage/?view=documents&doc=${p.id}` });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, []);
}

/** A large month and quarter view of effective dates, due dates and known-gap expiries. */
export function Calendar() {
  const events = useEvents();
  const [mode, setMode] = useState<"month" | "quarter">("month");
  const [y0, m0] = TODAY.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: y0, m: m0 - 1 });
  const step = (n: number) =>
    setCursor((c) => {
      const t = c.y * 12 + c.m + n * (mode === "month" ? 1 : 3);
      return { y: Math.floor(t / 12), m: t % 12 };
    });
  const months = mode === "month" ? [cursor] : [0, 1, 2].map((i) => ({ y: cursor.y + Math.floor((cursor.m - (cursor.m % 3) + i) / 12), m: (cursor.m - (cursor.m % 3) + i) % 12 }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="quiet" size={32} onClick={() => step(-1)} aria-label="Previous">
            <Mark kind="chevron-left" size={12} />
          </Button>
          <h2 className="t-section min-w-[180px] text-center">
            {mode === "month" ? `${monthLong(cursor.m)} ${cursor.y}` : `${monthLong(months[0].m).slice(0, 3)} to ${monthLong(months[2].m).slice(0, 3)} ${months[2].y}`}
          </h2>
          <Button variant="quiet" size={32} onClick={() => step(1)} aria-label="Next">
            <Mark kind="chevron-right" size={12} />
          </Button>
          <Button variant="text" size={32} onClick={() => setCursor({ y: y0, m: m0 - 1 })}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          {(Object.keys(KIND) as Ev["kind"][]).map((k) => (
            <span key={k} className="flex items-center gap-2 text-[12.5px] text-ink2">
              <Square size={6} color={KIND[k].color} />
              {KIND[k].label}
            </span>
          ))}
          <Segmented label="Calendar range" size={28} value={mode} onChange={setMode} options={[{ value: "month", label: "Month" }, { value: "quarter", label: "Quarter" }]} />
        </div>
      </div>
      <div className={cn("grid gap-8", mode === "quarter" && "lg:grid-cols-3")}>
        {months.map((mm) => (
          <Month key={`${mm.y}-${mm.m}`} y={mm.y} m={mm.m} events={events} compact={mode === "quarter"} />
        ))}
      </div>
    </div>
  );
}

function Month({ y, m, events, compact }: { y: number; m: number; events: Ev[]; compact?: boolean }) {
  const first = new Date(Date.UTC(y, m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // weeks start Monday
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const inMonth = events.filter((e) => e.date.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`));
  return (
    <section>
      {compact ? <MonoLabel className="mb-2 block">{monthLong(m)} {y} · {inMonth.length}</MonoLabel> : null}
      <div className="grid grid-cols-7 border-t border-l border-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="t-label border-r border-b border-line px-2 py-1.5">
            {compact ? d[0] : d}
          </div>
        ))}
        {cells.map((d, i) => {
          const valid = d >= 1 && d <= days;
          const date = valid ? iso(d) : "";
          const evs = valid ? events.filter((e) => e.date === date) : [];
          const today = date === TODAY;
          return (
            <div key={i} className={cn("border-r border-b border-line p-1.5", compact ? "min-h-[64px]" : "min-h-[112px]", !valid && "bg-surface2/60", valid && "bg-surface")}>
              {valid ? (
                <span className={cn("t-data inline-flex h-5 min-w-5 items-center justify-center px-1 text-[11px]", today ? "bg-highlight font-medium text-highlight-ink shadow-[0_0_0_1px_var(--ink)]" : "text-ink3")}>
                  {d}
                </span>
              ) : null}
              <div className="mt-1 flex flex-col gap-1">
                {evs.map((e, k) =>
                  compact ? (
                    <Link key={k} href={e.href} title={`${KIND[e.kind].label}: ${e.label}`} className="inline-flex items-center gap-1">
                      <Square size={6} color={KIND[e.kind].color} />
                    </Link>
                  ) : (
                    <Link key={k} href={e.href} className="flex items-start gap-1.5 rounded-[10px] px-1 py-0.5 text-[11.5px] leading-[15px] hover:bg-surface2" title={`${KIND[e.kind].label} · ${fmtDate(e.date)}`}>
                      <Square size={5} color={KIND[e.kind].color} className="mt-[5px]" />
                      <span className="line-clamp-2">{e.label}</span>
                    </Link>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
      {compact ? (
        <ul className="mt-3 flex flex-col gap-1">
          {inMonth.map((e, k) => (
            <li key={k} className="flex items-start gap-2 text-[12.5px] leading-[18px]">
              <span className="t-data w-12 shrink-0 text-[11px] text-ink3">{e.date.slice(8)}</span>
              <Square size={5} color={KIND[e.kind].color} className="mt-[6px]" />
              <Link href={e.href} className="hover:underline">
                {e.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
