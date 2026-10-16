"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { agentById, getChange, recordV2, resolveRef, run as getRun, userById } from "@/data";
import { useStore } from "@/lib/store";
import { fmtStamp } from "@/lib/dates";
import { Page } from "@/components/layout/page";
import { ButtonLink } from "@/components/core/button";
import { Segmented } from "@/components/core/tabs";
import { useSceneSupport } from "@/components/scene/support";

const Chain3D = dynamic(() => import("./chain-3d").then((m) => m.Chain3D), { ssr: false, loading: () => <div className="h-full w-full" /> });

export interface ChainEntry {
  id: string;
  prev: string | null;
  at: string;
  kind: "person" | "agent";
  whoName: string;
  text: string;
  type: string;
  runId?: string;
  runLabel?: string;
  changeId?: string;
  refs: string[];
  signed: boolean;
  live?: boolean;
}

const TYPE_WORD: Record<string, string> = { propose: "Proposed", check: "Checked", handoff: "Handed over", decide: "Decided", sign_off: "Signed off", read: "Read", start: "Started", person: "Decided", agent: "Agent work" };
const nameOf = (kind: string, id: string) => (kind === "agent" ? (agentById(id)?.name ?? "Madison") : (userById(id)?.name ?? id));

/** Every entry in order, oldest first: the seeded record, the run's entries once it has been played, then this session. */
function useEntries(): ChainEntry[] {
  const finished = useStore((s) => s.finishedRuns);
  const live = useStore((s) => s.record);
  return useMemo(() => {
    const seeded = recordV2.filter((e) => e.run_id !== "run-rule-1005" || finished["run-rule-1005"]);
    const out: ChainEntry[] = seeded.map((e) => {
      const r = e.run_id ? getRun(e.run_id) : undefined;
      const chg = r?.change_id ?? e.refs.map((x) => getChange(x)?.id).find(Boolean);
      return { id: e.id, prev: e.prev, at: e.at, kind: e.kind, whoName: nameOf(e.kind, e.actor), text: e.text, type: e.type, runId: e.run_id ?? undefined, runLabel: r ? `${r.title}` : undefined, changeId: chg, refs: e.refs, signed: e.signed, live: false };
    });
    // keep the chain linked when the run's entries are not shown yet
    const ids = new Set(out.map((e) => e.id));
    for (let i = 0; i < out.length; i++) if (out[i].prev && !ids.has(out[i].prev!)) out[i].prev = i ? out[i - 1].id : null;
    const sessionEntries = [...live].sort((a, b) => a.at.localeCompare(b.at));
    for (const r of sessionEntries) {
      const prev = out[out.length - 1]?.id ?? null;
      out.push({ id: r.id, prev, at: r.at, kind: r.kind, whoName: nameOf(r.kind, r.who), text: r.what, type: r.kind, runId: r.runId, runLabel: r.runId ? getRun(r.runId)?.title : undefined, changeId: r.changeId, refs: [], signed: r.kind === "person", live: true });
    }
    return out;
  }, [finished, live]);
}

export function Record() {
  const sp = useSearchParams();
  const router = useRouter();
  const support = useSceneSupport();
  const entries = useEntries();
  const [view, setView] = useState<"chain" | "list">("chain");
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => Math.max(0, entries.length - 5));
  const sel = entries.find((e) => e.id === selected) ?? null;
  const chain = view === "chain" && support === "3d";

  // scrolling over the chain moves along time
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
      e.preventDefault();
      setCursor((c) => Math.max(0, Math.min(entries.length - 1, c + Math.sign(e.deltaY || e.deltaX))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [entries.length, chain]);

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">The record</h1>
          <p className="mt-2 max-w-[62ch] text-ink2">Every decision and agent action, with names and times, each linked to the one before. This is the trail an examiner follows; nothing here can be edited.</p>
        </div>
        <Segmented<"chain" | "list">
          label="Record view"
          value={chain || view === "chain" ? "chain" : "list"}
          onChange={setView}
          options={[
            { value: "chain", label: "Chain", disabled: support === "2d" },
            { value: "list", label: "List" },
          ]}
        />
      </div>

      {chain ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div ref={box} className="relative h-[460px] overflow-hidden rounded-[16px] border border-line">
              <Chain3D entries={entries} selected={selected} onSelect={setSelected} cursor={cursor} />
              <div className="absolute right-4 bottom-4 left-4 flex items-center gap-3 rounded-[12px] bg-surface/95 px-3 py-2 shadow-[0_0_0_1px_var(--line)]">
                <span className="text-[12px] whitespace-nowrap text-ink3 max-md:hidden">{fmtStamp(entries[0]?.at ?? "")}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, entries.length - 1)}
                  value={cursor}
                  onChange={(e) => setCursor(Number(e.target.value))}
                  aria-label="Move along the record in time"
                  className="flex-1 accent-[var(--ink)]"
                />
                <span className="text-[12px] whitespace-nowrap text-ink3 max-md:hidden">{entries.at(-1)?.live ? "Now" : fmtStamp(entries.at(-1)?.at ?? "")}</span>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-ink3">A rounded cube is a person; a flat tile is an agent. Scroll over the chain to move through time; click an entry to open it.</p>
          </div>
          <EntryPanel e={sel} />
        </div>
      ) : (
        <ListView entries={entries} onOpen={(id) => setSelected(id)} selected={sel} router={router} sp={sp} />
      )}
    </Page>
  );
}

function EntryPanel({ e }: { e: ChainEntry | null }) {
  if (!e)
    return (
      <aside className="self-start rounded-[14px] border border-line bg-surface p-5 text-[14px] leading-[22px] text-ink2">
        Click an entry in the chain to read it: who did it, when, what it refers to, and whether it is signed.
      </aside>
    );
  const r = e.runId ? getRun(e.runId) : undefined;
  return (
    <aside className="flex flex-col gap-3 self-start rounded-[14px] border border-line bg-surface p-5">
      <div className="text-[12.5px] font-medium text-ink3">
        {TYPE_WORD[e.type] ?? "Entry"} · {e.live ? "this session" : fmtStamp(e.at)}
      </div>
      <h2 className="text-[17px] leading-[25px] font-medium">{e.text}</h2>
      <p className="text-[13.5px] text-ink2">
        {e.whoName} · {e.kind === "agent" ? "Madison" : "Person"} · <span className={e.signed ? "text-ok" : undefined}>{e.signed ? "Signed" : "Not signed"}</span>
      </p>
      {e.refs.length ? (
        <ul className="flex flex-col border-t border-line">
          {e.refs.map((x) => {
            const ref = resolveRef(x);
            return (
              <li key={x} className="border-b border-line">
                {ref ? (
                  <Link href={ref.href} className="block py-2 text-[13.5px] leading-5 hover:underline">
                    {ref.label}
                  </Link>
                ) : (
                  <span className="block py-2 text-[13.5px] text-ink2">{x}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {r ? (
        <ButtonLink href={`/runs/${r.id}/?mode=replay&from=/record/`} variant="primary" size={32} className="self-start">
          Replay this run
        </ButtonLink>
      ) : null}
      {e.changeId ? (
        <Link href={`/rules/${e.changeId}/`} className="text-[13.5px] underline underline-offset-4">
          {getChange(e.changeId)?.citation} · change room
        </Link>
      ) : null}
    </aside>
  );
}

function ListView({ entries, onOpen, selected, router, sp }: { entries: ChainEntry[]; onOpen: (id: string) => void; selected: ChainEntry | null; router: ReturnType<typeof useRouter>; sp: ReturnType<typeof useSearchParams> }) {
  const who = (sp.get("who") as "all" | "person" | "agent" | null) ?? "all";
  const change = sp.get("change");
  const run = sp.get("run");
  const [type, setType] = useState<string | null>(null);
  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (!v || v === "all") p.delete(k);
    else p.set(k, v);
    router.replace(`/record/?${p.toString()}`, { scroll: false });
  };
  const changes = Array.from(new Set(entries.map((e) => e.changeId).filter(Boolean))) as string[];
  const types = Array.from(new Set(entries.map((e) => e.type)));
  const rows = [...entries]
    .reverse()
    .filter((e) => who === "all" || e.kind === who)
    .filter((e) => !change || e.changeId === change)
    .filter((e) => !run || e.runId === run)
    .filter((e) => !type || e.type === type);
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Segmented label="Who" size={28} value={who} onChange={(v) => set("who", v)} options={[{ value: "all", label: "Everyone" }, { value: "person", label: "People" }, { value: "agent", label: "Agents" }]} />
          <select value={change ?? ""} onChange={(e) => set("change", e.target.value || null)} aria-label="Rule change" className="h-8 rounded-[10px] bg-surface px-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--line)]">
            <option value="">Every rule change</option>
            {changes.map((c) => (
              <option key={c} value={c}>
                {getChange(c)?.citation}
              </option>
            ))}
          </select>
          <select value={type ?? ""} onChange={(e) => setType(e.target.value || null)} aria-label="Type" className="h-8 rounded-[10px] bg-surface px-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--line)]">
            <option value="">Every type</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_WORD[t] ?? t}
              </option>
            ))}
          </select>
          {run ? (
            <button className="text-[13px] underline underline-offset-4" onClick={() => set("run", null)}>
              Showing one run · show everything
            </button>
          ) : null}
        </div>
        <ol className="relative border-l border-line pl-6">
          {rows.map((e) => (
            <li key={e.id} className="relative pb-5">
              <span className={cn("absolute top-[7px] -left-[29px] block", e.kind === "person" ? "size-[9px] rounded-[3px]" : "h-[5px] w-[11px] rounded-[2px]")} style={{ background: e.live ? "var(--highlight)" : e.kind === "person" ? "var(--ink2)" : "var(--vizInfo)" }} />
              <button onClick={() => onOpen(e.id)} className={cn("w-full rounded-[10px] px-3 py-2 text-left transition-colors", selected?.id === e.id ? "bg-surface shadow-[inset_0_0_0_1px_var(--line)]" : "hover:bg-surface2")}>
                <span className="block text-[12.5px] text-ink3">
                  {e.live ? "This session" : fmtStamp(e.at)} · {TYPE_WORD[e.type] ?? e.type}
                </span>
                <span className="block text-[15px] leading-[22px]">{e.text}</span>
                <span className="block text-[13px] text-ink2">
                  {e.whoName}
                  {e.signed ? " · signed" : ""}
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 ? <li className="py-4 text-ink3">Nothing matches these filters.</li> : null}
        </ol>
      </div>
      <EntryPanel e={selected} />
    </div>
  );
}
