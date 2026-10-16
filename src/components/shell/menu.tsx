"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A small menu button with a list of radio options. Arrows move, Enter picks, Escape closes
 * and returns focus to the button. Clicking outside closes. (Copied from the behaviour of
 * madison_palette_preview.html.)
 */
export function MenuButton<T extends string>({
  label,
  button,
  options,
  value,
  onPick,
  width = 380,
  renderOption,
  align = "right",
  heading,
}: {
  label: string;
  button: React.ReactNode;
  options: T[];
  value: T;
  onPick: (v: T) => void;
  width?: number;
  renderOption: (v: T, selected: boolean) => React.ReactNode;
  align?: "left" | "right";
  heading?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    const i = Math.max(0, options.indexOf(value));
    requestAnimationFrame(() => items.current[i]?.focus());
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, options, value]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items.current[(i + 1) % options.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items.current[(i - 1 + options.length) % options.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items.current[options.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-[13px] text-ink transition-colors duration-[120ms]",
          "shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2",
          open && "bg-surface2",
        )}
      >
        {button}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 rounded-[14px] border border-line bg-surface p-1.5 shadow-(--overlay-shadow)",
            align === "right" ? "right-0" : "left-0",
          )}
          style={{ width }}
        >
          {heading ? <div className="px-3 pt-2 pb-2">{heading}</div> : null}
          {options.map((o, i) => {
            const sel = o === value;
            return (
              <button
                key={o}
                ref={(el) => {
                  items.current[i] = el;
                }}
                role="menuitemradio"
                aria-checked={sel}
                onKeyDown={(e) => onKey(e, i)}
                onClick={() => {
                  onPick(o);
                  setOpen(false);
                  btn.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors duration-[120ms]",
                  "hover:bg-surface2 focus-visible:bg-surface2 focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
                  sel && "bg-accent-soft",
                )}
              >
                {renderOption(o, sel)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
