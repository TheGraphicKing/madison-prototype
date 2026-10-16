"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useScroll, useSpring } from "motion/react";
import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { auditTrail, getChange, run as getRun, runs } from "@/data";
import { useStore } from "@/lib/store";
import { fmtStamp, fmtTime } from "@/lib/dates";
import { recordEntryCount } from "@/lib/player/derive";
import { Page } from "@/components/layout/page";
import { MonoLabel } from "@/components/core/labels";
import { AgentTag, PersonTag } from "@/components/core/tags";
import { ButtonLink } from "@/components/core/button";
import { Segmented } from "@/components/core/tabs";
import { Square } from "@/components/core/mark";

type Entry = { key: string; at: string; who: string; kind: "agent" | "person"; what: string; runId?: string; changeId?: string; live?: boolean; runHead?: boolean };

/** The trail an examiner follows: every decision and agent run, newest first. */
export function Record() {
  const sp = useSearchParams();
  const router = useRouter();
  const runFilter = sp.get("run");
  const changeFilter = sp.get("change");
  const who = (sp.get("who") as "all" | "person" | "agent" | null) ?? "all";
  const record = useStore((s) => s.record);
  const finished = useStore((s) => s.finishedRuns);

  const entries = useMemo(() => {
    const out: Entry[] = [];
    for (const r of record) out.push({ key: r.id, at: r.at, who: r.who, kind: r.kind, what: r.what, runId: r.runId, changeId: r.changeId, live: true });
    for (const r of runs) {
      const f = finished[r.id];
      if (f) out.push({ key: `run-${r.id}`, at: f.at, who: r.stages[0].agents[0], kind: "agent", what: `${r.title}: ${recordEntryCount(r)} entries written`, runId: r.id, changeId: r.change_id, live: true, runHead: true });
    }
    auditTrail.forEach((a, i) => out.push({ key: `a${i}`, at: a.at, who: a.who, kind: a.kind, what: a.what }));
    return out
      .filter((e) => !runFilter || e.runId === runFilter)
      .filter((e) => !changeFilter || e.changeId === changeFilter || e.what.includes(getChange(changeFilter)?.citation ?? "@@"))
      .filter((e) => who === "all" || e.kind === who)
      .sort((a, b) => (a.live === b.live ? b.at.localeCompare(a.at) : a.live ? -1 : 1));
  }, [record, finished, runFilter, changeFilter, who]);

  const list = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 0.6", "end 0.6"] });
  const fill = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  const live = entries.filter((e) => e.live);
  const past = entries.filter((e) => !e.live);
  const setWho = (v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v === "all") p.delete("who");
    else p.set("who", v);
    router.replace(`/record/?${p.toString()}`, { scroll: false });
  };

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">The record</h1>
          <p className="mt-2 max-w-[62ch] text-ink2">Every decision and agent run, with names and times. This is the trail an examiner follows; nothing here can be edited.</p>
        </div>
        <Segmented label="Who" value={who} onChange={setWho} options={[{ value: "all", label: "Everything" }, { value: "person", label: "People" }, { value: "agent", label: "Agents" }]} />
      </div>
      {runFilter || changeFilter ? (
        <div className="mt-6 flex items-center gap-3 text-[14px] text-ink2">
          Showing {runFilter ? getRun(runFilter)?.title : getChange(changeFilter!)?.citation}
          <Link href="/record/" className="underline underline-offset-4">
            Show everything
          </Link>
        </div>
      ) : null}

      <div className="relative mt-10 pl-10">
        {/* the tracing beam: a hairline that fills with ink as you read down */}
        <div aria-hidden className="absolute top-0 bottom-0 left-[11px] w-px bg-line" />
        <motion.div aria-hidden className="absolute top-0 left-[11px] w-px origin-top bg-ink" style={{ scaleY: fill, height: "100%" }} />
        <ol ref={list} className="flex flex-col">
          {live.length ? (
            <li className="mb-2">
              <MonoLabel tone="ink">This session · {live.length}</MonoLabel>
            </li>
          ) : null}
          {live.map((e) => (
            <Row key={e.key} e={e} />
          ))}
          <li className={cn("mb-2", live.length && "mt-10")}>
            <MonoLabel>Before today&apos;s demo · {past.length}</MonoLabel>
          </li>
          {past.map((e) => (
            <Row key={e.key} e={e} />
          ))}
          {entries.length === 0 ? <li className="py-6 text-ink3">Nothing matches.</li> : null}
        </ol>
      </div>
    </Page>
  );
}

function Row({ e }: { e: Entry }) {
  const r = e.runId ? getRun(e.runId) : undefined;
  return (
    <li className="relative grid grid-cols-[150px_minmax(0,1fr)_auto] items-start gap-6 border-b border-line py-4 max-md:grid-cols-1 max-md:gap-1.5">
      <span
        aria-hidden
        className="absolute top-[22px] -left-[33px] block size-[9px]"
        style={{ background: e.live ? "var(--highlight)" : e.kind === "person" ? "var(--ink)" : "var(--surface)", boxShadow: "0 0 0 3px var(--ground), inset 0 0 0 1px var(--ink)" }}
      />
      <span className="t-data pt-0.5 text-[11.5px] text-ink2">{e.live ? `Today ${fmtTime(e.at)}` : fmtStamp(e.at)}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {e.kind === "agent" ? <AgentTag id={e.who} /> : <PersonTag id={e.who} showRole />}
          {e.changeId ? (
            <Link href={`/rules/${e.changeId}/`} className="t-data text-[11px] text-ink3 hover:underline">
              {getChange(e.changeId)?.citation}
            </Link>
          ) : null}
        </div>
        <p className={cn("mt-1 text-[15px] leading-[23px]", e.runHead && "font-medium")}>{e.what}</p>
      </div>
      <div className="flex items-center gap-3 max-md:justify-start">
        {e.runHead && r ? (
          <ButtonLink href={`/runs/${r.id}/?mode=replay&from=/record/`} variant="quiet" size={32}>
            Replay
          </ButtonLink>
        ) : e.kind === "person" ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink3">
            <Square size={5} color="var(--ink)" /> Decision
          </span>
        ) : null}
      </div>
    </li>
  );
}
