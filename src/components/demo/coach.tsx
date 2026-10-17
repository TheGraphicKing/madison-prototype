"use client";

// The presenter's coach: a small card, bottom centre, with the step, Back, Next and Exit; a soft
// spotlight ring on the step's target; the talk track folded away. Optional: every flow works without it.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { userById } from "@/data";
import { useStore } from "@/lib/store";
import { flowById, STEP_PATH, STEP_PERSONA, stepDone, useGuide } from "@/lib/demo";
import { Button } from "@/components/core/button";

export function Coach() {
  const { flow: id, step, finished, go, finish, exit, setHub } = useGuide();
  const flow = flowById(id);
  const path = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const s = useStore();
  const [talk, setTalk] = useState(false);
  const [, tick] = useState(0);
  // run state lives outside React; re-check the step a few times a second
  useEffect(() => {
    if (!flow) return;
    const t = setInterval(() => tick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, [flow]);
  const full = `${path}${sp.toString() ? `?${sp}` : ""}`;
  const key = flow ? `${flow.id}-${step}` : "";
  const ring = useSpotlight(flow && !finished ? key : null);
  if (!flow) return null;
  const st = flow.steps[step - 1];
  const done = stepDone(flow.id, step, { s, path: full });
  const last = step === flow.steps.length;

  const next = () => {
    if (last) return finish();
    const k = `${flow.id}-${step + 1}`;
    if (STEP_PERSONA[k]) s.setPersona(STEP_PERSONA[k]);
    if (STEP_PATH[k] && !full.startsWith(STEP_PATH[k].replace(/\/$/, ""))) router.push(STEP_PATH[k]);
    go(step + 1);
  };

  return (
    <>
      {ring ? <div aria-hidden className="pointer-events-none fixed z-[55] rounded-[14px] shadow-[0_0_0_3px_var(--highlight),0_0_0_7px_color-mix(in_oklab,var(--highlight)_35%,transparent)] transition-all duration-300" style={ring} /> : null}
      <div role="dialog" aria-label="Demo guide" className="no-print fixed bottom-5 left-1/2 z-[58] w-[360px] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[16px] bg-surface p-4 shadow-(--overlay-shadow) ring-1 ring-line">
        {finished ? (
          <>
            <div className="text-[12.5px] font-medium text-ok">Demo complete</div>
            <p className="mt-1 text-[15px] leading-[22px] font-medium">{flow.title}</p>
            <p className="mt-1 text-[13.5px] leading-[21px] text-ink2">What changed: {flow.end}.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" size={32} onClick={() => (exit(), setHub(true))}>
                Start another demo
              </Button>
              <Button variant="quiet" size={32} onClick={exit}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-[12px] text-ink3">
              <span>
                Step {step} of {flow.steps.length} · {st.where}
              </span>
              <span>{userById(s.persona)?.name}</span>
            </div>
            <p className="mt-1 text-[14.5px] leading-[21px] font-medium">{st.do}</p>
            <p className="mt-1 text-[13px] leading-[19px] text-ink2">You will see: {st.see}</p>
            <button onClick={() => setTalk((t) => !t)} aria-expanded={talk} className="mt-2 text-[12.5px] font-medium text-ink2 underline underline-offset-4 hover:text-ink">
              {talk ? "Hide the talk track" : "Talk track"}
            </button>
            {talk ? (
              <ul className="mt-1.5 flex flex-col gap-1 rounded-[10px] bg-surface2 px-3 py-2 text-[13px] leading-[19px]">
                {flow.talk_track.map((t) => (
                  <li key={t}>&ldquo;{t}&rdquo;</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="quiet" size={32} disabled={step === 1} onClick={() => go(step - 1)}>
                Back
              </Button>
              <Button variant="primary" size={32} disabled={!done} onClick={next} className={cn(!done && "opacity-60")}>
                {last ? "Finish" : done ? "Next" : "Next, once it happens"}
              </Button>
              <button onClick={exit} className="ml-auto text-[13px] text-ink3 hover:text-ink">
                Exit
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Follows the step's target on screen: any element whose data-demo contains this key. */
function useSpotlight(key: string | null) {
  const [box, setBox] = useState<React.CSSProperties | null>(null);
  useEffect(() => {
    if (!key) {
      setTimeout(() => setBox(null), 0);
      return;
    }
    let raf = 0;
    const find = () => {
      const el = [...document.querySelectorAll<HTMLElement>("[data-demo]")].find((e) => (e.dataset.demo ?? "").split(" ").includes(key) && e.getClientRects().length);
      if (el) {
        const r = el.getBoundingClientRect();
        setBox((b) => {
          const n = { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 };
          return b && b.left === n.left && b.top === n.top && b.width === n.width ? b : n;
        });
      } else setBox((b) => (b ? null : b));
      raf = window.setTimeout(find, 250) as unknown as number;
    };
    find();
    return () => clearTimeout(raf);
  }, [key]);
  return box;
}
