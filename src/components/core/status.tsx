import { cn } from "@/lib/utils";
import { Square } from "./mark";
import type { Certainty, CoverageState } from "@/data/types";

export const STATE_COLOR: Record<CoverageState, string> = {
  covered: "var(--ok)",
  not_yet_confirmed: "var(--warn)",
  nothing_behind: "var(--risk)",
  known_gap: "var(--info)",
  out_of_scope: "var(--ink3)",
  proposed: "var(--ink3)",
};

export const STATE_SOFT: Record<CoverageState, string> = {
  covered: "var(--okSoft)",
  not_yet_confirmed: "var(--warnSoft)",
  nothing_behind: "var(--riskSoft)",
  known_gap: "var(--infoSoft)",
  out_of_scope: "var(--surface2)",
  proposed: "var(--surface2)",
};

export const STATE_LABEL: Record<CoverageState, string> = {
  covered: "Covered",
  not_yet_confirmed: "Not yet confirmed",
  nothing_behind: "Nothing behind it",
  known_gap: "Known gap",
  out_of_scope: "Out of scope",
  proposed: "Proposed",
};

export const FOUR_STATES: CoverageState[] = ["covered", "not_yet_confirmed", "nothing_behind", "known_gap"];

/** A 6 px square, then the label. Status is never colour alone. */
export function StatusChip({
  state,
  label,
  className,
  size = "md",
}: {
  state: CoverageState;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap",
        size === "sm" ? "h-6 text-[12px] leading-4" : "h-7 text-[13px] leading-5",
        className,
      )}
      style={{ background: STATE_SOFT[state], color: STATE_COLOR[state] }}
    >
      <Square size={6} color={STATE_COLOR[state]} filled={state !== "proposed"} className="rounded-[2px]" />
      {label ?? STATE_LABEL[state]}
    </span>
  );
}

export function certaintyFrom(conf: "high" | "medium" | "low" | undefined): Certainty {
  return conf === "high" ? "Clear" : conf === "medium" ? "Likely" : "Unsure";
}

/** Clear, Likely, Unsure as a word with a 3-segment hairline meter. Never a number. */
export function CertaintyWord({ value, className, quiet }: { value: Certainty; className?: string; quiet?: boolean }) {
  const n = value === "Clear" ? 3 : value === "Likely" ? 2 : 1;
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span aria-hidden className="inline-flex items-end gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-[8px]"
            style={{ height: 2, background: i < n ? "var(--ink)" : "var(--lineStrong)" }}
          />
        ))}
      </span>
      <span className={cn("t-small", quiet ? "text-ink2" : "text-ink")}>{value}</span>
    </span>
  );
}
