import { cn } from "@/lib/utils";
import { STEPS, STEP_LABEL } from "@/lib/use-change";

/** The journey as six small squares: Applies, Obligations, Linked, Covered, What's left, Close. */
export function JourneyTrack({ done, current, className, label }: { done: number; current?: boolean; className?: string; label?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-[3px]", className)}
      role="img"
      aria-label={label ?? `${done} of 6 steps done${done < 6 ? `, now ${STEP_LABEL[STEPS[Math.min(done, 5)]]}` : ""}`}
    >
      {STEPS.map((s, i) => (
        <span
          key={s}
          title={STEP_LABEL[s]}
          className="block size-[8px]"
          style={{
            background: i < done ? "var(--ink)" : "transparent",
            boxShadow: `inset 0 0 0 ${i === done && current ? 1.5 : 1}px ${i <= done ? "var(--ink)" : "var(--lineStrong)"}`,
          }}
        />
      ))}
    </span>
  );
}
