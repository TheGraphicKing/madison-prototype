# Iteration 2: progress

If the conversation is compacted: re-read `docs/ITERATION-2-PLAN.md` and this file, then continue from the first unchecked item. Evidence paths are under `docs/iteration-2/`.

## Feedback items (F05 does not exist in the register)

| # | Item | Status | Evidence |
|---|---|---|---|
| F01 | Three palettes, light and dark | [x] | Done (A) · `scripts/contrast.mjs` passes all six themes · `phase-a/gallery-*` · Color popover rows + Light/Dark (`components/shell/color-button.tsx`) |
| F02 | No workflow hero on Today | [x] | Done (E) · today.tsx rewritten without the flow hero · phase-e/today-* |
| F03 | Counts with deltas, small trend | [x] | Done (E) · four counts with this month's change and a 40 px sparkline, beside the mini 3D field; old 12-month chart removed · phase-e/today-* |
| F04 | Today sections made clearer | [x] | Done (E) · tiles, Needs you, Waiting on others, standing, What changed with Applies chips, overnight line; Rule changes Applies column, counts, New-applies filter · phase-e/* |
| F06 | Duty renamed obligation everywhere | [x] | Done (A) · `scripts/scan-text.mjs` reports no duty/duties on 24 routes · `/duties` redirects to `/obligations` (`app/duties/**`) |
| F07 | Run view: one step flow, at most 2 regions | [x] | Done (C) · `components/run/run-view.tsx`: two regions (flow 60%, detail 40%) · `phase-c/run-reg-running-*`, `phase-c/run-reg-checkpoint-*` |
| F08 | Agents hidden behind "Show how Madison did this" | [x] | Done (C) · no agents column; agent names only inside "Show how Madison did this" (`data-how`) in `run/step-detail.tsx` |
| F09 | Flow stays viewable after deciding | [x] | Done (C) · finished flow stays on screen with every step clickable and Replay · `phase-c/run-reg-done-graphite-light-1440.png`; replay opens finished |
| F10 | One Decision panel in three places | [x] | Done (D) · `decision/decision-panel.tsx` used by the task drawer, the run Checkpoint and "Your task now" (`tasks/task-action.tsx` TaskDecision) · `phase-d/rules_RC-2026-011-*` |
| F11 | Useful before-run state | [x] | Done (D) · "What we know": summary, diff of changed sections, effective date, likely touches, last read 05:00; Run Madison is the one primary action; no empty cards · `phase-d/rules_RC-2026-014-*` |
| F12 | Real after-run battle cards | [x] | Done (D) · `change/battle-cards.tsx`: chip chain with Confirm or Reject, segmented coverage bar, blockers, gaps with consequence line, close checklist · `phase-d/rules_RC-2026-016-*`, `phase-d/rules_RC-2026-011-*` |
| F13 | Doesn't-apply shows only Applies | [x] | Done (D) · RC-2026-018 shows only the Applies card, the bank fact and "Reopen if this changes" · `phase-d/rules_RC-2026-018-*` |
| F14 | Card to step and step to card links | [x] | Done (D) · each card's "See how" opens the replay at its step with `from=` back; `#card-{k}` opens and scrolls to a card; `run/step-detail.tsx` links each step to its card · `phase-d/rules_RC-2026-014_touches_1-*` for the What it touches slide-over |
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
| F30 | Replay disclaimer | [x] | Done (C) · disclaimer footer on every run view · all `phase-c/run-*` shots |
| F31 | Human input unmistakable | [ ] | |
| F32 | No new modules, repetition removed | [ ] | |
| F33 | All three runs in the new layout | [x] | Done (C) · rule run, coverage check and control design in one layout · `phase-c/run-reg-*`, `phase-c/run-coverage-*`, `phase-c/run-mfa-*` |
| F34 | Seven personas | [x] | Done (B) · `PERSONA_IDS` has 7 people · persona switch |
| F35 | Custom glyph set | [x] | Done (A) · `src/components/glyphs/index.tsx` (7 nav, 11 task types, chevron) · gallery `phase-a/gallery-graphite-light-1440.png` · no icon library in package.json |
| F36 | No penalty figures | [ ] | |
| F37 | Agent view next to Simple view | [x] | Done (after D) · `run/agent-view.tsx`: three zones, Simple and Agent switch, Agent is the default for replays, `view=simple` for live runs from the change room · `f37/agent-rule-*` (running, waiting, decide, done, focus) in three themes, `f37/agent-coverage-replay-*`, `f37/agent-mfa-replay-*`, `f37/agent-rule-done-graphite-light-390.png`. Critique and next steps: `f37/CRITIQUE.md`. F38 builds on this. |
| F38 | One 3D language (scene kit) across the product | [ ] | |

## Phases

- [x] A Foundation v2
- [x] B Data, tasks and handoffs
- [x] C Run view v2
- [x] D Change room
- [x] E Today and Rule changes
- [ ] F Coverage 3D v2
- [ ] G Obligations
- [ ] H Tasks, Reports, Record
- [ ] I Subtract, polish, ship (click-crawl, demo loops, DEMO.md, deploy)

## Subtraction list

See `docs/ITERATION-2-PLAN.md` §2. Each removal is ticked here when made.
