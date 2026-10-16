"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { userById, type PersonaId } from "@/data";
import { useStore } from "@/lib/store";
import { Button } from "@/components/core/button";
import { Mark } from "@/components/core/mark";
import { Initials } from "@/components/core/tags";
import { GlyphDecide } from "@/components/glyphs";

export type Evidence = { key: string; label: string; summary?: React.ReactNode; body?: React.ReactNode };
export type DecisionOption = { id: string; label: string; next: string; primary?: boolean; disabled?: boolean };

/**
 * The one Decision panel. Used in the change room ("Your task now"), at every run checkpoint and
 * in the task drawer. It shows what you are deciding, why it matters, the evidence, the options
 * with what happens next, who is next, and the button. The toast uses the button's own verb.
 */
export function DecisionPanel({
  deciding,
  why,
  deadline,
  affected,
  evidence,
  options,
  next,
  decider,
  onChoose,
  form,
  className,
  compact,
  done,
  expandAll,
}: {
  deciding: string;
  why: React.ReactNode;
  deadline?: string;
  affected?: string;
  evidence: Evidence[];
  options: DecisionOption[];
  /** who is next after you */
  next?: string;
  /** the person who must decide; others see who is needed */
  decider: string;
  onChoose: (optionId: string) => void;
  /** fields the decider must fill before the primary option is enabled */
  form?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /** shown instead of the options once decided */
  done?: { label: string; by: string; at: string } | null;
  /** open every evidence item (for "Review one by one") */
  expandAll?: boolean;
}) {
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [all, setAll] = useState(false);
  const visible = expandAll || all || evidence.length <= 4 ? evidence : evidence.slice(0, 3);
  const who = userById(decider);
  const isMe = persona === decider;

  return (
    <section aria-label="Decision" className={cn("rounded-[14px] border border-line bg-surface shadow-(--shadow-rest)", className)}>
      <div className={cn("flex items-start gap-4 border-b border-line", compact ? "px-5 py-4" : "px-6 py-5")}>
        <span className="mt-0.5 inline-grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-ink">
          <GlyphDecide size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-ink3">{done ? "Decided" : isMe ? "You decide" : `${who?.name} decides`}</div>
          <h3 className={cn("mt-0.5 font-medium tracking-[-0.01em]", compact ? "text-[18px] leading-6" : "text-[21px] leading-7")}>{deciding}</h3>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-[12.5px] text-ink2">
          <Initials initials={who?.initials ?? "?"} size={24} />
          <span className="max-sm:hidden">{who?.name}</span>
        </span>
      </div>

      <div className={cn("flex flex-col gap-5", compact ? "px-5 py-4" : "px-6 py-5")}>
        <div>
          <div className="text-[12.5px] font-medium text-ink3">Why it matters</div>
          <div className="mt-1 text-[14.5px] leading-[23px] text-ink">{why}</div>
          {deadline || affected ? (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink2">
              {deadline ? <span>Deadline: {deadline}</span> : null}
              {affected ? <span>Affects: {affected}</span> : null}
            </div>
          ) : null}
        </div>

        {evidence.length ? (
          <div>
            <div className="text-[12.5px] font-medium text-ink3">The evidence · {evidence.length}</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {visible.map((e) => {
                const o = expandAll || open[e.key];
                return (
                  <li key={e.key} className="rounded-[10px] bg-surface2">
                    <button
                      onClick={() => setOpen((x) => ({ ...x, [e.key]: !x[e.key] }))}
                      aria-expanded={Boolean(e.body) ? o : undefined}
                      disabled={!e.body}
                      className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left disabled:cursor-default"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium">{e.label}</span>
                        {e.summary ? <span className="mt-0.5 block text-[13px] leading-5 text-ink2">{e.summary}</span> : null}
                      </span>
                      {e.body ? <Mark kind={o ? "chevron-up" : "chevron-down"} size={12} className="mt-1 text-ink3" /> : null}
                    </button>
                    {o && e.body ? <div className="px-3.5 pb-3 text-[13.5px] leading-[21px] text-ink">{e.body}</div> : null}
                  </li>
                );
              })}
            </ul>
            {visible.length < evidence.length ? (
              <button onClick={() => setAll(true)} className="mt-2 text-[13px] font-medium underline underline-offset-4">
                Show all {evidence.length}
              </button>
            ) : null}
          </div>
        ) : null}

        {form ? <div>{form}</div> : null}

        {done ? (
          <div className="flex items-center gap-3 rounded-[10px] bg-ok-soft px-4 py-3 text-[14px] text-ok">
            <Mark kind="check" />
            <span>
              {done.label} · {userById(done.by)?.name}, {done.at.slice(11, 16)}
            </span>
          </div>
        ) : (
          <div>
            <div className="text-[12.5px] font-medium text-ink3">Your options</div>
            <ul className="mt-2 flex flex-col gap-2">
              {options.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[10px] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
                  <span className="min-w-0 flex-1 text-[13px] leading-5 text-ink2">
                    <span className="font-medium text-ink">What happens next: </span>
                    {o.next}
                  </span>
                  <Button variant={o.primary ? "primary" : "quiet"} size={40} disabled={!isMe || o.disabled} onClick={() => onChoose(o.id)}>
                    {o.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isMe && !done ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-surface2 px-4 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
            <span className="text-[13.5px] text-ink">
              This needs {who?.name}, {who?.role}. You are viewing as {userById(persona)?.name}.
            </span>
            <Button variant="highlight" size={32} onClick={() => setPersona(decider as PersonaId)}>
              View as {who?.name}
            </Button>
          </div>
        ) : null}

        {next ? (
          <div className="flex items-center gap-2 border-t border-line pt-4 text-[13px] text-ink2">
            <span className="font-medium text-ink">Who is next:</span> {next}
          </div>
        ) : null}
      </div>
    </section>
  );
}
