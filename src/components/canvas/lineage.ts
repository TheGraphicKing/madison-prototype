// Lineage for the hover trace: everything an item came from and everything that came from it.
import type { ItemEvent, PersonEvent, Run } from "@/data/types";
import { driftFlags, getDuty, impacts, vendorById, controlById } from "@/data";

export interface Lineage {
  ids: Set<string>;
  stages: Set<string>;
  /** move keys "from>to" that belong to the lineage, for the 1.5 px ink path */
  moves: Set<string>;
}

const cache = new Map<string, Map<string, Set<string>>>();

/** Undirected parent/child graph between item ids for one run. */
function graph(run: Run) {
  const hit = cache.get(run.id);
  if (hit) return hit;
  const g = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    (g.get(a) ?? g.set(a, new Set()).get(a)!).add(b);
    (g.get(b) ?? g.set(b, new Set()).get(b)!).add(a);
  };
  const items = run.events.filter((e): e is ItemEvent => e.type === "item");
  const docs = items.filter((i) => i.kind === "document");
  for (const it of items) {
    if (it.parent_ref) link(it.id, it.parent_ref);
    if (it.kind === "section" && docs[0]) link(it.id, docs[0].id);
  }
  // links "D>POL-..." name the duty and the document they join
  for (const it of items.filter((i) => i.kind === "link")) {
    const [duty, target] = it.id.split(">");
    link(it.id, duty);
    link(it.id, `ref:${target}`);
  }
  // what the change touches, tied back to the duties
  const impact = impacts.find((i) => i.change_id === run.change_id);
  for (const it of items.filter((i) => i.kind === "impact")) {
    const ref = it.id.replace(/^touch-/, "");
    link(it.id, `ref:${ref}`);
    for (const dr of driftFlags.filter((d) => d.procedure_section_id === ref || d.policy_section_id === ref)) link(it.id, dr.obligation_id);
    const v = vendorById(ref);
    if (v && impact) {
      const tags = v.services.map((s) => s.process_tag);
      for (const dId of impact.duties) {
        const d = getDuty(dId);
        if (d && d.process_tags.some((t) => tags.includes(t))) link(it.id, dId);
      }
      for (const c of impact.controls) if (controlById(c)?.runs_on_vendors.includes(ref)) link(it.id, `ref:${c}`);
    }
  }
  // MFA: draft parts belong to the draft control; handoffs come from it
  for (const it of items.filter((i) => i.kind === "draft_part" || i.kind === "handoff")) link(it.id, "CTL-153");
  // candidates belong to the duty under check
  for (const it of items.filter((i) => i.kind === "candidate")) link(it.id, "D-1026-L2");
  cache.set(run.id, g);
  return g;
}

export function lineageOf(run: Run, start: string | string[]): Lineage {
  const g = graph(run);
  const seeds = Array.isArray(start) ? start : [start];
  const ids = new Set<string>(seeds);
  // Walk outward. Duties are the spine: when tracing a duty, never step to a sibling duty;
  // when tracing anything else, its duties join the lineage but are not walked further.
  const queue = [...seeds];
  const isDuty = (x: string) => /^D-[^>]+$/.test(x);
  const seedIsDuty = seeds.some(isDuty);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of g.get(cur) ?? []) {
      if (ids.has(n)) continue;
      if (isDuty(n)) {
        if (seedIsDuty) continue;
        ids.add(n);
        continue;
      }
      // a section's or document's other children are siblings, not lineage
      if (n.startsWith("sec-") && [...ids].some((x) => x.startsWith("sec-"))) continue;
      ids.add(n);
      // documents and vendors are leaves: walking through them reaches unrelated duties
      if (n.startsWith("doc-") || n.startsWith("touch-V-")) continue;
      queue.push(n);
    }
  }
  const stages = new Set<string>();
  const moves = new Set<string>();
  for (const e of run.events) {
    if (e.type === "item" && ids.has(e.id)) {
      stages.add(e.to);
      stages.add(e.from);
      moves.add(`${e.from}>${e.to}`);
    }
    if (e.type === "check" && ids.has(e.item_ref)) {
      const st = run.stages.find((s) => s.agents.includes(e.gate));
      if (st) stages.add(st.key);
    }
    if (e.type === "person" && (e as PersonEvent).items?.some((i) => ids.has(i))) stages.add(e.stage);
  }
  return { ids, stages, moves };
}

