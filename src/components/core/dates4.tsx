"use client";

// The same four dates for every rule change: Published, Effective, the bank's deadline
// (effective date minus its 30-day buffer) and Days left. Overdue reads in the risk colour.
import { cn } from "@/lib/utils";
import { datesFor, institution } from "@/data";
import { daysFrom, fmtDate } from "@/lib/dates";

const BANK = institution.name.split(" ")[0];

export function daysLeftWord(iso: string | null | undefined) {
  if (!iso) return { text: "No deadline", tone: "quiet" as const, n: Infinity };
  const n = daysFrom(iso);
  if (n < 0) return { text: `${-n} days overdue`, tone: "risk" as const, n };
  if (n === 0) return { text: "Due today", tone: "risk" as const, n };
  return { text: `${n} days left`, tone: n <= 30 ? ("warn" as const) : ("plain" as const), n };
}

export function FourDates({ changeId, compact, className, closed }: { changeId: string; compact?: boolean; className?: string; closed?: string | null }) {
  const d = datesFor(changeId);
  if (!d) return null;
  const closedOn = closed ?? d.closed;
  const left = closedOn ? { text: `Closed ${fmtDate(closedOn)}`, tone: "quiet" as const } : daysLeftWord(d.northgate_deadline);
  const tone = left.tone === "risk" ? "text-risk" : left.tone === "warn" ? "text-warn" : left.tone === "quiet" ? "text-ink3" : "text-ink";
  if (compact)
    return (
      <span className={cn("text-[13px] leading-[18px]", className)}>
        {d.northgate_deadline ? fmtDate(d.northgate_deadline) : "Not needed"}
        {d.northgate_deadline || closedOn ? <span className={cn("block text-[12px]", tone)}>{left.text}</span> : null}
      </span>
    );
  const items = [
    { k: "Published", v: fmtDate(d.published) },
    { k: "Effective", v: fmtDate(d.effective) },
    { k: `${BANK} deadline`, v: d.northgate_deadline ? fmtDate(d.northgate_deadline) : "Not needed" },
    { k: closedOn ? "Closed" : "Days left", v: closedOn ? fmtDate(closedOn) : left.text, tone },
  ];
  return (
    <dl className={cn("flex flex-wrap gap-x-6 gap-y-2", className)}>
      {items.map((i) => (
        <div key={i.k}>
          <dt className="text-[12px] text-ink3">{i.k}</dt>
          <dd className={cn("text-[14px] leading-5", i.tone)}>{i.v}</dd>
        </div>
      ))}
    </dl>
  );
}
