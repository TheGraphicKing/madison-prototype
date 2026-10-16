import type { DriftFlag } from "@/data/types";
import { policyById, procedureById } from "@/data";
import { MonoLabel } from "@/components/core/labels";
import { Square } from "@/components/core/mark";

/** Highlights each number in a quote. */
function Numbers({ text, values }: { text: string; values: string[] }) {
  const nums = values.map((v) => v.split(" ")[0]);
  const re = new RegExp(`(\\b(?:${nums.join("|")})\\b(?:\\s+business)?(?:\\s+days?)?)`, "g");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-highlight px-0.5 text-highlight-ink">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** A drift flag as two quotes side by side, with the numbers highlighted, and the rule's limit. */
export function DriftPair({ drift, stacked }: { drift: DriftFlag; stacked?: boolean }) {
  const pol = policyById(drift.policy_section_id);
  const prc = procedureById(drift.procedure_section_id);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <MonoLabel>Drift {drift.id} · policy and procedure disagree</MonoLabel>
        <span className="t-data shrink-0 text-[11.5px] text-ink">rule: {drift.duty_limit}</span>
      </div>
      <div className={`grid gap-px overflow-hidden rounded-[10px] bg-line shadow-[0_0_0_1px_var(--line)] ${stacked ? "grid-cols-1" : "grid-cols-2 max-sm:grid-cols-1"}`}>
        {[
          { label: `${pol?.document_code} ${pol?.section_number}`, title: pol?.heading, quote: pol?.text ?? drift.policy_quote, values: drift.policy_values, ok: drift.inside_policy },
          { label: `${prc?.document_code} ${prc?.section_number.toLowerCase()}`, title: prc?.heading, quote: prc?.text ?? drift.procedure_quote, values: drift.procedure_values, ok: drift.inside_procedure },
        ].map((q) => (
          <div key={q.label} className="flex flex-col gap-2 bg-surface p-4">
            <span className="t-data text-[11px] text-ink2">{q.label}</span>
            <span className="text-[13px] font-medium">{q.title}</span>
            <p className="text-[14px] leading-[22px]">
              &ldquo;
              <Numbers text={q.quote} values={q.values} />
              &rdquo;
            </p>
            <span className={`mt-auto flex items-center gap-2 text-[12px] text-ink2 ${stacked ? "pt-1" : ""}`}>
              <Square size={6} color={q.ok ? "var(--ok)" : "var(--risk)"} />
              {q.ok ? "Inside the rule's limit" : "Later than the rule allows"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[13px] leading-5 text-ink2">{drift.summary}</p>
    </div>
  );
}
