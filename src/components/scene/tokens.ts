"use client";

// Colours for every 3D view, read from the live palette so the scenes follow the Color popover
// in light and dark. One source for the four coverage colours.
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const KEYS = [
  "--ground", "--surface", "--surface2", "--surface3", "--line", "--lineStrong",
  "--ink", "--ink2", "--ink3", "--ok", "--warn", "--risk", "--info", "--highlight", "--highlightInk",
  "--vizOk", "--vizWarn", "--vizRisk", "--vizInfo", "--vizMuted",
] as const;
export type Tokens = Record<(typeof KEYS)[number], string>;

export const STATE_VAR = {
  covered: "--vizOk",
  not_yet_confirmed: "--vizWarn",
  nothing_behind: "--vizRisk",
  known_gap: "--vizInfo",
} as const;
export type FourStateKey = keyof typeof STATE_VAR;

export const STATE_WORD: Record<FourStateKey, string> = {
  covered: "Covered",
  not_yet_confirmed: "Not yet confirmed",
  nothing_behind: "Nothing behind it",
  known_gap: "Known gap",
};

/** Height encodes urgency, the same in every scene. */
export const STATE_HEIGHT: Record<FourStateKey, number> = {
  covered: 1,
  not_yet_confirmed: 1.5,
  nothing_behind: 2.2,
  known_gap: 1.8,
};

export function readTokens(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(KEYS.map((k) => [k, cs.getPropertyValue(k).trim() || "#888"])) as Tokens;
}

export function useSceneTokens(): Tokens | null {
  const palette = useStore((s) => s.palette);
  const mode = useStore((s) => s.mode);
  const [t, setT] = useState<Tokens | null>(null);
  useEffect(() => {
    // after the palette attributes land on <html>
    const id = requestAnimationFrame(() => setT(readTokens()));
    return () => cancelAnimationFrame(id);
  }, [palette, mode]);
  return t;
}
