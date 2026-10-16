"use client";

import { useState } from "react";
import { PALETTES, type Mode, type PaletteId } from "@/theme/palettes";
import { useStore } from "@/lib/store";
import { applyTheme } from "@/components/shell/color-button";
import { Page, Section } from "@/components/layout/page";
import { Mark, Square, type MarkKind } from "@/components/core/mark";
import { Count, MonoLabel } from "@/components/core/labels";
import { CertaintyWord, certaintyFrom, FOUR_STATES, StatusChip } from "@/components/core/status";
import { PersonTag } from "@/components/core/tags";
import { Button } from "@/components/core/button";
import { DataTable, type Col } from "@/components/core/data-table";
import { Panel, SectionHead } from "@/components/core/panel";
import { Dialog, SlideOver } from "@/components/core/overlays";
import { Segmented, Tabs } from "@/components/core/tabs";
import { Typed } from "@/components/core/typed";
import { Sparkline } from "@/components/core/charts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { duties, position } from "@/data";
import type { Duty } from "@/data/types";
import { NAV_GLYPHS, TASK_GLYPHS, TASK_KIND_LABEL, type TaskKind } from "@/components/glyphs";
import { NAV_ITEMS } from "@/components/shell/crumbs";

const TOKENS: { group: string; keys: string[] }[] = [
  { group: "Surfaces", keys: ["ground", "surface", "surface2", "surface3", "line", "lineStrong"] },
  { group: "Ink", keys: ["ink", "ink2", "ink3"] },
  { group: "Action", keys: ["accent", "accentInk", "accentSoft", "focus", "highlight", "highlightInk"] },
  { group: "State", keys: ["ok", "okSoft", "warn", "warnSoft", "risk", "riskSoft", "info", "infoSoft"] },
  { group: "Charts and 3D", keys: ["vizOk", "vizWarn", "vizRisk", "vizInfo", "vizMuted"] },
];

const TYPE = [
  { cls: "text-[36px] leading-[42px] font-medium tracking-[-0.02em]", name: "Display", spec: "36 / 42 · 500 · once, the Today greeting", sample: "Good morning, Elena" },
  { cls: "t-page", name: "Page title", spec: "28 / 34 · 500", sample: "Provisional credit for card and ACH disputes" },
  { cls: "t-section", name: "Section title", spec: "18 / 26 · 500, sentence case", sample: "Where Northgate stands" },
  { cls: "t-body", name: "Body", spec: "15 / 24", sample: "Provisional credit for card and ACH error claims moves from 10 business days to 5 business days." },
  { cls: "t-small", name: "Small", spec: "13 / 20", sample: "Northgate offers consumer electronic transfers and debit cards." },
  { cls: "text-[12.5px] leading-[18px] font-medium text-ink3", name: "Label", spec: "12.5 / 18 · 500 · sentence case", sample: "What you've been given" },
  { cls: "t-label", name: "Mono metadata", spec: "JetBrains Mono 10.5 · caps · table headers only", sample: "Citation · effective · owner" },
  { cls: "t-data", name: "Mono data", spec: "JetBrains Mono 12.5 · ids and citations", sample: "12 CFR 1005.11(c)(2)  D-1005-E2" },
];

const MARKS: MarkKind[] = ["chevron-down", "chevron-up", "chevron-right", "chevron-left", "check", "cross", "close", "plus", "minus"];

const tableCols: Col<Duty>[] = [
  { id: "plain", header: "Obligation", cell: (d) => <span className="t-small text-ink">{d.plain}</span>, sortValue: (d) => d.plain },
  { id: "id", header: "Citation", cell: (d) => <span className="t-data text-ink2">{d.citation}</span>, sortValue: (d) => d.citation, width: "200px", hideOnMobile: true },
  { id: "certainty", header: "Certainty", cell: (d) => <CertaintyWord value={certaintyFrom(d.confidence)} quiet />, width: "120px", hideOnMobile: true },
  { id: "state", header: "State", cell: (d) => <StatusChip state={d.coverage_state} size="sm" />, sortValue: (d) => d.coverage_state, width: "190px" },
];

export function Gallery() {
  const palette = useStore((s) => s.palette);
  const mode = useStore((s) => s.mode);
  const setPalette = useStore((s) => s.setPalette);
  const setMode = useStore((s) => s.setMode);
  const [seg, setSeg] = useState<"field" | "map" | "rules">("field");
  const [tab, setTab] = useState<"one" | "two" | "three">("one");
  const [slide, setSlide] = useState(false);
  const [dialog, setDialog] = useState(false);
  const pos = position();
  const pick = (p: PaletteId, m: Mode) => {
    setPalette(p);
    setMode(m);
    applyTheme(p, m);
  };

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="t-page">Design system</h1>
          <p className="max-w-[60ch] text-ink2">Three palettes, each light and dark. Soft surfaces, rounded shapes, Madison&apos;s own glyphs. Colour carries meaning, always with a word.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<PaletteId> label="Palette" value={palette} onChange={(p) => pick(p, mode)} options={PALETTES.map((p) => ({ value: p.id as PaletteId, label: p.name }))} />
          <Segmented<Mode> label="Light or dark" value={mode} onChange={(m) => pick(palette, m)} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        </div>
      </header>

      <Section>
        <SectionHead title="Colours" subtitle={`${PALETTES.find((p) => p.id === palette)?.name} · ${mode}`} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOKENS.map((g) => (
            <Panel key={g.group} title={g.group}>
              <div className="flex flex-col gap-2.5">
                {g.keys.map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="block h-6 w-10 shrink-0 rounded-[6px] shadow-[inset_0_0_0_1px_var(--line)]" style={{ background: `var(--${k})` }} />
                    <span className="t-data text-ink2">--{k}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
          <Panel title="Shape">
            <div className="flex flex-wrap items-end gap-4">
              {(
                [
                  ["Panel", 14, 64],
                  ["Card", 12, 52],
                  ["Control", 10, 40],
                ] as const
              ).map(([n, r, s]) => (
                <div key={n} className="flex flex-col items-center gap-2">
                  <span className="block bg-surface2 shadow-[inset_0_0_0_1px_var(--line)]" style={{ width: s, height: s, borderRadius: r }} />
                  <span className="text-[12px] text-ink3">
                    {n} {r}
                  </span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full bg-surface2 px-3 text-[12px]">Chip</span>
                <span className="text-[12px] text-ink3">Pill</span>
              </div>
            </div>
          </Panel>
        </div>
      </Section>

      <Section>
        <SectionHead title="Glyphs" subtitle="Drawn from squares, rings and lines · 20 × 20 · 1.5 stroke" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Navigation">
            <div className="flex flex-col">
              {NAV_ITEMS.map((n) => {
                const G = NAV_GLYPHS[n.match as keyof typeof NAV_GLYPHS];
                return (
                  <div key={n.href} className="flex items-center gap-5 border-b border-line py-2.5 last:border-b-0">
                    <G size={16} />
                    <G size={20} />
                    <G size={24} />
                    <span className="text-[14px]">{n.label}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Task types">
            <div className="flex flex-col">
              {(Object.keys(TASK_GLYPHS) as TaskKind[]).map((k) => {
                const G = TASK_GLYPHS[k];
                return (
                  <div key={k} className="flex items-center gap-5 border-b border-line py-2.5 last:border-b-0">
                    <G size={16} />
                    <G size={20} />
                    <G size={24} />
                    <span className="text-[14px]">{TASK_KIND_LABEL[k]}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Strokes and status marks">
            <div className="flex flex-wrap items-center gap-5">
              {MARKS.map((m) => (
                <span key={m} className="flex size-9 items-center justify-center rounded-[10px] bg-surface2" title={m}>
                  <Mark kind={m} />
                </span>
              ))}
              <Square size={6} className="rounded-[2px]" />
              <Square size={10} className="rounded-[3px]" filled={false} />
              <span className="inline-block size-2 rounded-full bg-ink" />
            </div>
          </Panel>
        </div>
      </Section>

      <Section>
        <SectionHead title="Type" subtitle="Satoshi for text · JetBrains Mono for ids, citations and table headers" />
        <div className="flex flex-col rounded-[14px] border border-line bg-surface px-6">
          {TYPE.map((t) => (
            <div key={t.name} className="grid grid-cols-1 gap-2 border-b border-line py-4 last:border-b-0 md:grid-cols-[220px_1fr] md:gap-8">
              <div className="flex flex-col gap-1">
                <span className="t-small text-ink">{t.name}</span>
                <span className="text-[12px] text-ink3">{t.spec}</span>
              </div>
              <div className={t.cls}>{t.sample}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead title="Counts and status" subtitle="Four counts that always add up · never a percentage" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {FOUR_STATES.map((s) => (
            <div key={s} className="rounded-[14px] border border-line bg-surface p-5">
              <Count value={pos[s as "covered"]} state={s} animate={false} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {(["covered", "not_yet_confirmed", "nothing_behind", "known_gap", "out_of_scope", "proposed"] as const).map((s) => (
            <StatusChip key={s} state={s} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-8">
          <CertaintyWord value="Clear" />
          <CertaintyWord value="Likely" />
          <CertaintyWord value="Unsure" />
          <PersonTag id="u-elena" />
          <PersonTag id="u-anthony" showRole />
        </div>
      </Section>

      <Section>
        <SectionHead title="Buttons" subtitle="One primary per view · quiet · text · 32 and 40" />
        <div className="flex flex-col gap-5">
          {([40, 32] as const).map((sz) => (
            <div key={sz} className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size={sz}>
                Accept 6 obligations
              </Button>
              <Button variant="quiet" size={sz}>
                Review one by one
              </Button>
              <Button variant="highlight" size={sz}>
                View as Priya Raman
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
        <SectionHead title="Controls" subtitle="Tabs · segmented · popover · tooltip · drawer · dialog" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Tabs and segmented">
            <Tabs
              label="Example tabs"
              value={tab}
              onChange={setTab}
              options={[
                { value: "one", label: "What stands behind it" },
                { value: "two", label: "History", count: 6 },
                { value: "three", label: "Open items" },
              ]}
            />
            <div className="mt-6">
              <Segmented label="Coverage view" value={seg} onChange={setSeg} options={[{ value: "field", label: "Field" }, { value: "map", label: "Map" }, { value: "rules", label: "By rule" }]} />
            </div>
          </Panel>
          <Panel title="Overlays">
            <div className="flex flex-wrap items-center gap-4">
              <Popover>
                <PopoverTrigger className="h-8 rounded-[10px] px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2">Open popover</PopoverTrigger>
                <PopoverContent>
                  <div className="p-2">
                    <MonoLabel>Bank fact</MonoLabel>
                    <p className="mt-1 text-ink2">Electronic transfers: yes. Debit cards: yes.</p>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="t-data h-8 rounded-[10px] px-3 shadow-[inset_0_0_0_1px_var(--line)]">D-1005-E2</TooltipTrigger>
                  <TooltipContent>Provisional credit within 5 business days</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size={32} onClick={() => setSlide(true)}>
                Open drawer
              </Button>
              <Button size={32} onClick={() => setDialog(true)}>
                Open dialog
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-4 rounded-[12px] bg-surface2 px-4 py-3">
              <span className="text-[13px] text-ink2">Covered, 12 months</span>
              <Sparkline values={pos.history.map((h) => h.covered)} width={100} height={28} />
              <Typed text="Found 8 obligations in 9 sections" className="text-[13px]" caret="while" />
            </div>
          </Panel>
        </div>
        <SlideOver open={slide} onOpenChange={setSlide} title="What it touches" subtitle="12 CFR 1005.11(c)">
          <p className="text-ink2">Drawers float from the right with the soft floating shadow.</p>
        </SlideOver>
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Exclude 1 obligation?"
          footer={
            <>
              <Button size={32} onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button size={32} variant="primary" onClick={() => setDialog(false)}>
                Exclude 1 obligation
              </Button>
            </>
          }
        >
          Prepaid accounts are outside Northgate&apos;s scope.
        </Dialog>
      </Section>

      <Section>
        <SectionHead title="Table" subtitle="Square inside a rounded panel · sortable · arrow keys" />
        <DataTable<Duty> ariaLabel="Example obligations" data={duties.slice(0, 6)} columns={tableCols} getRowId={(d) => d.id} />
      </Section>
    </Page>
  );
}
