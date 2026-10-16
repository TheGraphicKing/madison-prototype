"use client";

import { cn } from "@/lib/utils";
import type { Run } from "@/data/types";
import type { RunState } from "@/lib/player/derive";
import { getDuty, institution, vendorById } from "@/data";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Mark } from "@/components/core/mark";
import { CertaintyWord } from "@/components/core/status";

const chip = "inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] leading-4 whitespace-nowrap transition-colors duration-[240ms]";

/** A small inline picture of what the step did, built from the run's events. */
export function StepVisual({ run, stageKey, st }: { run: Run; stageKey: string; st: RunState }) {
  const items = st.items;
  if (run.id === "run-rule-1005") {
    if (stageKey === "text") {
      const doc = items.find((i) => i.kind === "document");
      return doc ? <div className="flex flex-wrap gap-1.5"><span className={cn(chip, "bg-surface2")}>{doc.label}</span></div> : null;
    }
    if (stageKey === "sections") {
      const secs = items.filter((i) => i.kind === "section" && i.to === "sections");
      return (
        <div className="flex flex-wrap gap-1.5" aria-label={`${secs.length} sections`}>
          {Array.from({ length: 14 }).map((_, k) => {
            const s = secs[k];
            return (
              <span
                key={k}
                title={s ? `${s.label}${s.changed ? ", changed" : ""}` : undefined}
                className={cn(chip, "t-data px-2 text-[10.5px]", s ? (s.changed ? "bg-highlight text-highlight-ink" : "bg-surface2 text-ink2") : "bg-transparent text-transparent shadow-[inset_0_0_0_1px_var(--line)]")}
              >
                {s ? s.label.replace("1005.11", "") : "00"}
              </span>
            );
          })}
        </div>
      );
    }
    if (stageKey === "scope") {
      const done = st.stages.scope?.state === "done";
      const f = institution.product_flags;
      return (
        <div className="flex flex-wrap gap-1.5">
          {[
            ["Consumer EFT", f.consumer_eft],
            ["Debit cards", f.debit_cards],
            ["Prepaid cards", f.prepaid_cards],
          ].map(([k, v]) => (
            <span key={k as string} className={cn(chip, done ? (v ? "bg-ok-soft text-ok" : "bg-surface2 text-ink3") : "bg-surface2 text-ink3")}>
              {k as string}: {v ? "yes" : "no"}
            </span>
          ))}
        </div>
      );
    }
    if (stageKey === "duties") {
      const ds = items.filter((i) => i.kind === "duty" && i.to === "duties");
      return (
        <div className="flex flex-wrap gap-1.5">
          {ds.map((d) => (
            <span key={d.key} className={cn(chip, d.inFlight ? "bg-highlight text-highlight-ink" : "bg-surface2")}>
              {d.label}
            </span>
          ))}
        </div>
      );
    }
    if (stageKey === "checks") {
      const ds = items.filter((i) => i.kind === "duty" && i.to === "duties");
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {ds.map((d) => {
            const rc = st.checkFor[`RC-04|${d.id}`];
            const qc = st.checkFor[`QC-01|${d.id}`];
            const inGate = qc && !rc;
            const held = rc?.result === "block";
            return (
              <span
                key={d.key}
                title={held ? `Held back: ${rc.reason}` : rc ? "Verified" : inGate ? "Being checked" : "Waiting"}
                className={cn(chip, "gap-1", held ? "translate-y-1 bg-risk-soft text-risk" : rc ? "bg-ok-soft text-ok" : inGate ? "bg-highlight text-highlight-ink ring-2 ring-highlight/50" : "bg-surface2 text-ink3")}
              >
                {rc ? <Mark kind={held ? "cross" : "check"} size={10} /> : null}
                {d.label}
              </span>
            );
          })}
        </div>
      );
    }
    if (stageKey === "decide") return null;
    if (stageKey === "coverage") return <MatchLines st={st} />;
    if (stageKey === "touches") {
      const done = st.stages.touches?.state !== "waiting";
      const n = items.filter((i) => i.kind === "impact" && !i.inFlight).length;
      const counts: [string, number][] = [
        ["obligations", 6],
        ["policy sections", 4],
        ["controls", 5],
        ["vendors", 3],
      ];
      return done ? (
        <div className="flex flex-wrap gap-4">
          {counts.map(([k, v], i) => (
            <span key={k} className="text-[13px] text-ink2">
              <span className="text-[18px] font-medium text-ink tabular-nums">{n > i || st.stages.touches?.state === "done" ? <NumberTicker value={v} startValue={0} /> : 0}</span> {k}
            </span>
          ))}
        </div>
      ) : null;
    }
  }
  if (run.id === "run-coverage-1026") {
    if (stageKey === "search") {
      const cands = items.filter((i) => i.kind === "candidate");
      return (
        <div className="flex flex-wrap gap-1.5">
          {cands.map((c) => (
            <span key={c.key} className={cn(chip, "gap-2 bg-surface2")}>
              {c.label}
              {c.score ? <CertaintyWord value={c.score as "Clear"} className="[&_span.t-small]:text-[11px]" quiet /> : null}
            </span>
          ))}
        </div>
      );
    }
    if (stageKey === "compare" && st.stages.compare?.state !== "waiting") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className={cn(chip, "bg-ok-soft text-ok")}>Rule: 3 business days</span>
          <span className={cn(chip, "bg-ok-soft text-ok")}>Policy: 3 business days</span>
          <span className={cn(chip, "bg-risk-soft text-risk")}>Procedure: 5 business days</span>
        </div>
      );
    }
  }
  if (run.id === "run-design-mfa") {
    if (stageKey === "draft") {
      const parts = items.filter((i) => i.kind === "draft_part");
      return (
        <div className="flex flex-wrap gap-1.5">
          {parts.map((p) => (
            <span key={p.key} className={cn(chip, p.inFlight ? "bg-highlight text-highlight-ink" : "bg-surface2")}>
              {p.label}
            </span>
          ))}
        </div>
      );
    }
    if (stageKey === "checks") {
      return (
        <div className="flex flex-wrap gap-1.5">
          {["D1", "D2", "D3", "D4", "D5", "D6", "D7"].map((g) => {
            const c = st.checkFor[`${g}|CTL-153`];
            return (
              <span key={g} title={c ? `${c.label}: ${c.result === "pass" ? "passes" : "can't tell"}` : "Waiting"} className={cn(chip, "gap-1", c?.result === "pass" ? "bg-ok-soft text-ok" : c?.result === "cannot_tell" ? "bg-warn-soft text-warn" : "bg-surface2 text-ink3")}>
                {c?.result === "pass" ? <Mark kind="check" size={10} /> : null}
                {g} {c?.label ?? ""}
              </span>
            );
          })}
        </div>
      );
    }
    if (stageKey === "handoff") {
      const hs = items.filter((i) => i.kind === "handoff");
      return (
        <div className="flex flex-wrap gap-1.5">
          {hs.map((h) => (
            <span key={h.key} className={cn(chip, "bg-surface2")}>
              {h.to === "tprm" ? `Vendor review · ${vendorById(h.label)?.name ?? h.label}` : h.label}
            </span>
          ))}
        </div>
      );
    }
  }
  return null;
}

/** Short lines draw from obligation chips to the policy and control chips they match. */
function MatchLines({ st }: { st: RunState }) {
  const links = st.items.filter((i) => i.kind === "link");
  const duties = Array.from(new Set(links.map((l) => l.parentRef!)));
  const targets = Array.from(new Set(links.map((l) => l.label)));
  if (!links.length) return null;
  const rowH = 26;
  const H = Math.max(duties.length, targets.length) * rowH;
  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-start">
      <div className="flex flex-col">
        {duties.map((d) => (
          <span key={d} className="flex h-[26px] items-center">
            <span className={cn(chip, "max-w-full truncate bg-surface2")}>{getDuty(d)?.plain.split(" ").slice(0, 5).join(" ")}…</span>
          </span>
        ))}
      </div>
      <svg width="80" height={H} className="overflow-visible" aria-hidden>
        {links.map((l) => {
          const y1 = duties.indexOf(l.parentRef!) * rowH + rowH / 2;
          const y2 = targets.indexOf(l.label) * rowH + rowH / 2;
          const p = l.progress;
          return <path key={l.key} d={`M 0 ${y1} C 40 ${y1}, 40 ${y2}, 80 ${y2}`} fill="none" stroke="var(--ink2)" strokeWidth={1} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />;
        })}
      </svg>
      <div className="flex flex-col">
        {targets.map((t) => (
          <span key={t} className="flex h-[26px] items-center">
            <span className={cn(chip, "t-data bg-surface2 text-[10.5px]")}>{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
