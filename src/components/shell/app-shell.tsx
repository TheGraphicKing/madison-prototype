"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Rail } from "./rail";
import { Header } from "./header";
import { Toasts } from "./toasts";
import { PlaybackEngine } from "@/lib/player/engine";

export function AppShell({ children, ask }: { children: React.ReactNode; ask?: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    useStore.persist.rehydrate();
    if (window.matchMedia("(max-width: 1100px)").matches) setCollapsed(true);
  }, []);

  // The agent canvas is full-screen: no rail, its own header.
  if (pathname.startsWith("/runs/")) {
    return (
      <>
        <PlaybackEngine />
        {children}
        {ask}
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
      <Rail collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      {ask}
      <Toasts />
    </div>
  );
}
