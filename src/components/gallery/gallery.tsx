"use client";

import { useState } from "react";
import { PALETTES, type PaletteId } from "@/theme/palettes";
import { useStore } from "@/lib/store";
import { applyPalette } from "@/components/shell/color-button";
import { Page, Section } from "@/components/layout/page";
import { Bracket, Port } from "@/components/core/bracket";
import { Mark, Square, Dot, type MarkKind } from "@/components/core/mark";
import { LoopPacket } from "@/components/core/packet";
import { Count, MetaList, MonoLabel } from "@/components/core/labels";
import { CertaintyWord, FOUR_STATES, StatusChip } from "@/components/core/status";
import { AgentTag, PersonTag } from "@/components/core/tags";
import { Button } from "@/components/core/button";
import { DataTable, type Col } from "@/components/core/data-table";
import { Panel, SectionHead } from "@/components/core/panel";
import { Dialog, SlideOver } from "@/components/core/overlays";
import { Segmented, Tabs } from "@/components/core/tabs";
import { Typed } from "@/components/core/typed";
import { Sparkline, StepChart } from "@/components/core/charts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { duties, position } from "@/data";
import { certaintyFrom } from "@/components/core/status";
import { monthShort } from "@/lib/dates";
import type { Duty } from "@/data/types";
import { Panel as P } from "@/components/core/panel";

const TOKENS: { group: string; keys: string[] }[] = [
  { group: "Surfaces", keys: ["ground", "surface", "surface2", "surface3", "line", "lineStrong"] },
  { group: "Ink", keys: ["ink", "ink2", "ink3"] },
  { group: "Action", keys: ["accent", "accentInk", "accentSoft", "focus"] },
  { group: "State", keys: ["ok", "okSoft", "warn", "warnSoft", "risk", "riskSoft", "info", "infoSoft"] },
  { group: "Agents and people", keys: ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5", "agent-6", "person"] },
  { group: "Live", keys: ["highlight", "highlightInk"] },
];

const TYPE = [
  { cls: "t-display", name: "Display", spec: "Satoshi 40/44 · 500 · -0.02em", sample: "Good morning, Elena" },
  { cls: "t-page", name: "Page title", spec: "28/34 · 500", sample: "Provisional credit for card and ACH disputes" },
  { cls: "t-section", name: "Section title", spec: "18/26 · 500", sample: "Where Northgate stands" },
  { cls: "t-body", name: "Body", spec: "15/24 · 400", sample: "Provisional credit for card and ACH error claims moves from 10 business days to 5 business days." },
  { cls: "t-small", name: "Small", spec: "13/20", sample: "Northgate offers consumer EFT and debit cards." },
  { cls: "t-label", name: "Mono label", spec: "JetBrains Mono 10.5/14 · 500 · caps · 0.14em", sample: "/ 8 proposed · 9 of 14 sections" },
  { cls: "t-data", name: "Mono data", spec: "JetBrains Mono 12.5/18 · tabular", sample: "12 CFR 1005.11(c)(2)  D-1005-E2  $1.07" },
  { cls: "t-count", name: "Big count", spec: "Satoshi 44/44 · 400 · -0.03em", sample: "1,721" },
];

const MARKS: MarkKind[] = ["chevron-down", "chevron-up", "chevron-right", "chevron-left", "check", "cross", "close", "plus", "minus", "arrow-right"];

const tableCols: Col<Duty>[] = [
  { id: "id", header: "Duty", cell: (d) => <span className="t-data text-ink2">{d.id}</span>, sortValue: (d) => d.id, width: "130px" },
  { id: "plain", header: "What it asks", cell: (d) => <span className="t-small text-ink">{d.plain}</span>, sortValue: (d) => d.plain },
  { id: "certainty", header: "Certainty", cell: (d) => <CertaintyWord value={certaintyFrom(d.confidence)} quiet />, width: "120px", hideOnMobile: true },
  { id: "state", header: "Coverage", cell: (d) => <StatusChip state={d.coverage_state} />, sortValue: (d) => d.coverage_state, width: "190px" },
];

export function Gallery() {
  const palette = useStore((s) => s.palette);
  const setPalette = useStore((s) => s.setPalette);
  const [seg, setSeg] = useState<"field" | "map" | "rules">("field");
  const [tab, setTab] = useState<"one" | "two" | "three">("one");
  const [slide, setSlide] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [typedKey, setTypedKey] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pos = position();
  const pick = (id: PaletteId) => {
    setPalette(id);
    applyPalette(id);
  };

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <MonoLabel>Madison design system · tokens · type · marks · components</MonoLabel>
          <h1 className="t-display">Design system</h1>
          <p className="max-w-[60ch] text-ink2">
            Calm surfaces, hairlines, squares and dots. Colour carries meaning only. The highlight is for whatever is live, new or just
            decided. Pick a palette to see every token change.
          </p>
        </div>
        <Segmented<PaletteId>
          label="Palette"
          value={palette}
          onChange={pick}
          options={PALETTES.map((p) => ({ value: p.id, label: p.name }))}
        />
      </header>

      <Section>
        <SectionHead title="Tokens" subtitle={`${PALETTES.find((p) => p.id === palette)?.name} · ${PALETTES.find((p) => p.id === palette)?.mode}`} />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {TOKENS.map((g) => (
            <div key={g.group} className="bg-surface p-5">
              <MonoLabel variant="plain">{g.group}</MonoLabel>
              <div className="mt-4 flex flex-col gap-2.5">
                {g.keys.map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="block h-6 w-10 shrink-0 rounded-[2px] shadow-[inset_0_0_0_1px_var(--line)]" style={{ background: `var(--${k})` }} />
                    <span className="t-data text-ink2">--{k}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead title="Type" subtitle="Satoshi for text · JetBrains Mono for labels and data" />
        <div className="flex flex-col border-t border-line">
          {TYPE.map((t) => (
            <div key={t.cls} className="grid grid-cols-1 gap-2 border-b border-line py-5 md:grid-cols-[220px_1fr] md:gap-8">
              <div className="flex flex-col gap-1">
                <span className="t-small text-ink">{t.name}</span>
                <span className="t-label">{t.spec}</span>
              </div>
              <div className={t.cls}>{t.sample}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <MonoLabel variant="plain">Section or node subtitle</MonoLabel>
            <MonoLabel>Read in place</MonoLabel>
          </div>
          <div className="flex flex-col gap-2">
            <MonoLabel variant="plain">Real metadata list</MonoLabel>
            <MetaList items={["5 agents", "14 queries", "every step logged"]} />
          </div>
          <div className="flex flex-col gap-2">
            <MonoLabel variant="plain">Global mode, once per page</MonoLabel>
            <MonoLabel variant="mode" tone="ink">
              Live
            </MonoLabel>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHead title="Marks" subtitle="No icons. Squares, dots, rings, hairlines, brackets and strokes" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Strokes" subtitle="Mark · 14 px · 1.25 stroke">
            <div className="flex flex-wrap gap-6">
              {MARKS.map((m) => (
                <div key={m} className="flex w-[84px] flex-col items-center gap-2">
                  <span className="flex size-10 items-center justify-center rounded-[2px] bg-surface2">
                    <Mark kind={m} />
                  </span>
                  <span className="t-label text-center text-[9px]">{m}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Squares, dots, ports" subtitle="Filled · hollow · 4 to 10 px">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3">
                <Square size={4} /> <Square size={5} /> <Square size={6} /> <Square size={10} />
              </div>
              <div className="flex items-center gap-3">
                <Square size={6} filled={false} /> <Square size={10} filled={false} />
              </div>
              <div className="flex items-center gap-3">
                <Dot /> <Dot size={6} color="var(--ink3)" />
                <span className="inline-block size-3 rounded-full shadow-[inset_0_0_0_1.25px_var(--ink)]" />
              </div>
              <div className="flex items-center gap-2 t-small text-ink2">
                <span className="caret" /> caret
              </div>
              <div className="relative h-10 w-28 bg-surface2">
                <Port side="left" filled={false} />
                <Port side="right" />
                <span className="t-label absolute inset-0 flex items-center justify-center">ports</span>
              </div>
            </div>
          </Panel>
        </div>
      </Section>

      <Section>
        <SectionHead title="Schematic" subtitle="Bracket · port · packet · connector" />
        <div className="rounded-[4px] border border-line bg-ground p-8">
          <svg viewBox="0 0 900 150" className="block w-full" aria-label="Two nodes joined by a connector carrying packets">
            <path id="gal-edge" d="M232 75 C 330 75, 340 40, 452 40 S 560 75, 668 75" fill="none" stroke="var(--line)" />
            <path d="M232 75 C 330 75, 340 40, 452 40 S 560 75, 668 75" fill="none" stroke="var(--lineStrong)" strokeDasharray="1 0" />
            <LoopPacket d="M232 75 C 330 75, 340 40, 452 40 S 560 75, 668 75" duration={1.6} />
            <LoopPacket d="M232 75 C 330 75, 340 40, 452 40 S 560 75, 668 75" duration={1.6} delay={0.55} color="var(--agent-5)" />
            <LoopPacket d="M232 75 C 330 75, 340 40, 452 40 S 560 75, 668 75" duration={1.6} delay={1.1} color="var(--highlight)" />
          </svg>
          <div className="pointer-events-none relative -mt-[150px] flex h-[150px] items-center justify-between px-[2%]">
            {[
              { t: "Find the duties", s: "8 proposed · 9 of 14 sections", st: "running" },
              { t: "Check every duty", s: "waiting", st: "waiting" },
            ].map((n) => (
              <Bracket key={n.t} className="w-[210px] bg-surface px-4 py-3.5" color={n.st === "running" ? "var(--ink)" : "var(--lineStrong)"}>
                <Port side={n.t.startsWith("Find") ? "right" : "left"} filled={n.st === "running"} />
                <div className="flex items-center gap-2">
                  <Square size={6} filled={n.st === "running"} color={n.st === "running" ? "var(--agent-3)" : "var(--ink3)"} />
                  <span className="text-[14px] font-medium">{n.t}</span>
                </div>
                <MonoLabel className="mt-1.5 block">{n.s}</MonoLabel>
              </Bracket>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHead title="Counts and status" subtitle="Four counts that always add up · never a percentage" />
        <div className="grid grid-cols-2 border-y border-line md:grid-cols-4">
          {FOUR_STATES.map((s, i) => (
            <div key={s} className={i ? "border-l border-line py-6 pl-6 max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(3)]:pl-0" : "py-6"}>
              <Count value={pos[s as keyof typeof pos] as number} state={s} />
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          {(["covered", "not_yet_confirmed", "nothing_behind", "known_gap", "out_of_scope", "proposed"] as const).map((s) => (
            <StatusChip key={s} state={s} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-8">
          <CertaintyWord value="Clear" />
          <CertaintyWord value="Likely" />
          <CertaintyWord value="Unsure" />
        </div>
        <div className="mt-6 flex flex-wrap gap-8">
          <AgentTag id="RC-03" />
          <AgentTag id="RC-04" />
          <AgentTag id="QC-01" />
          <PersonTag id="u-elena" />
          <PersonTag id="u-anthony" showRole />
        </div>
      </Section>

      <Section>
        <SectionHead title="Buttons" subtitle="Primary once per view · quiet · text · 32 and 40 · press scales to 0.98" />
        <div className="flex flex-col gap-5">
          {([40, 32] as const).map((sz) => (
            <div key={sz} className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size={sz}>
                Accept 6 duties
              </Button>
              <Button variant="quiet" size={sz}>
                Review one by one
              </Button>
              <Button variant="highlight" size={sz}>
                Continue as Priya Raman
              </Button>
              <Button variant="text" size={sz}>
                Open the record
              </Button>
              <Button variant="primary" size={sz} loading>
                Running
              </Button>
              <Button variant="quiet" size={sz} disabled>
                Disabled
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead title="Controls" subtitle="Tabs · segmented · popover · tooltip · slide-over · dialog" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Tabs and segmented">
            <Tabs
              label="Example tabs"
              value={tab}
              onChange={setTab}
              options={[
                { value: "one", label: "Applies" },
                { value: "two", label: "Duties", count: 6 },
                { value: "three", label: "Linked" },
              ]}
            />
            <div className="mt-6">
              <Segmented
                label="Coverage view"
                value={seg}
                onChange={setSeg}
                options={[
                  { value: "field", label: "Field" },
                  { value: "map", label: "Map" },
                  { value: "rules", label: "By rule" },
                ]}
              />
            </div>
            <div className="mt-6">
              <Segmented
                label="Speed"
                mono
                size={28}
                value={"1"}
                onChange={() => {}}
                options={[
                  { value: "0.5", label: "0.5×" },
                  { value: "1", label: "1×" },
                  { value: "2", label: "2×" },
                  { value: "4", label: "4×" },
                ]}
              />
            </div>
          </Panel>
          <Panel title="Overlays">
            <div className="flex flex-wrap items-center gap-4">
              <Popover>
                <PopoverTrigger className="h-8 rounded-[2px] px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--lineStrong)] hover:bg-surface2">
                  Open popover
                </PopoverTrigger>
                <PopoverContent>
                  <div className="p-2">
                    <MonoLabel>Bank fact</MonoLabel>
                    <p className="mt-1 text-ink2">consumer_eft = yes, debit_cards = yes</p>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="t-data h-8 rounded-[2px] px-3 shadow-[inset_0_0_0_1px_var(--lineStrong)]">D-1005-E2</TooltipTrigger>
                  <TooltipContent>Provisional credit within 5 business days</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size={32} onClick={() => setSlide(true)}>
                Open slide-over
              </Button>
              <Button size={32} onClick={() => setDialog(true)}>
                Open dialog
              </Button>
            </div>
          </Panel>
        </div>
        <SlideOver open={slide} onOpenChange={setSlide} title="What it touches" subtitle="12 CFR 1005.11(c)">
          <p className="text-ink2">Slide-over content sits on --surface with a hairline edge and one soft shadow.</p>
        </SlideOver>
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Exclude 1 duty?"
          footer={
            <>
              <Button size={32} onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button size={32} variant="primary" onClick={() => setDialog(false)}>
                Exclude 1 duty
              </Button>
            </>
          }
        >
          Prepaid accounts are outside Northgate&apos;s scope.
        </Dialog>
      </Section>

      <Section>
        <SectionHead title="Typed output and charts" subtitle="Typed · sparkline · step chart" actions={<Button variant="text" size={32} onClick={() => setTypedKey((k) => k + 1)}>Type again</Button>} />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-3">
            {[
              { l: "Applies to Northgate", v: "Yes · consumer EFT and debit cards" },
              { l: "Drift found", v: "POL-DISP-01 4.2 vs PRC-DISP-06 step 4" },
            ].map((o, i) => (
              <Bracket key={o.l + typedKey} className="bg-surface px-4 py-3">
                <MonoLabel>{o.l}</MonoLabel>
                <div className="mt-1 text-[15px] leading-6">
                  <Typed text={o.v} delay={i * 600} caret="while" />
                </div>
              </Bracket>
            ))}
            <div className="flex items-center gap-4 rounded-[4px] border border-line bg-surface px-4 py-3">
              <MonoLabel variant="plain">Cost</MonoLabel>
              <Sparkline values={[0, 0.04, 0.04, 0.31, 0.52, 0.88, 1.07]} step />
              <span className="t-data">$1.07</span>
            </div>
          </div>
          <P title="Covered duties" subtitle="12 months · newest in the highlight">
            <StepChart
              ariaLabel="Covered duties over 12 months"
              points={pos.history.map((h) => ({ x: monthShort(h.month), y: h.covered }))}
              yMin={1350}
              formatY={(v) => v.toLocaleString("en-US")}
              xLabels
            />
          </P>
        </div>
      </Section>

      <Section>
        <SectionHead title="Data table" subtitle="TanStack · hairline rows · sortable · arrow keys · Enter expands" />
        <DataTable<Duty>
          ariaLabel="Example duties"
          data={duties.slice(0, 7)}
          columns={tableCols}
          getRowId={(d) => d.id}
          expandedId={expanded}
          onRowClick={(d) => setExpanded((e) => (e === d.id ? null : d.id))}
          renderExpanded={(d) => (
            <div className="px-4 py-4">
              <MonoLabel>The rule&apos;s words</MonoLabel>
              <p className="mt-1 max-w-[70ch] text-ink2">&ldquo;{d.source_text}&rdquo;</p>
            </div>
          )}
        />
      </Section>
    </Page>
  );
}
