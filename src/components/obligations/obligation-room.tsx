"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { agentById, auditTrail, controlById, driftFor, gapFor, getChange, getDuty, handoffs, linksFor, run as getRun, ruleSections, tasks, userById } from "@/data";
import { useStore } from "@/lib/store";
import { useCoverage } from "@/lib/use-change";
import { fmtDate, fmtStamp } from "@/lib/dates";
import { Page } from "@/components/layout/page";
import { Tabs, Segmented } from "@/components/core/tabs";
import { CertaintyWord, certaintyFrom, StatusChip } from "@/components/core/status";
import { Square } from "@/components/core/mark";
import { ButtonLink } from "@/components/core/button";
import { Quoted } from "@/components/run/quoted";
import { DriftPair } from "@/components/change/drift-pair";
import { WhoOwns } from "@/components/core/who-owns";
import { useSceneSupport } from "@/components/scene/support";
import { LineageChain, lineageOf, type Layer } from "./lineage";

const Lineage3D = dynamic(() => import("./lineage").then((m) => m.Lineage3D), { ssr: false, loading: () => <div className="h-full w-full" /> });

type Tab = "behind" | "history" | "open";

export function ObligationRoom({ id }: { id: string }) {
  const d = getDuty(id)!;
  const state = useCoverage(d);
  const sp = useSearchParams();
  const router = useRouter();
  const tab: Tab = sp.get("tab") === "history" ? "history" : sp.get("tab") === "open" ? "open" : "behind";
  const setTab = (t: Tab) => router.replace(`/obligations/${id}/${t === "behind" ? "" : `?tab=${t}`}`, { scroll: false });
  const change = getChange(d.change_id);
  const sec = d.rule_section_id ? ruleSections.find((s) => s.id === d.rule_section_id) : undefined;
  const history = useHistory(id);
  const open = useOpenItems(id, state);

  return (
    <Page wide>
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="t-data text-ink2">{d.citation}</span>
            <StatusChip state={state} />
          </div>
          <h1 className="mt-2 text-[21px] leading-[28px] font-medium tracking-[-0.012em]">{d.plain}</h1>
          <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            <div>
              <dt className="text-[12px] text-ink3">Certainty</dt>
              <dd className="mt-0.5">
                <CertaintyWord value={certaintyFrom(d.confidence)} />
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink3">Deadline in the rule</dt>
              <dd className="mt-0.5">{d.deadline_text}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink3">Compliance date</dt>
              <dd className="mt-0.5">{change ? fmtDate(change.effective_date) : "In force"}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink3">Rule change</dt>
              <dd className="mt-0.5">
                <Link href={`/rules/${d.change_id}/`} className="t-data text-[12px] underline underline-offset-4">
                  {change?.citation}
                </Link>
              </dd>
            </div>
          </dl>
        </div>
        <blockquote className="min-w-0 self-start rounded-[12px] bg-surface2 px-4 py-3 text-[13.5px] leading-[21px]">
          {sec ? <Quoted text={sec.after} quote={d.source_text} /> : <>&ldquo;{d.source_text}&rdquo;</>}
          <span className="mt-1 block text-[12px] text-ink3">The rule&apos;s own words · {sec?.section_number ?? d.citation}</span>
        </blockquote>
        <WhoOwns dutyId={d.id} compact className="self-start" />
      </header>

      <Tabs<Tab>
        className="mt-5"
        label="Obligation"
        value={tab}
        onChange={setTab}
        options={[
          { value: "behind", label: "What stands behind it" },
          { value: "history", label: "History", count: history.length },
          { value: "open", label: "Open items", count: open.length },
        ]}
      />
      <div className="mt-4">
        {tab === "behind" ? <Behind id={id} /> : null}
        {tab === "history" ? <History items={history} /> : null}
        {tab === "open" ? <OpenItems items={open} id={id} /> : null}
      </div>
    </Page>
  );
}

function Behind({ id }: { id: string }) {
  const d = getDuty(id)!;
  const state = useCoverage(d);
  const support = useSceneSupport();
  const [view, setView] = useState<"3d" | "2d">("3d");
  // on a phone the stack's cards would not fit, so the chain is shown first
  useEffect(() => {
    if (window.innerWidth < 768) setTimeout(() => setView("2d"), 0);
  }, []);
  const { layers, brk } = useMemo(() => lineageOf(d, state), [d, state]);
  const [sel, setSel] = useState<Layer["key"]>("obligation");
  const layer = layers.find((l) => l.key === sel)!;
  const three = view === "3d" && support === "3d";
  const drift = driftFor(d.id)[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-ink2">From the rule's text to the evidence. Click any step to read it.</p>
          {support === "3d" ? <Segmented<"3d" | "2d"> label="Lineage view" size={28} value={view} onChange={setView} options={[{ value: "3d", label: "3D" }, { value: "2d", label: "List" }]} /> : null}
        </div>
        {three ? (
          <div className="relative h-[clamp(300px,calc(100vh-380px),460px)] overflow-hidden rounded-[14px] border border-line max-md:h-[360px]">
            <Lineage3D layers={layers} brk={brk} selected={sel} onSelect={setSel} />
          </div>
        ) : (
          <div className="rounded-[14px] border border-line bg-surface p-4">
            <LineageChain layers={layers} brk={brk} selected={sel} onSelect={setSel} />
          </div>
        )}
      </div>
      <aside aria-label="Layer detail" className="flex flex-col gap-4 self-start rounded-[14px] border border-line bg-surface p-5">
        <div className="text-[12.5px] font-medium text-ink3">{layer.kind}</div>
        {layer.item ? (
          <>
            <h3 className="text-[16px] leading-6 font-medium">{layer.item.title}</h3>
            {layer.item.sub ? <p className="text-[13px] text-ink2">{layer.item.sub}</p> : null}
            {layer.item.owner || layer.item.date ? (
              <p className="text-[13px] text-ink2">
                {layer.item.owner ? `Owner ${userById(layer.item.owner)?.name}` : ""}
                {layer.item.owner && layer.item.date ? " · " : ""}
                {layer.item.date ?? ""}
              </p>
            ) : null}
            <p className="rounded-[12px] bg-surface2 px-3.5 py-3 text-[14px] leading-[22px]">{layer.item.text}</p>
            {layer.item.href ? (
              <Link href={layer.item.href} className="text-[13.5px] font-medium underline underline-offset-4">
                Open it
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-[14px] leading-[22px] text-ink2">Nothing stands here yet. Until something does, this obligation counts as nothing behind it at this layer.</p>
        )}
        {drift && (sel === "policy" || sel === "procedure") ? <DriftPair drift={drift} stacked /> : null}
      </aside>
    </div>
  );
}

type HistoryItem = { at?: string; who: string; kind: "agent" | "person"; what: string };

function useHistory(id: string): HistoryItem[] {
  const finished = useStore((s) => s.finishedRuns);
  const record = useStore((s) => s.record);
  const decisions = useStore((s) => s.decisions);
  return useMemo(() => {
    const d = getDuty(id)!;
    const change = getChange(d.change_id);
    const sec = d.rule_section_id ? ruleSections.find((s) => s.id === d.rule_section_id) : undefined;
    const out: HistoryItem[] = [];
    const r = change?.run_id ? getRun(change.run_id) : undefined;
    if (r && finished[r.id] && r.events.some((e) => e.type === "item" && e.id === d.id)) {
      const f = finished[r.id];
      out.push({ at: f.at, who: "RC-03", kind: "agent", what: `Proposed from ${sec?.section_number ?? d.citation}, with the exact sentence` });
      const qc = r.events.find((e) => e.type === "check" && e.gate === "RC-04" && e.item_ref === d.id);
      if (qc && qc.type === "check") out.push({ at: f.at, who: "RC-04", kind: "agent", what: `Reviewed: ${qc.reason}` });
      const dec = decisions.find((x) => x.runId === r.id);
      if (dec) out.push({ at: dec.at, who: dec.by, kind: "person", what: d.applicability === "excluded" ? "Excluded: outside the bank's scope" : "Accepted the obligation" });
    }
    for (const l of linksFor(d.id)) {
      const target = l.policy_section_id ?? l.control_id;
      if (l.decided_by_user_id && l.decided_at) out.push({ at: l.decided_at, who: l.decided_by_user_id, kind: "person", what: `Confirmed the link to ${target}` });
      else out.push({ who: "RC-11", kind: "agent", what: `Proposed a link to ${target} (${l.strength}); waiting for a person` });
    }
    const drift = driftFor(d.id);
    for (const a of auditTrail) if (a.what.includes(d.id) || drift.some((dr) => a.what.includes(dr.id))) out.push(a);
    for (const rec of record) if (rec.what.includes(d.id)) out.push({ at: rec.at, who: rec.who, kind: rec.kind, what: rec.what });
    const gap = gapFor(d.id);
    if (gap) out.push({ at: gap.accepted_at, who: gap.accepted_by_user_id, kind: "person", what: `Accepted it as a known gap, until ${fmtDate(gap.expiry)}` });
    return out.sort((a, b) => (a.at ?? "9").localeCompare(b.at ?? "9"));
  }, [id, finished, record, decisions]);
}

function History({ items }: { items: HistoryItem[] }) {
  return (
    <ol className="relative max-w-[760px] border-l border-line pl-6">
      {items.map((h, i) => (
        <li key={i} className="relative pb-6 last:pb-0">
          <span className="absolute top-[7px] -left-[28.5px] block size-[8px] rounded-full" style={{ background: h.kind === "person" ? "var(--ink)" : "var(--surface)", boxShadow: "inset 0 0 0 1.5px var(--ink)" }} />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[13.5px] font-medium">{h.kind === "agent" ? (agentById(h.who)?.name ?? "Madison") : (userById(h.who)?.name ?? h.who)}</span>
            <span className="text-[12px] text-ink3">{h.kind === "agent" ? "Madison" : "Person"} · {h.at ? fmtStamp(h.at) : "Waiting"}</span>
          </div>
          <p className="mt-1 text-[14px] leading-[21px]">{h.what}</p>
        </li>
      ))}
      {items.length === 0 ? <li className="text-ink3">No history yet.</li> : null}
    </ol>
  );
}

type OpenItem = { tone: "ok" | "warn" | "risk" | "info"; text: string; href?: string };

function useOpenItems(id: string, state: string): OpenItem[] {
  const local = useStore((s) => s.handoffs);
  const done = useStore((s) => s.tasksDone);
  return useMemo(() => {
    const d = getDuty(id)!;
    const ctls = linksFor(d.id).map((l) => l.control_id).filter(Boolean) as string[];
    const out: OpenItem[] = [];
    if (state === "nothing_behind") out.push({ tone: "risk", text: "Nothing behind this obligation yet: no policy or control meets it." });
    for (const dr of driftFor(d.id)) out.push({ tone: "risk", text: `Drift: ${dr.summary}` });
    const gap = gapFor(d.id);
    if (gap) out.push({ tone: "info", text: `Known gap accepted by ${userById(gap.accepted_by_user_id)?.name}, until ${fmtDate(gap.expiry)}` });
    for (const c of ctls) {
      const ctl = controlById(c)!;
      if (ctl.freshness_status === "quiet") out.push({ tone: "warn", text: `${ctl.id} ${ctl.name} has had no evidence for ${ctl.quiet_days} days` });
    }
    for (const t of tasks.filter((t) => !done[t.id] && (t.obligation_id === d.id || (t.control_id && ctls.includes(t.control_id)))))
      out.push({ tone: "warn", text: `Task: ${t.title} · ${userById(t.assignee_id)?.name} · due ${fmtDate(t.due)}`, href: `/tasks/?open=${t.id}` });
    for (const h of handoffs.filter((h) => h.blocks.some((b) => b.includes(d.id)) && !local[h.id]))
      out.push({ tone: "warn", text: `Waiting on ${userById(h.to_user_id)?.name}: ${h.title}` });
    return out;
  }, [id, state, local, done]);
}

function OpenItems({ items, id }: { items: OpenItem[]; id: string }) {
  const d = getDuty(id)!;
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <ul className="flex flex-col overflow-clip rounded-[14px] border border-line bg-surface">
        {items.map((it, i) => {
          const body = (
            <span className="flex items-start gap-3 px-5 py-3.5 text-[14px] leading-[21px]">
              <Square size={7} color={`var(--${it.tone})`} className="mt-[7px] rounded-[2px]" />
              <span className={it.href ? "underline decoration-line-strong underline-offset-4" : undefined}>{it.text}</span>
            </span>
          );
          return (
            <li key={i} className="border-b border-line last:border-b-0">
              {it.href ? (
                <Link href={it.href} className="block hover:bg-surface2">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
        {items.length === 0 ? <li className="px-5 py-4 text-[14px] text-ink3">Nothing open.</li> : null}
      </ul>
      <ButtonLink href={`/rules/${d.change_id}/#card-whats_left`} variant="quiet" size={40} className="self-start">
        Open what&apos;s left in the change room
      </ButtonLink>
    </div>
  );
}
