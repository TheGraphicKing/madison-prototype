"use client";

import { useEffect } from "react";
import { PALETTES, type PaletteId } from "@/theme/palettes";
import { PALETTE_KEY, useStore } from "@/lib/store";
import { MenuButton } from "./menu";
import { Mark } from "@/components/core/mark";

export function applyPalette(id: PaletteId, animate = true) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("palette-switching");
    window.setTimeout(() => root.classList.remove("palette-switching"), 260);
  }
  root.dataset.palette = id;
  try {
    localStorage.setItem(PALETTE_KEY, id);
  } catch {}
}

/** Four overlapping 10 px squares of the current palette, then "Color". */
export function ColorButton() {
  const palette = useStore((s) => s.palette);
  const setPalette = useStore((s) => s.setPalette);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PALETTE_KEY);
    } catch {}
    const id = (PALETTES.find((p) => p.id === saved)?.id ?? "graphite") as PaletteId;
    setPalette(id);
    applyPalette(id, false);
  }, [setPalette]);

  const current = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  return (
    <MenuButton<PaletteId>
      label="Color"
      value={palette}
      options={PALETTES.map((p) => p.id)}
      onPick={(id) => {
        setPalette(id);
        applyPalette(id);
      }}
      button={
        <>
          <span className="flex" aria-hidden>
            {current.dots.map((c, i) => (
              <span
                key={i}
                className="block size-[10px]"
                style={{ background: c, marginLeft: i ? -3 : 0, boxShadow: "0 0 0 1px var(--surface)" }}
              />
            ))}
          </span>
          <span>Color</span>
        </>
      }
      renderOption={(id, sel) => {
        const p = PALETTES.find((x) => x.id === id)!;
        return (
          <>
            <span className="flex shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_var(--line)]" aria-hidden>
              {p.swatch.map((c, i) => (
                <span key={i} className="block h-[34px] w-[12px]" style={{ background: c }} />
              ))}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
                {p.name}
                <span className="t-label">{p.mode}</span>
              </span>
              <span className="text-[12px] leading-[17px] text-ink2">{p.about}</span>
            </span>
            {sel ? <Mark kind="check" className="text-ink" /> : <span className="w-[14px]" />}
          </>
        );
      }}
    />
  );
}
