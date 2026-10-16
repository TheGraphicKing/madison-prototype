"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { coverageLinks, driftFlags, getDuty, policySections, procedureSections } from "@/data";
import { fmtDate } from "@/lib/dates";
import { MonoLabel } from "@/components/core/labels";
import { PersonTag } from "@/components/core/tags";
import { Mark, Square } from "@/components/core/mark";
import { StatusChip } from "@/components/core/status";
import { DriftPair } from "@/components/change/drift-pair";
import Link from "next/link";

type Node = { id: string; label: string; detail?: string; drift?: boolean; children?: Node[] };

/**
 * The documents as a tree, after Magic UI's file-tree: Tree, Folder, File, with keyboard
 * expand and select. Rebuilt with drawn chevrons and squares in place of folder icons.
 */
function useTree(): Node[] {
  return useMemo(() => {
    const drifted = new Set(driftFlags.flatMap((d) => [d.policy_section_id, d.procedure_section_id]));
    const group = <T extends { id: string; document_code: string; document_title: string; section_number: string; heading: string }>(list: T[]) => {
      const docs = new Map<string, Node>();
      for (const s of list) {
        const d = docs.get(s.document_code) ?? { id: s.document_code, label: s.document_code, detail: s.document_title, children: [] };
        d.children!.push({ id: s.id, label: `${s.section_number} ${s.heading}`, drift: drifted.has(s.id) });
        if (drifted.has(s.id)) d.drift = true;
        docs.set(s.document_code, d);
      }
      return [...docs.values()];
    };
    return [
      { id: "policies", label: "Policies", children: group(policySections) },
      { id: "procedures", label: "Procedures", children: group(procedureSections) },
    ];
  }, []);
}

export function Documents() {
  const tree = useTree();
  const sp = useSearchParams();
  const router = useRouter();
  const selected = sp.get("doc") ?? "POL-DISP-01-4.2";
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const s = new Set<string>(["policies", "procedures"]);
    const p = policySections.find((x) => x.id === selected) ?? procedureSections.find((x) => x.id === selected);
    if (p) s.add(p.document_code);
    else s.add("POL-DISP-01");
    return s;
  });
  const pick = (id: string) => router.replace(`/coverage/?view=documents&doc=${id}`, { scroll: false });
  const toggle = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const pol = policySections.find((p) => p.id === selected);
  const prc = procedureSections.find((p) => p.id === selected);
  const sec = pol ?? prc;
  const drift = driftFlags.filter((d) => d.policy_section_id === selected || d.procedure_section_id === selected);
  const links = coverageLinks.filter((l) => l.policy_section_id === selected);

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div role="tree" aria-label="Policies and procedures" className="flex flex-col rounded-[14px] bg-surface p-2 shadow-[0_0_0_1px_var(--line)]">
        {tree.map((root) => (
          <TreeNode key={root.id} node={root} depth={0} openIds={openIds} toggle={toggle} selected={selected} onPick={pick} />
        ))}
        <div className="mt-3 flex items-center gap-2 border-t border-line px-2 pt-3 text-[12px] text-ink2">
          <Square size={6} color="var(--risk)" /> Drift: the policy and its procedure disagree
        </div>
      </div>
      <article className="min-w-0">
        {sec ? (
          <>
            <MonoLabel>
              {sec.document_code} · {sec.document_title} · version {sec.doc_version}
            </MonoLabel>
            <h2 className="t-page mt-2">
              {sec.section_number} {sec.heading}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink2">
              <PersonTag id={sec.owner_id} />
              {pol ? <span>Approved {fmtDate(pol.approved_at)} · review due {fmtDate(pol.review_due_at)}</span> : null}
            </div>
            <p className="mt-6 max-w-[64ch] text-[18px] leading-[30px]">{sec.text}</p>
            {drift.map((d) => (
              <div key={d.id} className="mt-10 max-w-[820px]">
                <DriftPair drift={d} />
                <Link href={`/obligations/${d.obligation_id}/`} className="mt-3 inline-block text-[14px] underline underline-offset-4">
                  Open {d.obligation_id}: {getDuty(d.obligation_id)?.plain}
                </Link>
              </div>
            ))}
            {links.length ? (
              <section className="mt-10">
                <MonoLabel>Obligations this section covers · {links.length}</MonoLabel>
                <ul className="mt-2 flex flex-col border-t border-line">
                  {links.map((l) => {
                    const d = getDuty(l.obligation_id)!;
                    return (
                      <li key={l.id} className="grid grid-cols-[110px_1fr_auto] gap-4 border-b border-line py-3">
                        <Link href={`/obligations/${d.id}/`} className="t-data text-[11.5px] text-ink2 hover:underline">
                          {d.id}
                        </Link>
                        <span className="text-[14px] leading-[21px]">
                          {d.plain}
                          <span className="block text-[12.5px] text-ink2">&ldquo;{l.quote}&rdquo; · {l.strength} · {l.status}</span>
                        </span>
                        <StatusChip state={d.coverage_state} size="sm" />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <p className="text-ink3">Pick a section.</p>
        )}
      </article>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  openIds,
  toggle,
  selected,
  onPick,
}: {
  node: Node;
  depth: number;
  openIds: Set<string>;
  toggle: (id: string) => void;
  selected: string;
  onPick: (id: string) => void;
}) {
  const isFolder = Boolean(node.children);
  const open = openIds.has(node.id);
  const sel = selected === node.id;
  const onKey = (e: React.KeyboardEvent) => {
    if (isFolder && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      if ((e.key === "ArrowRight") !== open) toggle(node.id);
    }
  };
  return (
    <div role="treeitem" aria-expanded={isFolder ? open : undefined} aria-selected={sel}>
      <button
        onClick={() => (isFolder ? toggle(node.id) : onPick(node.id))}
        onKeyDown={onKey}
        className={cn(
          "flex w-full items-center gap-2 rounded-[10px] py-1.5 pr-2 text-left text-[13.5px] leading-5 hover:bg-surface2",
          sel && "bg-accent-soft text-ink",
          depth === 0 && "t-label py-2 text-ink",
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {isFolder ? <Mark kind={open ? "chevron-down" : "chevron-right"} size={12} className="shrink-0 text-ink3" /> : <Square size={5} color={sel ? "var(--ink)" : "var(--ink3)"} className="ml-[4px] mr-[3px]" />}
        <span className={cn("min-w-0 flex-1 truncate", depth === 1 && "t-data text-[12px]")}>{node.label}</span>
        {node.detail && depth === 1 ? <span className="hidden truncate text-[12px] text-ink3 xl:inline">{node.detail.split(" ").slice(0, 2).join(" ")}</span> : null}
        {node.drift ? <Square size={6} color="var(--risk)" className="shrink-0" /> : null}
      </button>
      {isFolder && open ? (
        <div role="group">
          {node.children!.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} openIds={openIds} toggle={toggle} selected={selected} onPick={onPick} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
