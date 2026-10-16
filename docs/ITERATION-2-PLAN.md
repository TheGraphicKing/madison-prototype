# Iteration 2: plan

Inputs: `prompt-pack/iteration-2/` (20 to 26, `data/`, `palettes_v2.json`, `palette_preview_v2.html`). These override the iteration-1 prompts wherever they conflict. Before screenshots: `docs/iteration-2/before/`.

The register numbers F01 to F36 skip **F05**: there is no F05 in `20_feedback_register.md`, so 35 items are tracked.

## 1. Mapping: every feedback item to files and approach

| # | Screens | Components and files | How |
|---|---|---|---|
| F01 | All, gallery, Color popover | `src/theme/palettes_v2.json`, `scripts/gen-palettes.mjs`, `src/theme/palettes.css`, `src/theme/palettes.ts`, `components/shell/color-button.tsx`, `app/layout.tsx` (no-flash script), `scripts/contrast.mjs` (new script, not a module) | Three palettes × light/dark as `html[data-palette][data-mode]` blocks; popover with three rows plus a Light/Dark segmented control; `localStorage` for both; `prefers-color-scheme` only on first visit; a contrast script checks every text pair in all six themes |
| F06 | Every screen, Ask, toasts, reports, routes | `app/obligations/**` (renamed from `app/duties/**`), `app/duties/**` (redirect pages), every component with visible text, `lib/results.ts`, `data/index.ts` labels | Rename all visible "duty/duties" to "obligation(s)"; `/duties` and `/duties/[id]` become static redirect pages to `/obligations…`; data ids and field names stay; a rendered-text scan (`scripts/scan-text.mjs`) fails on any "duty" |
| F24 | Every screen | run view, inspector, record, change room, tasks | Remove agent ids, model names, cost, token counts and internal stage names from default views; agent names only inside a quiet "Show how Madison did this" disclosure (`data-how` attribute so the scan can skip it) |
| F25 | Every screen | `scripts/click-crawl.mjs` (new script) | Every number, name, id, chip and row is a link or button to its target; the crawl clicks everything and lists dead clicks, errors and empty pages until the list is empty |
| F28 | Every screen, gallery | `app/globals.css` (radius tokens), `core/panel.tsx`, `core/button.tsx`, `core/tabs.tsx`, `core/overlays.tsx`, `core/status.tsx`, `core/data-table.tsx`; delete `core/bracket.tsx` | Radii 14/12/10/pill; softer borders and background steps; soft resting shadow; floating shadow for rail, popovers, drawers; `Bracket` deleted with every use |
| F29 | Rule changes, Obligations, My tasks, Reports | `components/ui/animated-list.tsx` usage, `core/labels.tsx` Count, reports tilt | No decorative motion on working screens: remove tilt on report covers, the animated feed, entrance motion; keep row expand, drawers and toasts |
| F31 | Change room, run view, My tasks | `components/decision/decision-panel.tsx` (shared), task drawer | Every person checkpoint uses the one Decision panel: what, why, evidence, options with "what happens next", who is next, the button |
| F32 | All | see the subtraction list | Make every removal listed in §2 |
| F35 | Rail, task rows, section markers, gallery | `src/components/glyphs/` (7 navigation + 8 task types + status marks), gallery | Custom SVG glyphs, 20×20, 1.5 stroke, round caps, `currentColor`, from squares, rings and lines; no icon library in `package.json` |
| F23 | Rail | `components/shell/rail.tsx`, `app-shell.tsx` | Floating rail: 240 expanded, 68 collapsed floating panel inset 12, glyphs only, tooltip after 300 ms, hover for 600 ms expands as overlay, chevron toggle plus `[`, state remembered; "Also in Madison" (greyed); never initials |
| F30 | Run view | `components/run/run-view.tsx` | A quiet note on every run view: "Replay of a recorded run. Live runs take several minutes." |
| F36 | Coverage, change room, reports | `data/consequences.json`, consequence panel | Consequence words, exam risk as a word, "Illustrative only (synthetic)" exposure line; no dollar penalty anywhere (the $100,000 wire threshold is a rule term, not a penalty) |
| F02 | Today | `components/today/today.tsx`; `canvas/strip.tsx` RunCard deleted | Remove the hero card |
| F03 | Today | `today.tsx`, `core/charts.tsx` Sparkline | Four counts, each with "+17 this month" from `position.history`, a 12-point 40 px sparkline, and "Explore coverage" |
| F04 | Today | `today.tsx`, glyphs, task drawer | Header, three summary tiles, Needs you (glyph, title, why, from, due, one action), Waiting on others (Nudge), Where Northgate stands, What changed this week (Applies chips), Madison overnight summary line that expands |
| F07 | Run view | new `components/run/run-view.tsx`, `run/step-row.tsx`, `run/step-detail.tsx`; delete `canvas/schematic.tsx`, `columns.tsx`, `layout.ts`, `depth.tsx`, `lineage.ts` | Two regions: the vertical 8-step flow (left 60%) and the detail or Decision panel (right 40%); plain step words from `23_run_view_v2.md`; inline visuals per step |
| F08 | Run view | `run-view.tsx` | No agents column; "Show how Madison did this" reveals plain agent names per step |
| F09 | Run view, change room | `run-view.tsx`, `lib/player/*` | After deciding, the flow stays on the page finished; Replay replays; "How Madison got here" reopens it |
| F10 | Change room, run view, My tasks | `decision/decision-panel.tsx` | One `DecisionPanel` used in all three places |
| F11 | Change room before run | `change/change-room.tsx` | "What we know": summary, diff, effective date, likely processes (from process tags), last read; one action; a quiet "Not read yet" step track; no empty cards |
| F12 | Change room after run | `change/battle-cards.tsx` | Applies, Obligations, Linked, Covered, What's left, Close cards per `25_screens_v2.md` |
| F13 | Change room, RC-2026-018 | `change-room.tsx` | Only the Applies card with verdict, sentence, bank fact, certainty, who confirmed, "Reopen if this changes" |
| F14 | Change room, run view | battle cards, step rows | Each card has "See how" (opens the run at its step via `?step=`); each step has "See the result" (back to `/rules/[id]/#card-<step>`) |
| F33 | Run view | `lib/run-steps.ts` (step titles and result lines per run) | Rule run, coverage check and control design all use the same run view |
| F15 | Coverage | `coverage/field3d.tsx` (rewritten) | Perspective camera fov 35, drei `CameraControls` with damping and polar limits 20 to 70 degrees, rounded instanced blocks per state, heights by urgency, rounded plot slabs, three-point light, `Lightformer` environment, `ContactShadows`, `N8AO` (`@react-three/postprocessing`), rise-in on load, fly to plot with `fitToBox` |
| F16 | Coverage | `coverage/plot-panel.tsx` | Counts, what covers them (policies and controls with counts), what isn't covered (reason, owner), accepted gaps, consequences, next-step buttons |
| F17 | Coverage, change room, obligation page | `coverage/consequence.tsx` | Consequence panel from `consequences.json` for the 5 seeded obligations; a default built from state for the rest |
| F18 | Obligations | `obligations/register.tsx` | One 56 px row: search, 4 chips with checkbox popovers, saved views, count |
| F19 | Obligation page | `obligations/obligation-page.tsx`, `obligations/lineage-3d.tsx` | Tabs "What stands behind it" (3D stack with 2D toggle), "History", "Open items"; no React Flow |
| F20 | My tasks, Today | `tasks/tasks.tsx`, `data/tasks.json` (v2), `lib/tasks.ts` | 20 tasks across 9 people; glyph, title, from, why, due, state chip, one action; groups Overdue, Today, This week, Later; filters Mine, Waiting on others, Blocked, Done |
| F21 | Reports | `reports/reports.tsx`, `data/reports_v2.json` | List cards with conclusions and status; board pack with 8-section navigator, conclusions, How this was built, approval, comments, "Add to this report" (pending until the approver accepts, then written to the record); exam pack areas open proof items or the reason |
| F22 | The record | `record/record.tsx`, `record/chain-3d.tsx`, `data/record_v2.json` | Chain (3D blocks on a curve, person cube and agent tile, `prev` links, Signed on hover, run clusters, scroll moves along time, click opens the entry) and List with filters |
| F26 | Today, My tasks, change room, record | `lib/store.ts` (handoffs), `lib/handoffs.ts`, task drawer | Handoff state in the store; receiver's task appears; sender's "Waiting on …" on Today and the change room; record entries |
| F27 | Task drawer | `tasks/task-drawer.tsx`, `tasks/response-form.tsx` | "What you've been given" (quotes highlighted, drafts, records linked) and "What you need to provide" (text, date, file, choice, table) |
| F34 | Header | `components/shell/persona-switch.tsx`, `data/index.ts` | Seven personas |

## 2. Subtraction list (each removal made; ticked in progress)

| Remove | Why |
|---|---|
| The six iteration-1 palettes and their switcher rows | Replaced by three palettes × light/dark (F01) |
| `core/bracket.tsx` and every corner bracket | F28: no brackets |
| The slash-prefixed mono label above every block (`MonoLabel` "slash" variant) | Section titles are sentence-case sans; mono only for headers, ids, citations and tiny metadata |
| `[ LIVE ]` / `[ REPLAY ]` bracketed mode labels | Brackets are gone; a soft "Live" / "Replay" chip remains |
| Today's hero `RunCard` and the 12-month step chart | F02, F03 |
| Today's animated "Madison overnight" feed | One summary line that expands (motion policy) |
| Run view: agents column, outputs column, phase strip, metrics strip, depth toggle, write-back arc, the TextQL schematic, the done panel, cost and elapsed | F07, F08, F24; `23_run_view_v2.md` §6 |
| `canvas/schematic.tsx`, `canvas/columns.tsx`, `canvas/layout.ts`, `canvas/depth.tsx`, `canvas/lineage.ts`, `canvas/parts.tsx`, `canvas/inspector.tsx`, `core/packet.tsx` | Replaced by the two-region run view; no new module, the run view lives where the canvas lived |
| Inspector: agent version, model, prompt and cost rows | F24 |
| `data/agent_meta.json` (model and prompt versions) | Nothing may show models any more |
| The change room's empty "Not yet" sections before a run | F11 |
| The change room's task panel duplicating the What's left drift quotes | F32: the same drift shown twice |
| "Who has this" duplicated in header and aside | F32: one place, at the top |
| The duty room's React Flow graph (and `@xyflow/react`) | F19: replaced by the 3D lineage stack with a 2D chain; React Flow was the glitch |
| Obligations: four stacked rows of filter chips | F18 |
| Reports: tilted covers (`motion-primitives/tilt`) and the separate cover-only index | F29; the list now carries conclusions and status |
| Record: the tracing-beam timeline as the only view | F22: Chain plus List |
| The "Design system" link in the rail | The rail holds the 7 destinations and "Also in Madison"; the gallery stays at `/gallery` |
| `components/ui/animated-list.tsx`, `motion-primitives/text-scramble.tsx`, `motion-primitives/border-trail.tsx`, `motion-primitives/spotlight.tsx`, `motion-primitives/tilt.tsx` | Their only uses are removed by the items above |

## 3. Order of work and acceptance checks

| Phase | Scope | Acceptance (from the register) |
|---|---|---|
| A Foundation v2 | F01, F06, F23, F28, F35; mono-label reduction | Popover shows 3 palettes and Light/Dark; contrast script passes all six themes; rendered text has no "duty"; collapsed rail shows 7 glyphs with names on hover; `Bracket` unused; glyphs in `src/components/glyphs/`; no icon library |
| B Data, tasks, handoffs | F20, F26, F27, F34 | 20 tasks per persona; drawer shows What you've been given / What you need to provide for every handoff; 7 personas |
| C Run view v2 | F07 to F10, F14, F30, F33 | At most 2 regions; no agents column by default; flow stays after deciding; one DecisionPanel; two-way links; disclaimer on every run view; all three runs |
| D Change room | F11 to F14 | Before-run state useful; battle cards per spec; RC-2026-018 shows only Applies; two-way links |
| E Today, Rule changes | F02 to F04 | No flow diagram on Today; counts with deltas and small labelled sparklines; Today matches its intent; Applies column |
| F Coverage 3D v2 | F15 to F17, F36 | Reads as 3D; 60 fps; detail panel for every plot; consequence panel for 5 seeded, default for others; no dollar penalties |
| G Obligations | F18, F19 | Filters ≤ 56 px; obligation page with working tabs and no glitches |
| H Tasks, Reports, Record | F20 to F22 | Tasks per persona; board pack with 8 sections, conclusions, How built, Add flow; record Chain plus List |
| I Subtract, polish, ship | F24, F25, F29, F31, F32 | Intent check per screen; click-crawl finds 0 dead clicks; no decorative motion on working screens; every checkpoint uses the DecisionPanel; subtraction list done; both demo loops; deploy |

Each phase ends with: `npm run build`, `npm test`, screenshots at 1440 and 390 in Graphite light, Graphite dark and Harbor light into `docs/iteration-2/phase-<x>/`, the forbidden search (`npm run check` plus `scripts/scan-text.mjs` on rendered text: "duty", agent ids, cost, dollar penalties), progress ticks with evidence, and a commit `iteration 2 · phase <x>: <what>`.

## 4. Decisions where the iteration-2 data conflicts with itself

- **Handoffs a demo action creates are dormant until that action.** The loop in `24 §5` says choosing "Link and raise the drift" makes "Waiting on Grace Liu" appear, but `handoffs.json` seeds H-118 as open and `record_v2.json` has "Raised drift to Grace Liu" on 15 Oct. To keep the loop causal, H-118 (and T-295, and record entry E-0006) appear when Elena makes that choice. Likewise the Reg E run creates H-113 (T-292), T-290 and T-283, and unblocks T-284; record entries with `run_id: run-rule-1005` (E-0014 to E-0024) are written when that run is played, stamped with the demo time. All other handoffs and tasks are live from the seed exactly as in the data (H-117 and T-299 for Priya, H-116 and T-297 blocked for Anthony, H-115 and T-291 overdue for Margaret, H-114 and T-294 for Grace).
- **The MFA run is a recording paused at "Owner answers".** The record shows Madison drafted CTL-153 and asked Priya on 15 Oct. The run view for `run-design-mfa` therefore shows the recorded steps and waits at the owner checkpoint. Answering H-117 (in Priya's task drawer or in the run view's Decision panel: it is the same action) moves it on to the CCO; approving H-116 finishes it and puts CTL-153 in force. Elena's open T-298 becomes "Confirm the fix Madison drafted", a Decision panel that records her choice.
- **"Today" in the data is 16 Oct 2026** and the clock in demo entries is the visitor's wall time on that date, as in iteration 1.
- **Penalties:** the consequence file's exposure lines are words only; nothing computes a figure.

## 5. Risks and fallbacks

- **3D performance (Coverage, lineage, record chain):** one instanced mesh per state colour; shadows from one key light with a modest map; N8AO at half resolution; frameloop "demand" when idle after the drift stops. If WebGL is missing, Coverage falls back to Map, the lineage to its 2D chain, and the record to List.
- **postprocessing on older GPUs:** N8AO is wrapped so a failure leaves the scene without AO rather than blank.
- **Store migration:** the persisted session key moves from `madison-demo` to `madison-demo-v2`, so iteration-1 sessions cannot break the new shape; Reset demo restores seed data.
- **Static export redirects:** `/duties` and `/duties/[id]` are generated pages that redirect on the client (and with a meta refresh), because static export has no server redirects.
- **Removing React Flow:** the obligation page's 2D chain is plain HTML and SVG.
