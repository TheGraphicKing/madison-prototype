"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getDuty, position, regulations } from "@/data";
import { STATES, useLiveField, type FourState, type Plot } from "@/lib/coverage-field";
import { fmtDate } from "@/lib/dates";
import { Page } from "@/components/layout/page";
import { Count, MonoLabel } from "@/components/core/labels";
import { Segmented } from "@/components/core/tabs";
import { STATE_COLOR, STATE_LABEL, StatusChip } from "@/components/core/status";
import { Button } from "@/components/core/button";
import { Mark } from "@/components/core/mark";
import { DataTable } from "@/components/core/data-table";
import { Documents } from "./documents";
import { Calendar } from "./calendar";
import { PlotDetail } from "./plot-detail";
import { useSceneSupport } from "@/components/scene/support";
import { useCoverageTotals } from "@/lib/counts";

const CoverageField = dynamic(() => import("./field3d").then((m) => m.CoverageField), { ssr: false, loading: () => <div className="h-full w-full bg-surface" /> });

type View = "field" | "map" | "rules" | "documents" | "calendar";
const VIEWS: { value: View; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "map", label: "Map" },
  { value: "rules", label: "By rule" },
  { value: "documents", label: "Documents" },
  { value: "calendar", label: "Calendar" },
];

export function Coverage() {
  const sp = useSearchParams();
  const router = useRouter();
  // phones open on the 2D map; the 3D field stays one tap away
  const [small, setSmall] = useState<boolean | null>(null);
  useEffect(() => setSmall(window.matchMedia("(max-width: 767px)").matches), []);
  const v = (sp.get("view") as View) ?? (small ? "map" : "field");
  const view: View = VIEWS.some((x) => x.value === v) ? v : "field";
  const highlight = (sp.get("state") as FourState | null) ?? null;
  const pos = position();
  const tot = useCoverageTotals();
  const support = useSceneSupport();
  const webgl = support !== "2d";
  const setView = (nv: View) => router.replace(`/coverage/?view=${nv}${highlight ? `&state=${highlight}` : ""}`, { scroll: false });
  const setState = (s: FourState | null) => router.replace(`/coverage/?view=${view}${s ? `&state=${s}` : ""}`, { scroll: false });

  return (
    <Page wide>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-page">Coverage</h1>
          <p className="mt-2 text-ink2">
            {tot.total.toLocaleString("en-US")} applicable obligations across {regulations.length} regulations, as of {fmtDate(pos.as_of)}. {pos.out_of_scope} more are out of scope and {pos.uncertain} are unsure.
          </p>
        </div>
        <Segmented<View> label="Coverage view" value={view} onChange={setView} options={VIEWS} />
      </header>

      <div className="mt-8 grid grid-cols-4 border-y border-line max-md:grid-cols-2">
        {STATES.map((s, i) => (
          <button
            key={s}
            onClick={() => setState(highlight === s ? null : s)}
            aria-pressed={highlight === s}
            className={cn("py-6 text-left transition-colors hover:bg-surface", i && "border-l border-line pl-6", "max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(3)]:pl-0", highlight === s && "bg-surface shadow-[inset_0_-2px_0_var(--ink)]")}
          >
            <Count value={tot[s]} state={s} />
          </button>
        ))}
      </div>

      <div className="mt-8">
        {view === "field" && small === null && !sp.get("view") ? <div className="h-[640px] rounded-[14px] bg-surface shadow-[0_0_0_1px_var(--line)]" /> : null}
        {view === "field" && (small !== null || sp.get("view")) ? webgl ? <FieldView highlight={highlight} /> : <MapView highlight={highlight} note="3D is not available in this browser, so the field is shown as a map." /> : null}
        {view === "map" ? <MapView highlight={highlight} /> : null}
        {view === "rules" ? <ByRule /> : null}
        {view === "documents" ? <Documents /> : null}
        {view === "calendar" ? <Calendar /> : null}
      </div>
    </Page>
  );
}

function FieldView({ highlight }: { highlight: FourState | null }) {
  const { plots } = useLiveField();
  const sp = useSearchParams();
  const [sel, setSel] = useState<number | null>(() => {
    const i = plots.findIndex((p) => p.regulationId === sp.get("plot"));
    return i >= 0 ? i : null;
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative h-[640px] overflow-hidden rounded-[14px] shadow-[0_0_0_1px_var(--line)] max-md:h-[420px]">
        <CoverageField selected={sel} onSelectPlot={setSel} highlightState={highlight} />
      </div>
      <PlotPanel plot={sel !== null ? plots[sel] : null} onClose={() => setSel(null)} plots={plots} onPick={setSel} />
    </div>
  );
}

function PlotPanel({ plot, onClose, plots, onPick }: { plot: Plot | null; onClose: () => void; plots: Plot[]; onPick: (i: number) => void }) {
  if (!plot) {
    return (
      <aside className="flex flex-col gap-3">
        <MonoLabel>Plots · {plots.length} regulations</MonoLabel>
        <p className="text-[14px] leading-[22px] text-ink2">Each plot is one regulation; each tile is one obligation. Known gaps stand a little higher, and obligations with nothing behind them sit lower. Click a plot to fly to it.</p>
        <ul className="mt-2 flex max-h-[470px] flex-col overflow-y-auto border-t border-line">
          {plots
            .map((p, i) => ({ p, i }))
            .sort((a, b) => b.p.counts.nothing_behind + b.p.counts.known_gap - (a.p.counts.nothing_behind + a.p.counts.known_gap) || b.p.total - a.p.total)
            .map(({ p, i }) => (
              <li key={p.regulationId}>
                <button onClick={() => onPick(i)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 text-left hover:bg-surface">
                  <span className="min-w-0">
                    <span className="t-data block text-[11.5px]">{p.citation}</span>
                    <span className="block truncate text-[13px] text-ink2">{p.short}</span>
                  </span>
                  <MiniBar counts={p.counts} width={96} />
                </button>
              </li>
            ))}
        </ul>
      </aside>
    );
  }
  return <PlotDetail plot={plot} onClose={onClose} />;
}

export function MiniBar({ counts, width = 140 }: { counts: Record<FourState, number>; width?: number }) {
  const total = STATES.reduce((n, s) => n + counts[s], 0) || 1;
  return (
    <span className="flex h-[8px] gap-px" style={{ width }} role="img" aria-label={STATES.map((s) => `${counts[s]} ${STATE_LABEL[s].toLowerCase()}`).join(", ")}>
      {STATES.filter((s) => counts[s] > 0).map((s) => (
        <span key={s} className="block h-full" style={{ width: `${(counts[s] / total) * 100}%`, minWidth: 3, background: STATE_COLOR[s] }} />
      ))}
    </span>
  );
}

/** The 2D field: a flat grid of squares per regulation. Zoom: bank, then regulation, then duty. */
function MapView({ highlight, note }: { highlight: FourState | null; note?: string }) {
  const { plots, tiles } = useLiveField();
  const [plot, setPlot] = useState<number | null>(null);
  const [tile, setTile] = useState<number | null>(null);
  const byPlot = useMemo(() => plots.map((_, i) => tiles.filter((t) => t.plot === i)), [plots, tiles]);
  const sel = plot !== null ? plots[plot] : null;
  const st = tile !== null ? tiles[tile] : null;
  return (
    <div>
      {note ? <p className="mb-4 text-[13px] text-ink2">{note}</p> : null}
      <nav aria-label="Map level" className="mb-5 flex items-center gap-2 text-[13px]">
        <button onClick={() => { setPlot(null); setTile(null); }} className={cn(plot === null ? "text-ink" : "text-ink2 underline underline-offset-4")}>
          Northgate
        </button>
        {sel ? (
          <>
            <span className="text-ink3">/</span>
            <button onClick={() => setTile(null)} className={cn(tile === null ? "text-ink" : "text-ink2 underline underline-offset-4")}>
              {sel.citation}
            </button>
          </>
        ) : null}
        {st ? (
          <>
            <span className="text-ink3">/</span>
            <span>Duty {st.k + 1}</span>
          </>
        ) : null}
      </nav>
      {plot === null ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-8 gap-y-8">
          {plots.map((p, i) => (
            <button key={p.regulationId} onClick={() => setPlot(i)} className="group flex flex-col items-start gap-2 text-left">
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="t-label group-hover:text-ink">/ {p.citation}</span>
                <span className="t-data text-[11px] text-ink3">{p.total}</span>
              </span>
              <span className="flex flex-wrap gap-[2px]">
                {byPlot[i].map((t) => (
                  <span key={t.i} className="block size-[6px]" style={{ background: STATE_COLOR[t.state], opacity: highlight && t.state !== highlight ? 0.15 : 1 }} />
                ))}
              </span>
              <span className="truncate text-[12.5px] text-ink2">{p.short}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h2 className="t-section">{sel!.title}</h2>
            <div className="mt-4 flex flex-wrap gap-[3px]">
              {byPlot[plot].map((t) => (
                <button
                  key={t.i}
                  onClick={() => setTile(t.i)}
                  aria-label={`Duty ${t.k + 1}, ${STATE_LABEL[t.state]}`}
                  className={cn("block size-[14px] outline-offset-1", tile === t.i && "outline outline-2 outline-ink")}
                  style={{ background: STATE_COLOR[t.state], opacity: highlight && t.state !== highlight ? 0.15 : 1 }}
                />
              ))}
            </div>
          </div>
          <aside className="flex flex-col gap-3">
            {st ? (
              <>
                <MonoLabel>{sel!.citation} · duty {st.k + 1} of {sel!.total}</MonoLabel>
                {st.dutyId ? (
                  <>
                    <p className="text-[15px] leading-[23px]">{getDuty(st.dutyId)?.plain}</p>
                    <Link href={`/obligations/${st.dutyId}/`} className="text-[14px] underline underline-offset-4">
                      Open the duty room
                    </Link>
                  </>
                ) : (
                  <p className="text-[14px] text-ink2">A {sel!.short} duty on record. The demo script names {sel!.dutyIds.length} of them.</p>
                )}
                <StatusChip state={st.state} />
              </>
            ) : (
              <>
                <MonoLabel>Counts</MonoLabel>
                {STATES.map((s) => (
                  <div key={s} className="flex items-center justify-between border-b border-line py-2">
                    <StatusChip state={s} />
                    <span className="t-data">{sel!.counts[s]}</span>
                  </div>
                ))}
                <p className="text-[13px] text-ink3">Pick a square to see the duty.</p>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/** A table of regulations with a mini stacked bar of the four counts and a check per row. */
function ByRule() {
  const { plots } = useLiveField();
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, number>>({});
  const [running, setRunning] = useState<string | null>(null);
  const check = (p: Plot) => {
    if (p.regulationId === "reg-02") {
      router.push(`/rules/RC-2026-016/`);
      return;
    }
    setRunning(p.regulationId);
    setTimeout(() => {
      setChecked((c) => ({ ...c, [p.regulationId]: p.total }));
      setRunning(null);
    }, 1400);
  };
  return (
    <DataTable<Plot>
      ariaLabel="Coverage by regulation"
      data={plots}
      getRowId={(p) => p.regulationId}
      initialSort={[{ id: "gaps", desc: true }]}
      columns={[
        { id: "c", header: "Citation", width: "190px", sortValue: (p) => p.citation, cell: (p) => <span className="t-data">{p.citation}</span> },
        { id: "t", header: "Regulation", sortValue: (p) => p.title, cell: (p) => <span className="text-[14px]">{p.title}</span> },
        { id: "bar", header: "Four counts", width: "200px", hideOnMobile: true, cell: (p) => <MiniBar counts={p.counts} width={170} /> },
        { id: "cov", header: "Covered", width: "90px", align: "right", sortValue: (p) => p.counts.covered, cell: (p) => <span className="t-data">{p.counts.covered}</span> },
        { id: "gaps", header: "Nothing · gap", width: "120px", align: "right", sortValue: (p) => p.counts.nothing_behind * 10 + p.counts.known_gap, cell: (p) => <span className="t-data">{p.counts.nothing_behind} · {p.counts.known_gap}</span> },
        { id: "n", header: "Not yet", width: "90px", align: "right", hideOnMobile: true, sortValue: (p) => p.counts.not_yet_confirmed, cell: (p) => <span className="t-data">{p.counts.not_yet_confirmed}</span> },
        {
          id: "a",
          header: "",
          width: "220px",
          cell: (p) =>
            checked[p.regulationId] ? (
              <span className="flex items-center justify-end gap-2 text-[13px] text-ink2">
                <Mark kind="check" size={12} className="text-ok" /> Checked {checked[p.regulationId]} obligations · no change
              </span>
            ) : (
              <span className="flex justify-end">
                <Button size={32} variant="quiet" loading={running === p.regulationId} onClick={() => check(p)}>
                  {running === p.regulationId ? "Checking" : "Check coverage"}
                </Button>
              </span>
            ),
        },
      ]}
      stickyTop={64}
    />
  );
}

