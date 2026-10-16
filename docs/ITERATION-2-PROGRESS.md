# Iteration 2: progress

If the conversation is compacted: re-read `docs/ITERATION-2-PLAN.md` and this file, then continue from the first unchecked item. Evidence paths are under `docs/iteration-2/`.

## Feedback items (F05 does not exist in the register)

| # | Item | Status | Evidence |
|---|---|---|---|
| F01 | Three palettes, light and dark | [x] | Done (A) · `scripts/contrast.mjs` passes all six themes · `phase-a/gallery-*` · Color popover rows + Light/Dark (`components/shell/color-button.tsx`) |
| F02 | No workflow hero on Today | [ ] | |
| F03 | Counts with deltas, small trend | [ ] | |
| F04 | Today sections made clearer | [ ] | |
| F06 | Duty renamed obligation everywhere | [x] | Done (A) · `scripts/scan-text.mjs` reports no duty/duties on 24 routes · `/duties` redirects to `/obligations` (`app/duties/**`) |
| F07 | Run view: one step flow, at most 2 regions | [ ] | |
| F08 | Agents hidden behind "Show how Madison did this" | [ ] | |
| F09 | Flow stays viewable after deciding | [ ] | |
| F10 | One Decision panel in three places | [ ] | |
| F11 | Useful before-run state | [ ] | |
| F12 | Real after-run battle cards | [ ] | |
| F13 | Doesn't-apply shows only Applies | [ ] | |
| F14 | Card to step and step to card links | [ ] | |
| F15 | Real 3D coverage field | [ ] | |
| F16 | Plot detail panel | [ ] | |
| F17 | Consequences and accepted gaps | [ ] | |
| F18 | Compact obligation filters | [ ] | |
| F19 | Obligation page with lineage and history tabs | [ ] | |
| F20 | 20 tasks, legible | [x] | Done (B, polished in H) · `src/data/tasks.json` v2; `phase-b/tasks-elena-*`, `phase-b/tasks-anthony-*` (glyph, title, from, why, due, state chip, one action); 20 tasks across 8 assignees (data has 8, not 9) |
| F21 | Reports clear and deep | [ ] | |
| F22 | Record chain and list | [ ] | |
| F23 | Floating glyph rail | [x] | Done (A) · `phase-a/rail-collapsed-tooltip-graphite-light-1440.png`, `phase-a/rail-hover-expands-graphite-light-1440.png` |
| F24 | First principles, no technical detail | [ ] | |
| F25 | Everything clickable, 0 dead clicks | [ ] | |
| F26 | Handed-over tasks arrive | [x] | Done (B) · `lib/work.ts` handoff model; `lib/work.test.ts` loop 1 and loop 2; demo-loop screenshots in phase I |
| F27 | Blockers explicit in the drawer | [x] | Done (B) · `components/tasks/task-drawer.tsx`: What you've been given / What you need to provide · `phase-b/drawer-priya-H117-*`, `phase-b/drawer-margaret-H115-*` |
| F28 | Softer components, no brackets | [x] | Done (A) · radii 14/12/10/pill in `globals.css` and core components; `core/bracket.tsx` deleted; `check-forbidden.sh` checks Bracket |
| F29 | Calm working screens | [ ] | |
| F30 | Replay disclaimer | [ ] | |
| F31 | Human input unmistakable | [ ] | |
| F32 | No new modules, repetition removed | [ ] | |
| F33 | All three runs in the new layout | [ ] | |
| F34 | Seven personas | [x] | Done (B) · `PERSONA_IDS` has 7 people · persona switch |
| F35 | Custom glyph set | [x] | Done (A) · `src/components/glyphs/index.tsx` (7 nav, 11 task types, chevron) · gallery `phase-a/gallery-graphite-light-1440.png` · no icon library in package.json |
| F36 | No penalty figures | [ ] | |

## Phases

- [x] A Foundation v2
- [x] B Data, tasks and handoffs
- [ ] C Run view v2
- [ ] D Change room
- [ ] E Today and Rule changes
- [ ] F Coverage 3D v2
- [ ] G Obligations
- [ ] H Tasks, Reports, Record
- [ ] I Subtract, polish, ship (click-crawl, demo loops, DEMO.md, deploy)

## Subtraction list

See `docs/ITERATION-2-PLAN.md` §2. Each removal is ticked here when made.
