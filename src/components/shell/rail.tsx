"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { institution } from "@/data";
import { useTaskCounts } from "@/lib/counts";
import { useGuide } from "@/lib/demo";
import { usePresenter } from "@/lib/presenter";
import { useStore } from "@/lib/store";
import { NAV_ITEMS } from "./crumbs";
import { NAV_GLYPHS, GlyphChevron, GlyphDemos } from "@/components/glyphs";
import { Dialog } from "@/components/core/overlays";
import { Button } from "@/components/core/button";

const RAIL_KEY = "mad_rail";

/**
 * The floating rail. Expanded it is 240 wide; collapsed it is a 68 wide floating panel showing
 * glyphs only. Hovering a glyph shows its name after 300 ms; hovering the rail for 600 ms opens
 * it as an overlay without moving the page. "[" toggles it. Never letters or initials.
 */
export function Rail({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const top = pathname.split("/").filter(Boolean)[0] ?? "";
  const persona = useStore((s) => s.persona);
  const reset = useStore((s) => s.reset);
  const toast = useStore((s) => s.toast);
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [peek, setPeek] = useState(false);
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null);
  const peekTimer = useRef<number | null>(null);
  const tipTimer = useRef<number | null>(null);
  // the badge and the Today "Needs you" tile read the same selector
  const openTasks = useTaskCounts(persona).needsYou;
  const presenter = usePresenter();
  const wide = !collapsed || peek;

  const clear = () => {
    if (peekTimer.current) window.clearTimeout(peekTimer.current);
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
  };
  useEffect(() => clear, []);

  return (
    <aside
      aria-label="Main"
      onMouseEnter={() => {
        if (!collapsed) return;
        peekTimer.current = window.setTimeout(() => setPeek(true), 600);
      }}
      onMouseLeave={() => {
        clear();
        setPeek(false);
        setTip(null);
      }}
      className={cn(
        "no-print fixed top-3 bottom-3 left-3 z-40 flex flex-col overflow-hidden rounded-[16px] border border-line bg-surface py-4 shadow-(--overlay-shadow) transition-[width] duration-[240ms] ease-(--ease) max-md:hidden",
        wide ? "w-60 px-3" : "w-[68px] px-2.5",
      )}
    >
      <Link href="/" className={cn("flex h-9 items-center", wide ? "px-2.5" : "justify-center")} aria-label="Madison, Today">
        {wide ? (
          <span className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-[20px] leading-6 font-medium tracking-[-0.02em]">Madison</span>
            <span className="text-[11px] text-ink3">by Lyzr</span>
          </span>
        ) : (
          <span aria-hidden className="block size-[22px] rounded-[7px] bg-ink" />
        )}
      </Link>
      <div className={cn("overflow-hidden whitespace-nowrap transition-opacity", wide ? "h-auto px-2.5 pt-1 pb-4 opacity-100" : "h-0 opacity-0")}>
        <div className="text-[12.5px] text-ink3">{institution.name}</div>
      </div>
      {!wide ? <div className="h-4" /> : null}

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((n) => {
          const on = n.match === top;
          const G = NAV_GLYPHS[n.match as keyof typeof NAV_GLYPHS];
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              aria-label={n.label}
              onMouseEnter={(e) => {
                if (wide) return;
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                if (tipTimer.current) window.clearTimeout(tipTimer.current);
                tipTimer.current = window.setTimeout(() => setTip({ label: n.label, y: r.top + r.height / 2 }), 300);
              }}
              onMouseLeave={() => {
                if (tipTimer.current) window.clearTimeout(tipTimer.current);
                setTip(null);
              }}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-[10px] text-[14px] whitespace-nowrap transition-colors duration-[120ms]",
                wide ? "px-2.5" : "justify-center",
                on ? "bg-surface3 font-medium text-ink" : "text-ink2 hover:bg-surface2 hover:text-ink",
              )}
            >
              <G size={20} />
              {wide ? <span className="flex-1">{n.label}</span> : null}
              {wide && n.match === "tasks" && openTasks > 0 ? <span className="t-data text-[11px] text-ink3">{openTasks}</span> : null}
            </Link>
          );
        })}
      </nav>

      {wide ? (
        <div className="mt-5 border-t border-line px-2.5 pt-4 whitespace-nowrap">
          <div className="text-[12px] text-ink3">Also in Madison</div>
          <div className="mt-2 flex flex-col gap-1 text-[13.5px] text-ink3 opacity-60" aria-disabled>
            <span title="Not part of this prototype">Assurance</span>
            <span title="Not part of this prototype">Third party risk</span>
          </div>
        </div>
      ) : null}

      <div className={cn("mt-auto flex flex-col gap-1 border-t border-line pt-3", wide ? "px-0" : "items-center")}>
        {presenter ? (
        <button
          onClick={() => useGuide.getState().setHub(true)}
          aria-keyshortcuts="D"
          aria-label="Demos"
          onMouseEnter={(e) => !wide && setTip({ label: "Demos · D", y: e.currentTarget.getBoundingClientRect().top + 18 })}
          onMouseLeave={() => setTip(null)}
          className={cn("flex h-9 items-center gap-2 rounded-[10px] text-[13.5px] whitespace-nowrap text-ink2 hover:bg-surface2 hover:text-ink", wide ? "px-2.5" : "w-10 justify-center")}
        >
          <GlyphDemos size={18} />
          {wide ? (
            <>
              Demos <span className="ml-auto t-data text-[11px] text-ink3">D</span>
            </>
          ) : null}
        </button>
        ) : null}
        {wide ? (
          <button onClick={() => setConfirm(true)} className="h-8 rounded-[10px] px-2.5 text-left text-[13px] whitespace-nowrap text-ink3 hover:bg-surface2 hover:text-ink">
            Reset demo
          </button>
        ) : null}
        <button
          onClick={() => {
            setPeek(false);
            onToggle();
          }}
          aria-keyshortcuts="["
          aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
          className={cn("flex h-9 items-center gap-2 rounded-[10px] text-[13px] whitespace-nowrap text-ink3 hover:bg-surface2 hover:text-ink", wide ? "px-2.5" : "w-10 justify-center")}
        >
          <GlyphChevron dir={collapsed ? "right" : "left"} size={18} />
          {wide ? (collapsed ? "Keep open" : "Collapse") : null}
        </button>
      </div>

      {tip && !wide ? (
        <div role="tooltip" className="pointer-events-none fixed left-[92px] z-50 -translate-y-1/2 rounded-[8px] bg-ink px-2.5 py-1 text-[12.5px] whitespace-nowrap text-surface shadow-(--overlay-shadow)" style={{ top: tip.y }}>
          {tip.label}
        </div>
      ) : null}

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset the demo?"
        footer={
          <>
            <Button variant="quiet" size={32} onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button
              variant="primary"
              size={32}
              onClick={() => {
                reset();
                setConfirm(false);
                router.push("/");
                toast("Demo reset. Every decision from this session is cleared.");
              }}
            >
              Reset demo
            </Button>
          </>
        }
      >
        Every decision, run, handoff and record entry made in this session is cleared, so the demo can be shown again.
      </Dialog>
    </aside>
  );
}

export { RAIL_KEY };
