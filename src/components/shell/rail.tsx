"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { institution, tasksFor } from "@/data";
import { useStore } from "@/lib/store";
import { NAV_ITEMS } from "./crumbs";
import { Mark } from "@/components/core/mark";
import { Dialog } from "@/components/core/overlays";
import { Button } from "@/components/core/button";

export function Rail({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const top = pathname.split("/").filter(Boolean)[0] ?? "";
  const persona = useStore((s) => s.persona);
  const reset = useStore((s) => s.reset);
  const toast = useStore((s) => s.toast);
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const openTasks = tasksFor(persona).filter((t) => t.state !== "done").length;

  return (
    <aside
      className={cn(
        "no-print sticky top-0 flex h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-[240ms] ease-(--ease) max-md:hidden",
        collapsed ? "w-16" : "w-60",
      )}
      aria-label="Main"
    >
      <div className={cn("flex h-16 flex-col justify-center", collapsed ? "items-center px-0" : "px-6")}>
        <Link href="/" className="flex items-baseline gap-2" aria-label="Madison, Today">
          {collapsed ? (
            <span className="text-[20px] leading-6 font-medium tracking-[-0.02em]">M</span>
          ) : (
            <>
              <span className="text-[20px] leading-6 font-medium tracking-[-0.02em]">Madison</span>
              <span className="t-label text-[9.5px]">by Lyzr</span>
            </>
          )}
        </Link>
      </div>
      {!collapsed ? (
        <div className="border-b border-line px-6 pb-5">
          <div className="t-small text-ink2">{institution.name}</div>
          <div className="t-label mt-1 text-[9.5px]">{institution.city} · {institution.states.length} states</div>
        </div>
      ) : (
        <div className="mx-auto mb-5 h-px w-6 bg-line" />
      )}

      <nav className="flex flex-col py-4">
        {NAV_ITEMS.map((n) => {
          const on = n.match === top;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              title={collapsed ? n.label : undefined}
              className={cn(
                "relative flex h-10 items-center text-[14px] transition-colors duration-[120ms]",
                collapsed ? "justify-center px-0" : "px-6",
                on ? "text-ink" : "text-ink2 hover:text-ink",
              )}
            >
              <span aria-hidden className={cn("absolute top-2 bottom-2 left-0 w-[2px] bg-ink transition-opacity", on ? "opacity-100" : "opacity-0")} />
              {collapsed ? (
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase">{n.label.replace("The ", "").slice(0, 2)}</span>
              ) : (
                <>
                  <span className="flex-1">{n.label}</span>
                  {n.match === "tasks" && openTasks > 0 ? <span className="t-data text-[11px] text-ink3">{openTasks}</span> : null}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto flex flex-col gap-1 border-t border-line py-4", collapsed ? "items-center" : "px-6")}>
        {!collapsed ? (
          <Link href="/gallery/" className="text-[13px] leading-8 text-ink3 hover:text-ink">
            Design system
          </Link>
        ) : null}
        {!collapsed ? (
          <button onClick={() => setConfirm(true)} className="text-left text-[13px] leading-8 text-ink3 hover:text-ink hover:underline underline-offset-4">
            Reset demo
          </button>
        ) : null}
        <button
          onClick={onToggle}
          className={cn("flex h-8 items-center gap-2 text-[13px] text-ink3 hover:text-ink", collapsed && "justify-center")}
          aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
        >
          <Mark kind={collapsed ? "chevron-right" : "chevron-left"} size={12} />
          {!collapsed ? "Collapse" : null}
        </button>
      </div>

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
        Every decision, run and record entry made in this session is cleared, so the demo can be shown again.
      </Dialog>
    </aside>
  );
}
