"use client";

import "@xyflow/react/dist/base.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BaseEdge, Handle, Position, ReactFlow, getBezierPath, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  auditTrail,
  controlById,
  driftFor,
  gapFor,
  getChange,
  getDuty,
  impactFor,
  linksFor,
  policyById,
  procedureById,
  ruleSections,
  run as getRun,
  tasks,
  userById,
  vendors,
} from "@/data";
import { useStore } from "@/lib/store";
import { useCoverage } from "@/lib/use-change";
import { fmtDate, fmtStamp } from "@/lib/dates";
import { Page, Section } from "@/components/layout/page";
import { MonoLabel } from "@/components/core/labels";
import { AgentTag, PersonTag } from "@/components/core/tags";
import { CertaintyWord, certaintyFrom, STATE_COLOR, StatusChip } from "@/components/core/status";
import { Square } from "@/components/core/mark";
import { Bracket } from "@/components/core/bracket";
import { Quoted } from "@/components/canvas/inspector";
import { ButtonLink } from "@/components/core/button";
import { DriftPair } from "@/components/change/drift-pair";

type LNode = { kind: string; title: string; sub?: string; href?: string; tone?: string };

function LineageNode({ data, id }: NodeProps<Node<LNode & { lit: boolean; dim: boolean }>>) {
  return (
    <Bracket
      color={data.lit ? "var(--ink)" : "var(--lineStrong)"}
      className="w-[178px] bg-surface px-3 py-2.5 transition-opacity duration-[120ms]"
      style={{ opacity: data.dim ? 0.25 : 1 }}
      data-id={id}
    >
      <Handle type="target" position={Position.Left} className="!size-[6px] !min-h-0 !min-w-0 !rounded-none !border !border-ink !bg-surface" />
      <div className="flex items-center gap-2">
        <Square size={6} color={data.tone ?? "var(--ink)"} />
        <span className="t-label text-[9.5px]">{data.kind}</span>
      </div>
      <div className="mt-1 line-clamp-3 text-[13px] leading-[18px] text-ink">{data.title}</div>
      {data.sub ? <div className="t-data mt-1 truncate text-[10.5px] text-ink3">{data.sub}</div> : null}
      <Handle type="source" position={Position.Right} className="!size-[6px] !min-h-0 !min-w-0 !rounded-none !border !border-ink !bg-ink" />
    </Bracket>
  );
}

function LineageEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<Edge<{ lit: boolean; dim: boolean }>>) {
  const [d] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 });
  const lit = data?.lit;
  return (
    <g style={{ opacity: data?.dim ? 0.25 : 1 }}>
      <BaseEdge id={id} path={d} style={{ stroke: lit ? "var(--ink)" : "var(--lineStrong)", strokeWidth: lit ? 1.5 : 1 }} />
      {lit ? (
        <rect x={-2.5} y={-2.5} width={5} height={5} fill="var(--ink)">
          <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
        </rect>
      ) : null}
    </g>
  );
}

const nodeTypes = { lineage: LineageNode };
const edgeTypes = { lineage: LineageEdge };

function useLineage(dutyId: string) {
  return useMemo(() => {
    const d = getDuty(dutyId)!;
    const nodes: { id: string; col: number; data: LNode }[] = [];
    const edges: { s: string; t: string }[] = [];
    const sec = d.rule_section_id ? ruleSections.find((s) => s.id === d.rule_section_id) : undefined;
    nodes.push({ id: "rule", col: 0, data: { kind: "Rule section", title: sec ? `${sec.section_number} ${sec.heading}` : d.citation, sub: getChange(d.change_id)?.citation, href: `/rules/${d.change_id}/` } });
    nodes.push({ id: "words", col: 1, data: { kind: "The rule's words", title: `“${d.source_text}”`, sub: d.citation } });
    nodes.push({ id: "duty", col: 2, data: { kind: "Duty", title: d.plain, sub: d.id, tone: STATE_COLOR[d.coverage_state] } });
    edges.push({ s: "rule", t: "words" }, { s: "words", t: "duty" });
    const links = linksFor(d.id);
    const drift = driftFor(d.id);
    for (const l of links) {
      if (l.policy_section_id) {
        const p = policyById(l.policy_section_id)!;
        nodes.push({ id: p.id, col: 3, data: { kind: `Policy · ${l.strength}`, title: `${p.section_number} ${p.heading}`, sub: p.document_code, href: `/coverage/?view=documents&doc=${p.id}`, tone: l.strength === "full" ? "var(--ok)" : "var(--warn)" } });
        edges.push({ s: "duty", t: p.id });
      }
    }
    for (const dr of drift) {
      const pr = procedureById(dr.procedure_section_id)!;
      nodes.push({ id: pr.id, col: 4, data: { kind: "Procedure step", title: `${pr.section_number}: ${pr.heading}`, sub: `${pr.document_code} · drift ${dr.id}`, href: `/coverage/?view=documents&doc=${pr.id}`, tone: "var(--risk)" } });
      edges.push({ s: nodes.some((n) => n.id === dr.policy_section_id) ? dr.policy_section_id : "duty", t: pr.id });
    }
    const ctlIds: string[] = [];
    for (const l of links) {
      if (l.control_id) {
        const c = controlById(l.control_id)!;
        ctlIds.push(c.id);
        nodes.push({ id: c.id, col: 4, data: { kind: `Control · ${c.cadence ?? "no cadence"}`, title: c.name, sub: c.id, tone: c.freshness_status === "fresh" ? "var(--ok)" : "var(--warn)" } });
        edges.push({ s: "duty", t: c.id });
        nodes.push({
          id: `ev-${c.id}`,
          col: 5,
          data: { kind: "Evidence", title: c.last_artifact_date ? `Last artifact ${fmtDate(c.last_artifact_date)}` : "No evidence yet", sub: c.quiet_days ? `quiet ${c.quiet_days} days` : c.freshness_status, tone: c.freshness_status === "fresh" ? "var(--ok)" : "var(--warn)" },
        });
        edges.push({ s: c.id, t: `ev-${c.id}` });
      }
    }
    nodes.push({ id: "owner", col: 5, data: { kind: "Owner", title: userById(d.owner_id)?.name ?? d.owner_id, sub: userById(d.owner_id)?.role, tone: "var(--person)" } });
    edges.push({ s: "duty", t: "owner" });
    const impact = impactFor(d.change_id);
    const vs = vendors.filter(
      (v) => v.services.some((s) => d.process_tags.includes(s.process_tag)) || ctlIds.some((c) => controlById(c)?.runs_on_vendors.includes(v.id)),
    );
    for (const v of vs) {
      const runsCtl = ctlIds.find((c) => controlById(c)?.runs_on_vendors.includes(v.id));
      nodes.push({ id: v.id, col: 6, data: { kind: `Vendor · ${v.criticality}`, title: v.name, sub: impact?.vendors.find((x) => x.vendor_id === v.id)?.why ?? (runsCtl ? `runs ${runsCtl}` : v.services[0].name) } });
      edges.push({ s: runsCtl ?? "duty", t: v.id });
    }
    // positions: columns left to right, rows centred
    const byCol = new Map<number, typeof nodes>();
    for (const n of nodes) (byCol.get(n.col) ?? byCol.set(n.col, []).get(n.col)!).push(n);
    const rf: Node<LNode & { lit: boolean; dim: boolean }>[] = [];
    const maxRows = Math.max(...[...byCol.values()].map((l) => l.length));
    for (const [col, list] of byCol) {
      list.forEach((n, i) => {
        const y = (i - (list.length - 1) / 2) * 112 + ((maxRows - 1) / 2) * 112;
        rf.push({ id: n.id, type: "lineage", position: { x: col * 204, y }, data: { ...n.data, lit: false, dim: false }, draggable: false, selectable: false });
      });
    }
    return { duty: d, nodes: rf, edges, links, drift, controls: ctlIds };
  }, [dutyId]);
}

/** Everything on the path through a node: its ancestors and descendants. */
function pathThrough(id: string, edges: { s: string; t: string }[]) {
  const set = new Set([id]);
  const up = [id];
  while (up.length) {
    const x = up.pop()!;
    for (const e of edges) if (e.t === x && !set.has(e.s)) (set.add(e.s), up.push(e.s));
  }
  const down = [id];
  while (down.length) {
    const x = down.pop()!;
    for (const e of edges) if (e.s === x && !set.has(e.t)) (set.add(e.t), down.push(e.t));
  }
  return set;
}

export function DutyRoom({ id }: { id: string }) {
  const { duty: d, nodes, edges, drift, controls } = useLineage(id);
  const state = useCoverage(d);
  const [hover, setHover] = useState<string | null>(null);
  const finished = useStore((s) => s.finishedRuns);
  const record = useStore((s) => s.record);
  const decisions = useStore((s) => s.decisions);
  const lit = hover ? pathThrough(hover, edges) : null;
  const rfNodes = nodes.map((n) => ({ ...n, data: { ...n.data, lit: Boolean(lit?.has(n.id)), dim: Boolean(lit && !lit.has(n.id)) } }));
  const rfEdges: Edge<{ lit: boolean; dim: boolean }>[] = edges.map((e, i) => ({
    id: `e${i}`,
    source: e.s,
    target: e.t,
    type: "lineage",
    data: { lit: Boolean(lit?.has(e.s) && lit?.has(e.t)), dim: Boolean(lit && !(lit.has(e.s) && lit.has(e.t))) },
  }));
  const change = getChange(d.change_id);
  const sec = d.rule_section_id ? ruleSections.find((s) => s.id === d.rule_section_id) : undefined;
  const gap = gapFor(d.id);
  const tks = tasks.filter((t) => t.obligation_id === d.id || (t.control_id && controls.includes(t.control_id)) || (t.change_id === d.change_id && t.action !== "sign_off"));

  // history: what the data and the demo can prove, in order
  const history: { at?: string; who: string; kind: "agent" | "person"; what: string }[] = [];
  const r = change?.run_id ? getRun(change.run_id) : undefined;
  const runDone = r && finished[r.id];
  if (r && runDone && r.events.some((e) => e.type === "item" && e.id === d.id)) {
    const f = finished[r.id];
    history.push({ at: f.at, who: "RC-03", kind: "agent", what: `Proposed from ${sec?.section_number ?? d.citation}, with the exact sentence` });
    const qc = r.events.find((e) => e.type === "check" && e.gate === "RC-04" && e.item_ref === d.id);
    if (qc && qc.type === "check") history.push({ at: f.at, who: "RC-04", kind: "agent", what: `Reviewed: ${qc.reason}` });
    const dec = decisions.find((x) => x.runId === r.id);
    if (dec) history.push({ at: dec.at, who: dec.by, kind: "person", what: d.applicability === "excluded" ? "Excluded: outside Northgate's scope" : "Accepted the duty" });
  }
  for (const l of linksFor(d.id)) {
    if (l.decided_by_user_id && l.decided_at) history.push({ at: l.decided_at, who: l.decided_by_user_id, kind: "person", what: `Confirmed link to ${l.policy_section_id ?? l.control_id}` });
    else history.push({ who: "RC-11", kind: "agent", what: `Proposed link to ${l.policy_section_id ?? l.control_id} (${l.strength}), waiting for a person` });
  }
  for (const a of auditTrail) if (a.what.includes(d.id) || drift.some((dr) => a.what.includes(dr.id))) history.push({ at: a.at, who: a.who, kind: a.kind, what: a.what });
  for (const rec of record) if (rec.what.includes(d.id)) history.push({ at: rec.at, who: rec.who, kind: rec.kind, what: rec.what });
  if (gap) history.push({ at: gap.accepted_at, who: gap.accepted_by_user_id, kind: "person", what: `Accepted known gap ${gap.id}, to expire ${fmtDate(gap.expiry)}` });
  history.sort((a, b) => (a.at ?? "9").localeCompare(b.at ?? "9"));

  return (
    <Page wide>
      <header className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="t-data">{d.id}</span>
            <span className="t-data text-ink2">{d.citation}</span>
            <StatusChip state={state} />
          </div>
          <h1 className="t-page mt-3 max-w-[36ch]">{d.plain}</h1>
          {sec ? (
            <blockquote className="mt-4 max-w-[80ch] border-l-2 border-ink pl-4 text-[15px] leading-[25px]">
              <Quoted text={sec.after} quote={d.source_text} />
            </blockquote>
          ) : (
            <p className="mt-4 text-[15px] text-ink2">&ldquo;{d.source_text}&rdquo;</p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 self-end lg:col-span-4">
          <div>
            <dt className="t-label">Certainty</dt>
            <dd className="mt-1.5">
              <CertaintyWord value={certaintyFrom(d.confidence)} />
            </dd>
          </div>
          <div>
            <dt className="t-label">Deadline</dt>
            <dd className="mt-1 text-[15px]">{d.deadline_text}</dd>
          </div>
          <div>
            <dt className="t-label">Owner</dt>
            <dd className="mt-1.5">
              <PersonTag id={d.owner_id} />
            </dd>
          </div>
          <div>
            <dt className="t-label">Change</dt>
            <dd className="mt-1">
              <Link href={`/rules/${d.change_id}/`} className="t-data text-[12.5px] underline underline-offset-4">
                {change?.citation}
              </Link>
            </dd>
          </div>
        </dl>
      </header>

      <Section className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="t-section">Lineage</h2>
          <MonoLabel>Rule · words · duty · policy · procedure · control · evidence · owner · vendors · hover to trace</MonoLabel>
        </div>
        <div className="h-[440px] rounded-[4px] bg-ground shadow-[0_0_0_1px_var(--line)] [&_.react-flow__attribution]:hidden" onMouseLeave={() => setHover(null)}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.06, maxZoom: 1.15 }}
            nodesConnectable={false}
            zoomOnScroll={false}
            panOnScroll
            proOptions={{ hideAttribution: true }}
            onNodeMouseEnter={(_, n) => setHover(n.id)}
            onNodeMouseLeave={() => setHover(null)}
            onNodeClick={(_, n) => {
              const href = (n.data as LNode).href;
              if (href) window.location.assign(href);
            }}
            aria-label={`Lineage of ${d.id}`}
          />
        </div>
      </Section>

      <div className="mt-14 grid gap-12 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="t-section">History</h2>
          <ol className="relative mt-4 border-l border-line pl-6">
            {history.map((h, i) => (
              <li key={i} className="relative pb-6 last:pb-0">
                <span className="absolute top-[7px] -left-[28px] block size-[7px] bg-surface shadow-[inset_0_0_0_1px_var(--ink)]" style={{ background: h.kind === "person" ? "var(--ink)" : undefined }} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {h.kind === "agent" ? <AgentTag id={h.who} /> : <PersonTag id={h.who} />}
                  <span className="t-data text-[11px] text-ink3">{h.at ? fmtStamp(h.at) : "Waiting"}</span>
                </div>
                <p className="mt-1 text-[14px] leading-[21px]">{h.what}</p>
              </li>
            ))}
            {history.length === 0 ? <li className="text-ink3">No history yet.</li> : null}
          </ol>
        </section>
        <aside className="flex flex-col gap-10 lg:col-span-5">
          <section>
            <h2 className="t-section">Open items</h2>
            <ul className="mt-3 flex flex-col border-t border-line">
              {state === "nothing_behind" ? <Item tone="risk" text="Nothing behind this duty yet: no policy or control meets it." /> : null}
              {drift.map((dr) => (
                <Item key={dr.id} tone="risk" text={`Drift ${dr.id}: ${dr.summary}`} />
              ))}
              {gap ? <Item tone="info" text={`Known gap ${gap.id}, accepted by ${userById(gap.accepted_by_user_id)?.name}, expires ${fmtDate(gap.expiry)}`} /> : null}
              {tks.map((t) => (
                <Item key={t.id} tone="warn" text={`${t.title} · due ${fmtDate(t.due)}`} href={t.change_id ? `/rules/${t.change_id}/` : `/tasks/?open=${t.id}`} />
              ))}
              {state === "covered" && !drift.length && !tks.length ? <Item tone="ok" text="Nothing open." /> : null}
            </ul>
          </section>
          <section>
            <h2 className="t-section">Control freshness</h2>
            <ul className="mt-3 flex flex-col border-t border-line">
              {controls.map((cid) => {
                const c = controlById(cid)!;
                return (
                  <li key={cid} className="flex items-center justify-between gap-4 border-b border-line py-3">
                    <span className="min-w-0">
                      <span className="t-data text-[11.5px] text-ink2">{c.id}</span>
                      <span className="block text-[14px]">{c.name}</span>
                    </span>
                    <span className={cn("flex shrink-0 items-center gap-2 text-[13px]", c.freshness_status === "quiet" ? "text-warn" : "text-ink2")}>
                      <Square size={6} color={c.freshness_status === "fresh" ? "var(--ok)" : "var(--warn)"} />
                      {c.freshness_status === "quiet" ? `${c.id} quiet for ${c.quiet_days} days` : c.freshness_status === "fresh" ? `Fresh · ${fmtDate(c.last_artifact_date)}` : "No evidence yet"}
                    </span>
                  </li>
                );
              })}
              {controls.length === 0 ? <li className="py-3 text-[14px] text-ink3">No control is linked to this duty.</li> : null}
            </ul>
          </section>
          {drift[0] ? <DriftPair drift={drift[0]} /> : null}
          <ButtonLink href={`/rules/${d.change_id}/`} variant="quiet" size={40} className="self-start">
            Open the change room
          </ButtonLink>
        </aside>
      </div>
    </Page>
  );
}

function Item({ tone, text, href }: { tone: "ok" | "warn" | "risk" | "info"; text: string; href?: string }) {
  const body = (
    <span className="flex items-start gap-3 py-3 text-[14px] leading-[21px]">
      <Square size={6} color={`var(--${tone})`} className="mt-[7px]" />
      <span className={href ? "underline decoration-line-strong underline-offset-4" : undefined}>{text}</span>
    </span>
  );
  return <li className="border-b border-line">{href ? <Link href={href}>{body}</Link> : body}</li>;
}
