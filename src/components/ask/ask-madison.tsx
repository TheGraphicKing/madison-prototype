"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { askMadison, resolveRef } from "@/data";
import type { AskItem } from "@/data/types";
import { useStore } from "@/lib/store";
import { SlideOver } from "@/components/core/overlays";
import { MonoLabel } from "@/components/core/labels";
import { AgentTag } from "@/components/core/tags";
import { CertaintyWord } from "@/components/core/status";
import { Typed, useReducedMotion } from "@/components/core/typed";
import { Button } from "@/components/core/button";

type Turn = { id: number; q: string; item?: AskItem };

function contextFor(path: string) {
  if (path.startsWith("/rules/") && path.split("/").filter(Boolean).length > 1) return "change";
  if (path.startsWith("/reports")) return "reports";
  return "home";
}

/** Fix links written for the real product's routes. */
const route = (href: string) => {
  const h = href.replace(/^\/changes\//, "/rules/");
  return h.includes("?") || h.endsWith("/") ? h : `${h}/`;
};

/**
 * Ask Madison: answers from the bank's record, with citations. Structure after Vercel AI
 * Elements (conversation, message, chain of thought, sources, inline citation), rebuilt
 * without icons. It never acts on its own: a suggested action is a button the person presses.
 */
export function AskMadison() {
  const open = useStore((s) => s.askOpen);
  const setOpen = useStore((s) => s.setAskOpen);
  const path = usePathname();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const seq = useRef(0);
  const ctx = contextFor(path);
  const suggestions = [...askMadison].sort((a, b) => Number(b.context === ctx) - Number(a.context === ctx)).slice(0, 3);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen(!useStore.getState().askOpen);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [setOpen]);

  const ask = (q: string) => {
    const item = askMadison.find((a) => a.q.toLowerCase() === q.trim().toLowerCase());
    setTurns((t) => [...t, { id: seq.current++, q, item }]);
    setText("");
  };

  if (path.startsWith("/reports/board-pack") || path.startsWith("/reports/exam")) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Meta+J"
        className={cn("no-print fixed right-6 bottom-6 z-30 max-md:right-5 max-md:bottom-5", path.startsWith("/runs/") && "bottom-[112px] max-md:bottom-5")}
        aria-label="Ask Madison"
      >
        <span className="flex h-11 items-center gap-3 rounded-full bg-surface px-5 shadow-(--overlay-shadow) ring-1 ring-line transition-colors hover:bg-surface2">
          <span className="text-[14px] font-medium">Ask Madison</span>
          <span className="t-label max-md:hidden">⌘J</span>
        </span>
      </button>
      <SlideOver open={open} onOpenChange={setOpen} title="Ask Madison" subtitle="Answers from Northgate's record, with citations" width={440}>
        <div className="flex min-h-full flex-col">
          <div role="log" aria-live="polite" className="flex flex-1 flex-col gap-8">
            {turns.length === 0 ? (
              <p className="text-[14px] leading-[22px] text-ink2">Ask about obligations, coverage, vendors or the exam. Madison reads the record and shows what it read.</p>
            ) : null}
            {turns.map((t) => (
              <Exchange key={t.id} turn={t} onPick={ask} suggestions={suggestions} onNavigate={() => setOpen(false)} />
            ))}
          </div>
          <div className="sticky bottom-0 -mx-6 mt-8 border-t border-line bg-surface px-6 pt-4 pb-1">
            <MonoLabel>Suggested here</MonoLabel>
            <ul className="mt-2 flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <li key={s.q}>
                  <button onClick={() => ask(s.q)} className="w-full rounded-[10px] px-3 py-2 text-left text-[13.5px] leading-5 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2">
                    {s.q}
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) ask(text);
              }}
            >
              <label className="sr-only" htmlFor="ask-input">
                Your question
              </label>
              <input
                id="ask-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask a question"
                className="h-10 min-w-0 flex-1 rounded-[10px] bg-surface px-3 text-[14px] shadow-[inset_0_0_0_1px_var(--lineStrong)] outline-none placeholder:text-ink3 focus:shadow-[inset_0_0_0_1px_var(--ink)]"
              />
              <Button type="submit" variant="primary" size={40} disabled={!text.trim()}>
                Ask
              </Button>
            </form>
          </div>
        </div>
      </SlideOver>
    </>
  );
}

function Exchange({ turn, onPick, suggestions, onNavigate }: { turn: Turn; onPick: (q: string) => void; suggestions: AskItem[]; onNavigate: () => void }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const item = turn.item;
  const steps = item?.trail ?? [];
  const total = steps.reduce((n, s) => n + s.ms, 0);
  const [t, setT] = useState(reduced ? total : 0);
  useEffect(() => {
    if (!item || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const e = now - start;
      setT(e);
      if (e < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [item, total, reduced]);
  let acc = 0;
  const done = t >= total;

  return (
    <div className="flex flex-col gap-4">
      <div className="self-end rounded-[10px] bg-surface2 px-3.5 py-2 text-[14px] leading-[21px]">{turn.q}</div>
      {!item ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] leading-[22px]">In this prototype, Madison answers a few scripted questions. Try one of these:</p>
          <ul className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <li key={s.q}>
                <button onClick={() => onPick(s.q)} className="text-left text-[14px] underline underline-offset-4">
                  {s.q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {/* the retrieval trail: steps with agent tags and found counts, dots moving between */}
          <ol className="relative flex flex-col gap-0" aria-label="How Madison found the answer">
            {steps.map((s, i) => {
              const from = acc;
              acc += s.ms;
              const state = t >= acc ? "done" : t >= from ? "running" : "waiting";
              const p = Math.min(1, Math.max(0, (t - from) / s.ms));
              return (
                <li key={i} className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-3 pb-3 last:pb-0">
                  <span className="relative flex justify-center">
                    <span
                      className="relative z-[1] mt-[5px] block size-[8px]"
                      style={{
                        background: state === "done" ? "var(--ink)" : state === "running" ? "var(--highlight)" : "var(--surface)",
                        boxShadow: `inset 0 0 0 1px ${state === "waiting" ? "var(--lineStrong)" : "var(--ink)"}`,
                      }}
                    />
                    {i < steps.length - 1 ? (
                      <span className="absolute top-[14px] bottom-[-6px] w-px bg-line">
                        {state === "running" ? <span className="absolute left-[-1.5px] block size-[4px] rounded-full bg-ink" style={{ top: `${p * 100}%` }} /> : null}
                      </span>
                    ) : null}
                  </span>
                  <span className={cn("flex min-w-0 flex-col gap-0.5", state === "waiting" && "opacity-40")}>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-[13.5px] leading-5">{s.step}</span>
                      {s.found && state === "done" ? <span className="t-data text-[11px] text-ink">{s.found}</span> : null}
                    </span>
                    <AgentTag id={s.agent_id} short />
                  </span>
                </li>
              );
            })}
          </ol>
          {done ? (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-[15px] leading-[24px]">
                <Typed text={item.answer} cps={90} caret="while" />
              </p>
              <CertaintyWord value={item.certainty} />
              <div>
                <MonoLabel>Sources · {item.citations.length}</MonoLabel>
                <ul className="mt-2 flex flex-col">
                  {item.citations.map((c, i) => {
                    const r = resolveRef(c);
                    return (
                      <li key={c}>
                        <Link href={route(r?.href ?? "/")} onClick={onNavigate} className="group grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-b border-line py-2 last:border-b-0">
                          <span className="t-data text-[11px] text-ink3">[{i + 1}]</span>
                          <span className="min-w-0">
                            <span className="t-data block text-[11.5px] text-ink2">{c}</span>
                            <span className="block truncate text-[13px] group-hover:underline">{r?.label}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {item.suggested_action ? (
                <div className="flex items-center justify-between gap-3 rounded-[10px] bg-surface2 px-3 py-2.5">
                  <span className="text-[12.5px] text-ink2">Madison suggests this. Nothing happens until you press it.</span>
                  <Button
                    variant="quiet"
                    size={32}
                    onClick={() => {
                      onNavigate();
                      router.push(route(item.suggested_action!.href));
                    }}
                  >
                    {item.suggested_action.label}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
