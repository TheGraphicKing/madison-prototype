"use client";

// The "Demos" panel: the five flows, each with who it is for, who starts it, how long it takes
// and one line of the story. "Start this demo" resets only that flow's data and turns on the guide.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { demoFlows, userById } from "@/data";
import { startDemo, useGuide } from "@/lib/demo";
import { SlideOver } from "@/components/core/overlays";
import { Button } from "@/components/core/button";
import { Initials } from "@/components/core/tags";

export function DemoHub() {
  const open = useGuide((s) => s.hubOpen);
  const setHub = useGuide((s) => s.setHub);
  const router = useRouter();
  // D opens the panel, unless the person is typing
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key === "d" || e.key === "D") setHub(!useGuide.getState().hubOpen);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [setHub]);
  return (
    <SlideOver open={open} onOpenChange={setHub} title="Demos" subtitle="Five stories, each from a clear start to a visible result" width={480}>
      <ul className="flex flex-col gap-3">
        {demoFlows.map((f) => {
          const who = userById(f.persona);
          return (
            <li key={f.id} className="rounded-[14px] border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] leading-[22px] font-medium">{f.title}</h3>
                <span className="shrink-0 text-[12.5px] text-ink3">{f.minutes} min</span>
              </div>
              <p className="mt-1 text-[12.5px] text-ink2">For {f.audience}</p>
              <p className="mt-2 text-[13.5px] leading-[21px]">{f.story}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12.5px] text-ink2">
                  {who ? <Initials initials={who.initials} size={24} /> : null}
                  Starts as {who?.name}
                </span>
                <Button variant="primary" size={32} onClick={() => startDemo(f.id, (h) => router.push(h))} data-flow={f.id}>
                  Start this demo
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12.5px] text-ink3">Starting a demo resets only that story's data. Press D to open this panel from anywhere.</p>
    </SlideOver>
  );
}
