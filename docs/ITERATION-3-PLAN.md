# Iteration 3 plan: demo-ready Madison

The source pack is `iteration-3/` (at the repo root; the README calls it `prompt-pack/iteration-3/`). It overrides iterations 1 and 2 wherever they conflict, including F37 and F38's separate run page: the run now plays **in place** on the change room's 3D change map.

The quality bar is the Coverage field. The change map is built from the same scene kit (`src/components/scene/`).

## 1. Requirements, files and approach

### J. Data and ownership

| # | Requirement | Files | How |
|---|---|---|---|
| J1 | Merge ownership, dates and scenarios, typed | `src/data/ownership.json`, `dates.json`, `scenario_matrix.json`, `demo_flows.json` (copied from the pack); `src/data/types.ts`; `src/data/index.ts` | New types (`BusinessLine`, `ProcessArea`, `ChangeDates`, `Scenario`, `DemoFlow`). Selectors: `datesFor`, `scenarioFor`, `processAreaFor`, `ownersOf(obligation)` |
| J2 | Every rule change seeded exactly at its stage | `lib/use-change.ts`, `data/rule_changes.json`, `lib/work.ts` | `stepsDone` reads `scenario_matrix.steps_done`. Handoffs that flows create stay dormant until the flow runs: H-117 and H-116 until the control-design run reaches the owner; H-118 until "Link and raise"; H-114 until D4 opens the flood rule; H-113 and the gap fixes until the Reg E run. Nothing is seeded as already open twice |
| J3 | Add Hannah Cole | `data/users.json`, `PERSONA_IDS`, persona switch | Eighth persona, Head of Retail Deposits. She owns the deposit disclosures (RC-2026-013 obligations) |
| J4 | One selector per count | `lib/counts.ts` (new); Today, rail badge, My tasks filters, Coverage totals | `useNeedsYou(persona)`, `useDueThisWeek`, `useWaitingOn` count, `useOpenTasks`, `coverageTotals()`; every surface reads these |
| J5 | No raw field names or ids in the UI | `lib/words.ts`, `scan-text.mjs` | `factWord("flood_zone_lending")` gives "Flood zone lending"; citations replace RC ids; the scan flags snake_case words and RC ids that are not secondary labels |
| J6 | "What changed this week" only for the last 7 days | `today/today.tsx` | Published within 7 days of 16 Oct, otherwise the section is titled "Open rule changes" |
| J7 | The same four dates everywhere | `components/core/dates4.tsx` (new) | `<FourDates>` shows Published, Effective, Northgate deadline and Days left (overdue in the risk colour); used in the change room header, the rule list and the Today rows. Obligations show the deadline words and compliance date; tasks show due and relative days; known gaps show expiry |
| J8 | A standard "Who owns this" block | `components/core/who-owns.tsx` (new) | Process area, business line, accountable owner and role; "Reviewed by Elena Petrova · Approved by Anthony Marsh"; policy and control owners when known. Used on the obligation page, change map side panel, plot panel and task drawer |

### K. The change map

| # | Requirement | Files | How |
|---|---|---|---|
| K1 | One living scene in the change room | `change/change-map.tsx` (new, scene kit), `change/change-room.tsx` (rewritten layout) | Header with the four dates and owner chip; map about 65% wide and at least 560 px tall; side panel about 35%; the four-answers strip below. No long scroll |
| K2 | Sources, six journey platforms on an arc, plot at the right end | `change-map.tsx` | Sources: eCFR, Federal Register, Bank profile, Policies, Controls, Vendors. Platforms: Applies, Obligations, Linked, Covered, What's left, Close. Each platform shows its state: done ones carry objects and a label, not-started ones are hollow outlines ("Not started"), the current one is lifted with the highlight tint, a blocked one carries a "Waiting on …" tag |
| K3 | The run plays in place | `change-map.tsx`, `lib/change-map.ts` (stage-to-platform mapping) | `useRunPlayer` drives the scene. Run stages map onto platforms (rule run: text, sections and scope go to Applies; duties to Obligations; checks to the gate; decide to the Obligations ring; coverage to Linked and Covered; touches to What's left). The coverage run works on Linked. The control-design run adds Suggest, Draft and Seven checks sub-platforms beside What's left |
| K4 | Pucks, arcs and packets, the gate, the person ring | `change-map.tsx`, `scene/blocks.tsx` (Puck) | Agents are labelled discs that glide to their platform and pulse gently while working; dotted trails; clicking one highlights what it touched. Arcs from sources carry packets during work. The gate sits between Obligations and Linked, and the held-back block drops beside it with its reason on hover. The person checkpoint is a raised ring where blocks queue |
| K5 | Side panel | `change/map-panel.tsx` (new) | "Your task now" Decision panel pinned when needed. Otherwise the selected platform's detail: what Madison read, what it found (the rule's words), certainty, who decided and when, owner, dates, and "How Madison did this" (replays that step) |
| K6 | Four answers strip | `change/answers-strip.tsx` (new) | Applies? · What it asks · Are we covered? · What's left (owner, due date) · next action |
| K7 | Blocks settle into this regulation's plot; Open in Coverage | `change-map.tsx`, `coverage/coverage.tsx` | The plot is drawn like the Coverage plot. "Open in Coverage" goes to `/coverage/?view=field&plot=<reg>`, which flies to it |
| K8 | All five states | seeded data | Not started (014), part done (016: 3 of 6; 011: 4 of 6), doesn't apply (018, only Applies), needs a fact (019), closed (009 and 012, with "Replay how Madison did this") |
| K9 | Camera | `scene/camera.tsx` | Default: frame the whole map. Running: "Follow the work" frames the active platform and its neighbours. "Overview" resets. Wheel scrolls the page; Ctrl or Cmd plus the wheel, a pinch, or +/- zooms |
| K10 | List view toggle; the run page leaves navigation | `change-room.tsx`, `app/runs/[id]` | "Map | List" in the header; List uses the existing Simple view inline. `/runs/*` redirects to the change room (`?replay=1`). Every link goes to the change room |

### L. Rule changes

| # | Requirement | Files | How |
|---|---|---|---|
| L1 | The "Where every change stands" strip | `rules/stage-strip.tsx` (new) | Seven columns; each change is a rounded tile coloured by days left; clicking opens its change map |
| L2 | The table collapsed by default | `rules/rules.tsx` | Columns: citation, what changed, Applies, owner (area and person), Northgate deadline with days left, stage. No auto-expanded row |
| L3 | Expanding a row shows before and after | `rules/rules.tsx` | Kept |

### M. Coverage and fixes (F39)

| # | Requirement | Files | How |
|---|---|---|---|
| M1 | Lens switch: State, Owner, Deadline (also on the Today mini field) | `coverage/field3d.tsx`, `lib/coverage-field.ts` | Owner from the process areas by regulation (a compliance default for regulations with no area), with a legend of names. Deadline shades by days left to the nearest open change's Northgate deadline |
| M2 | Every plot labelled by regulation, with no collisions | `field3d.tsx` | "12 CFR 1005 · Reg E" short by default and full on hover; a screen-space pass hides lower-priority labels that overlap |
| M3 | A specific plot panel | `coverage/plot-detail.tsx` | Top policies and controls with counts; each uncovered obligation (clickable); known gaps; consequences; "Open these obligations" (register filtered by regulation) and "Start a fix" |
| M4 | Wheel fix on every 3D view | `scene/camera.tsx`, `scene/zoom-buttons.tsx` | The wheel does nothing in the scene; Ctrl or Cmd plus the wheel dollies; +/- buttons |
| M5 | The record chain made readable | `record/chain-3d.tsx`, `record/record.tsx` | Always-visible cluster and date labels, a legend, who/what/when on hover, the latest entry selected by default, and "Replay this run" on a cluster (opens that change map and replays it) |
| M6 | Today | `today/today.tsx`, `tasks/tasks.tsx` | One primary action per row (the whole row opens the task); counts from J4; the mini field with the lens switch |
| M7 | The lineage drift label is never clipped | `obligations/lineage.tsx` | The label sits inside the frame, anchored to the stack |
| M8 | Toasts | `shell/toasts.tsx` | Top centre, inside the header band, above everything; never over a scene |
| M9 | Typing always completes | `core/typed.tsx` and its callers | Typing runs on the wall clock, not the run clock, so it finishes even when the run waits |
| M10 | The Live label stays until a run ends | change room header | "Live" while the instance is playing or waiting; "Replay" only for replays |

### N. Demo hub and guide

| # | Requirement | Files | How |
|---|---|---|---|
| N1 | "Demos" in the rail, shortcut D | `shell/rail.tsx`, `demo/demo-hub.tsx` (new), a glyph | Five cards: title, audience, starting person, minutes, story, "Start this demo" |
| N2 | Reset per flow | `lib/store.ts` (`resetScenario(changeIds)`) | Clears only that change's runs, decisions, handoffs, tasks, obligation states, facts and record entries |
| N3 | Coach card with spotlight and talk track | `demo/coach.tsx` (new), `lib/demo.ts` | Bottom centre, 360 px: step text, Back, Next and Exit. Next unlocks when the step's predicate is true (store or URL). A spotlight ring on `[data-demo]`; the talk track folded; at the end, "Demo complete", what changed, and "Start another demo". Optional throughout |
| N4 | `data-demo` targets | every element the steps point at | See §3 |

### O. Prove and ship

| # | Requirement | Files | How |
|---|---|---|---|
| O1 | Playwright D1 to D5, all passing | `e2e/demo-D1.spec.ts` … `demo-D5.spec.ts`, `playwright.config.ts` | `@playwright/test` against the static export (`out/`, served on :4321). Each test follows its flow's steps and asserts the end state |
| O2 | Screenshots in three themes | `docs/iteration-3/` | Every change map state and every flow's end, in Graphite light, Graphite dark and Harbor light |
| O3 | Side-by-side critique | `docs/iteration-3/critique/` | Against Coverage and the references |
| O4 | `docs/DEMO.md` with the five flows | | |
| O5 | Push and redeploy | | `git push`, `npx vercel --prod` |

## 2. Scenario seeding (from `scenario_matrix.json`)

| Change | Stage | Steps done | What is seeded | What the flow creates |
|---|---|---|---|---|
| RC-2026-014 12 CFR 1005.11(c) | Not started | 0 of 6 | The rule text and sections; the run, not played; T-301 for Elena | D1: obligations, links, the gap block, tasks for Margaret Ellison (policy and procedure fix), vendor checks, and the impact sign-off for Anthony |
| RC-2026-017 31 CFR 1020.220 | Applies | 1 of 6 | Applies verdict; T-285 | none |
| RC-2026-013 12 CFR 1030.4 | Obligations proposed | 2 of 6 | 3 proposed obligations; T-289 (Hannah Cole owns the area) | none |
| RC-2026-016 12 CFR 1026.19(e) | Linked | 3 of 6 | Obligations and links; the coverage run, not played; T-296 | D3: H-118 to Grace, then Covered |
| RC-2026-011 12 CFR 208 App. D-2 III.C | What's left | 4 of 6 | The MFA gap; T-298 "Choose a fix" | D2: the control-design run, H-117 to Priya, H-116 to Anthony, CTL-153, 3 vendor reviews and a retest |
| RC-2026-009 12 CFR 337.6 | Closed | 6 of 6 | Closed with record entries | none |
| RC-2026-012 12 CFR 208 App. D-1 II.A.6 | Closed with a known gap | 6 of 6 | KG-007 accepted by Anthony until 31 Dec | none |
| RC-2026-018 12 CFR 1005.18 | Doesn't apply | 1 of 1 | Verdict and the deciding fact | none |
| RC-2026-019 12 CFR 339.3 | Needs a bank fact | 0 of 6 | Waiting on one fact | D4: H-114 to Grace, then Applies |

## 3. The five flows and their `data-demo` targets

| Flow | Start | Targets |
|---|---|---|
| D1 A new rule lands | `/` as Elena | `D1-1` the Today row for 12 CFR 1005.11(c); `D1-2` Run Madison on this rule; `D1-3` the Obligations platform; `D1-4` the gate; `D1-5` the accept option; `D1-6` the What's left platform; `D1-7` Open in Coverage |
| D2 Close a gap with a new control | `/rules/RC-2026-011/` as Elena | `D2-1` the What's left platform; `D2-2` Choose a fix; `D2-3` the seven checks; `D2-4` the persona switch, then Priya's task; `D2-5` Anthony's sign-off; `D2-6` Open in Coverage |
| D3 A handoff that unblocks a change | `/rules/RC-2026-016/` as Elena | `D3-1` Check coverage; `D3-2` Link and raise the drift; `D3-3` the persona switch, then Grace's Today row; `D3-4` Update the procedure; `D3-5` the persona switch, then the unblocked map |
| D4 When a rule does not apply | `/rules/` as Elena | `D4-1` the prepaid tile or row; `D4-2` the flood tile or row; `D4-3` Grace's answer |
| D5 The CCO's view | `/` as Anthony | `D5-1` the counts and mini field; `D5-2` the lens switch, Owner; `D5-3` the wire transfers plot; `D5-4` Approve the board pack; `D5-5` the Reg E run cluster, Replay |

## 4. Risks and fallbacks

- **3D performance.** The change map adds pucks, arcs and packets to the kit scene. Mitigations: instanced blocks, at most about 30 HTML labels, contact shadows rendered only while something moves, and AO at half resolution. Without WebGL, or with reduced motion, the change room shows the List view and a static 2D map.
- **Scene-kit reuse.** The change map must use the same Stage, lights, materials and camera as Coverage. Anything new (pucks, rings) is added to the kit, not to the page.
- **State resets.** A per-flow reset must not touch other flows. The store keys everything a flow changes by change id or handoff id, and `resetScenario` clears just those keys. Tests reset first and use a fresh browser context.
- **Headless WebGL is slow.** The e2e tests use the 4× speed control and wait on state, never on fixed times.
