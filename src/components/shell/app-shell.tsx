"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Rail, RAIL_KEY } from "./rail";
import { Header } from "./header";
import { Toasts } from "./toasts";
import { PlaybackEngine } from "@/lib/player/engine";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { DemoHub } from "@/components/demo/demo-hub";
import { Coach } from "@/components/demo/coach";
import { Suspense } from "react";
import { usePresenter } from "@/lib/presenter";
import { useNav } from "@/lib/nav";

export function AppShell({ children, ask }: { children: React.ReactNode; ask?: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const presenter = usePresenter();
  useEffect(() => {
    useNav.getState().visit(pathname);
  }, [pathname]);

  // Rehydrate the demo state before any child's effects run: a child that sets state first
  // would otherwise overwrite the saved session with defaults.
  useLayoutEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(RAIL_KEY);
    } catch {}
    setCollapsed(saved ? saved === "collapsed" : window.matchMedia("(max-width: 1100px)").matches);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "[" || e.metaKey || e.ctrlKey || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      setCollapsed((c) => {
        try {
          localStorage.setItem(RAIL_KEY, c ? "open" : "collapsed");
        } catch {}
        return !c;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(RAIL_KEY, c ? "open" : "collapsed");
      } catch {}
      return !c;
    });

  // The agent canvas is full-screen: no rail, its own header.
  if (pathname.startsWith("/runs/")) {
    return (
      <>
        <PlaybackEngine />
        {children}
        {ask}
        <TaskDrawer />
        <Toasts />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <PlaybackEngine />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Rail collapsed={collapsed} onToggle={toggle} />
      <div className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-[240ms] ease-(--ease)", collapsed ? "md:pl-[92px]" : "md:pl-[264px]")}>
        <Header />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      {ask}
      <TaskDrawer />
      <Toasts />
      {presenter ? (
        <>
          <DemoHub />
          <Suspense>
            <Coach />
          </Suspense>
        </>
      ) : null}
    </div>
  );
}
