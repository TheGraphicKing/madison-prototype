"use client";

import { useEffect, useRef, useState } from "react";
import { PALETTES, type Mode, type PaletteId } from "@/theme/palettes";
import { MODE_KEY, PALETTE_KEY, useStore } from "@/lib/store";
import { Mark } from "@/components/core/mark";
import { Segmented } from "@/components/core/tabs";
import { cn } from "@/lib/utils";

export function applyTheme(palette: PaletteId, mode: Mode, animate = true) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("palette-switching");
    window.setTimeout(() => root.classList.remove("palette-switching"), 260);
  }
  root.dataset.palette = palette;
  root.dataset.mode = mode;
  try {
    localStorage.setItem(PALETTE_KEY, palette);
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
}

/** Four overlapping squares of the current theme, then "Color". Three palettes, then Light | Dark. */
export function ColorButton() {
  const palette = useStore((s) => s.palette);
  const mode = useStore((s) => s.mode);
  const setPalette = useStore((s) => s.setPalette);
  const setMode = useStore((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // the inline head script has already applied the saved theme; adopt it
  useEffect(() => {
    const root = document.documentElement;
    const p = (PALETTES.find((x) => x.id === root.dataset.palette)?.id ?? "graphite") as PaletteId;
    const m: Mode = root.dataset.mode === "dark" ? "dark" : "light";
    setPalette(p);
    setMode(m);
  }, [setPalette, setMode]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    requestAnimationFrame(() => items.current[Math.max(0, PALETTES.findIndex((p) => p.id === palette))]?.focus());
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, palette]);

  const pick = (p: PaletteId, m: Mode) => {
    setPalette(p);
    setMode(m);
    applyTheme(p, m);
  };
  const current = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items.current[(i + 1) % PALETTES.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items.current[(i - 1 + PALETTES.length) % PALETTES.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btn.current?.focus();
    }
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Color"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-[10px] bg-surface px-3 text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-surface2",
          open && "bg-surface2",
        )}
      >
        <span className="flex" aria-hidden>
          {current.dots[mode].map((c, i) => (
            <span key={i} className="block size-[11px] rounded-[3px]" style={{ background: c, marginLeft: i ? -3 : 0, boxShadow: "0 0 0 1.5px var(--surface)" }} />
          ))}
        </span>
        <span>Color</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Color"
          onKeyDown={(e) => e.key === "Escape" && (setOpen(false), btn.current?.focus())}
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-[360px] rounded-[14px] border border-line bg-surface p-2 shadow-(--overlay-shadow)"
        >
          <div role="radiogroup" aria-label="Palette">
            {PALETTES.map((p, i) => {
              const sel = p.id === palette;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  role="radio"
                  aria-checked={sel}
                  onKeyDown={(e) => onKey(e, i)}
                  onClick={() => pick(p.id as PaletteId, mode)}
                  className={cn("flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left outline-none hover:bg-surface2 focus-visible:bg-surface2", sel && "bg-accent-soft")}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-[8px] shadow-[0_0_0_1px_var(--line)]" aria-hidden>
                    {p.swatch[mode].map((c, k) => (
                      <span key={k} className="block h-[32px] w-[9px]" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[14px] font-medium text-ink">{p.name}</span>
                    <span className="text-[12px] leading-[17px] text-ink2">{p.about}</span>
                  </span>
                  {sel ? <Mark kind="check" /> : <span className="w-[14px]" />}
                </button>
              );
            })}
          </div>
          <div className="mt-1 px-1 pb-1">
            <Segmented<Mode>
              label="Light or dark"
              value={mode}
              onChange={(m) => pick(palette, m)}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
