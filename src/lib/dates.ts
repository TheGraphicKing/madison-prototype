// "Today" in the prototype is 16 October 2026.
export const TODAY = "2026-10-16";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

const dayNumber = (iso: string) => {
  const { y, m, d } = parts(iso);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** "4 Jan 2027" */
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "No date";
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "4 Jan" */
export function fmtDay(iso: string) {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

export function fmtMonth(iso: string, long = false) {
  const { y, m } = parts(iso.length === 7 ? `${iso}-01` : iso);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
}

export const monthShort = (iso: string) => MONTHS[parts(iso.length === 7 ? `${iso}-01` : iso).m - 1];
export const monthLong = (m: number) => MONTHS_LONG[m];

/** Whole days from today (negative = in the past). */
export function daysFrom(iso: string, from = TODAY) {
  return dayNumber(iso) - dayNumber(from);
}

/** "in 80 days", "tomorrow", "today", "3 days ago" */
export function relDays(iso: string, from = TODAY) {
  const n = daysFrom(iso, from);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return `in ${n} days`;
  return `${-n} days ago`;
}

/** "05:12" from an ISO timestamp, in UTC to stay deterministic. */
export function fmtTime(iso: string) {
  return iso.slice(11, 16);
}

/** "16 Oct 2026, 05:12" */
export function fmtStamp(iso: string) {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}

/** Elapsed ms as "00:12" */
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** The demo clock: today's date, with the visitor's current wall time. */
export function demoNowIso() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${TODAY}T${hh}:${mm}:${ss}Z`;
}

export function fmtUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

export function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}
