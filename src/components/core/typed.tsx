"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Typing text with a blinking caret. Modelled on Magic UI typing-animation, rebuilt so it
 * can be driven by the run player: pass `elapsed` (ms since the text appeared) and the
 * characters shown are a pure function of it, so seeking is exact. Without `elapsed`
 * it types on its own clock.
 */
export function Typed({
  text,
  elapsed,
  cps = 48,
  caret = true,
  className,
  as: Tag = "span",
  delay = 0,
  onDone,
}: {
  text: string;
  elapsed?: number;
  cps?: number;
  caret?: boolean | "while";
  className?: string;
  as?: React.ElementType;
  delay?: number;
  onDone?: () => void;
}) {
  const [own, setOwn] = useState(0);
  const start = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const controlled = elapsed !== undefined;
  // when the player's clock stops, keep typing from where it was, on the wall clock
  const last = useRef(0);
  if (controlled) last.current = elapsed!;

  useEffect(() => {
    if (controlled || reduced) return;
    let raf = 0;
    start.current = null;
    const from = last.current;
    setOwn(from);
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const e = from + now - start.current - (from > 0 ? 0 : delay);
      setOwn(Math.max(0, e));
      if (e < (text.length / cps) * 1000) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, controlled, reduced, cps, delay]);

  const ms = controlled ? elapsed! : reduced ? Infinity : own;
  const n = Math.min(text.length, Math.floor((ms / 1000) * cps));
  const done = n >= text.length;
  const showCaret = caret === true || (caret === "while" && !done);
  return (
    <Tag className={cn(className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, n)}
        {showCaret ? <span className="caret" /> : null}
      </span>
    </Tag>
  );
}

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}
