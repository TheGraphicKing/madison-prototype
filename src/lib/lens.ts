// The Coverage lens: colour the field by State (the default), by accountable Owner, or by
// Deadline (days left to the bank's deadline on the regulation's nearest open change).
import { areaForRegulation, datesFor, ownersOf, ruleChanges, userById } from "@/data";
import { daysFrom } from "./dates";
import type { Plot } from "./coverage-field";

export type Lens = "state" | "owner" | "deadline";

/** The accountable owner of a plot: its process area's owner, or compliance when none is named. */
export function plotOwner(p: Plot): string {
  return areaForRegulation(p.citation)?.owner_id ?? "u-elena";
}
export function tileOwner(p: Plot, dutyId?: string): string {
  return (dutyId ? ownersOf(dutyId)?.accountable : undefined) ?? plotOwner(p);
}

/** Days left on the nearest open change for a regulation; null when nothing is open. */
export function plotDaysLeft(p: Plot): number | null {
  const open = ruleChanges.filter((c) => !["closed", "screened_out"].includes(c.state) && (c.citation.startsWith(p.citation + ".") || c.citation.startsWith(p.citation + " ") || c.citation === p.citation));
  const ds = open.map((c) => datesFor(c.id)?.northgate_deadline).filter(Boolean) as string[];
  if (!ds.length) return null;
  return Math.min(...ds.map((d) => daysFrom(d)));
}

export type DeadlineBand = "late" | "soon" | "later" | "none";
export function deadlineBand(n: number | null): DeadlineBand {
  if (n === null) return "none";
  if (n <= 30) return "late";
  if (n <= 60) return "soon";
  return "later";
}
export const BAND_WORD: Record<DeadlineBand, string> = { late: "Under 30 days or overdue", soon: "30 to 60 days", later: "More than 60 days", none: "Nothing open" };

/** Owners in the field, in a stable order, with their names. */
export function ownersInField(plots: Plot[]) {
  const ids = Array.from(new Set(plots.map(plotOwner)));
  ids.sort((a, b) => (userById(a)?.name ?? a).localeCompare(userById(b)?.name ?? b));
  return ids.map((id) => ({ id, name: userById(id)?.name ?? id }));
}

/** "12 CFR 1005 · Reg E": short by default; the full title shows on hover. */
export function plotShortLabel(p: Plot) {
  const short = p.short !== p.title ? p.short.replace(/^Regulation /, "Reg ") : null;
  return short ? `${p.citation} · ${short}` : p.citation;
}
