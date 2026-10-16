# 02 Data layer and the run player

First, read `00_brief.md` and `data/README.md`.

## 1. Typed data

1. Write `src/data/types.ts`, with TypeScript types for every file in `data/` (the field names follow Madison's real backend models), and `src/data/index.ts` with typed getters:
   - `getChange(id)`, `getDuty(id)`, `dutiesFor(changeId)`, `linksFor(dutyId)`
   - `controlById`, `policyById`, `procedureById`, `vendorsFor(changeId)`
   - `userById`, `tasksFor(userId)`
   - `position()`, `run(id)`
2. Never invent data inside components. Anything a screen shows comes from `data/`, or from the prototype store (decisions made during the demo).
3. **Dates.** "Today" is **16 October 2026**. Format dates as "4 Jan 2027", with relative hints ("in 80 days") where useful.

## 2. The prototype store (zustand, persisted to `sessionStorage`)

**It holds:**
- `persona`
- `palette`
- `decisions`: what was accepted, signed or answered during the demo, with who and when
- `runs`: the playback state of each run
- `revealed`: which "after run" results are now visible

**Applying results.** When a run finishes:
- update its change to the run's `after_run` values in `rule_changes.json` (state, counts, new control);
- record each person decision in the record (`/record`), with the persona's name and the current time;
- add a toast in plain words ("6 duties accepted for 12 CFR 1005.11(c)").

**"Reset demo".** A quiet text button in the rail footer clears the store, so the demo can be shown again.

## 3. The run player (`src/lib/player/`)

Runs live in `data/runs/*.json`. Each has `stages`, `sources` and a time-ordered `events` list with a `t` offset in milliseconds.

**Event types:**

| Type | What it means |
|---|---|
| `stage` | A stage changes state: waiting, running, done, waiting_person, refused, failed |
| `item` | An item (document, section, duty, link, candidate, impact, handoff, draft part) moves from one place to another (a stage id, or a source id) |
| `check` | A gate result: `pass`, `block` or `cannot_tell`, with a reason and a certainty word |
| `person` | The run **pauses** until the right persona presses one of the listed actions |
| `output` | A result card to type in, as in the TextQL right column |
| `metric` | A counter: sections, duties found, held back, links, cost in USD |
| `chart` | A new point on the step chart |
| `narrate` | One plain sentence describing what is happening now |

**Build `useRunPlayer(runId)`.** It returns:
- the derived state at the current time: stage states, items in flight with their from and to, item resting places, gate results, metrics, outputs, chart points, the narration line, and the pending person checkpoint;
- controls: `play`, `pause`, `seek(ms)`, `setSpeed(0.5 | 1 | 2 | 4)`, `stepNext`, `stepBack`, `respond(actionId)`.

**Rules:**
1. The state is derived as a **pure function of (events, time, responses)**, so seeking and replay are exact.
2. At a `person` event, the clock stops until `respond` is called by the persona named in `waiting_for`. If the persona is wrong, show who is needed and offer a one-click switch ("Continue as Priya Raman").
3. Everything shown on screen comes from events: never fake a progress bar.
4. Under reduced motion, items jump between places instantly, with a highlight.
5. Write unit tests (Vitest) for the derivation: the state at a given t, a pause at a person event, seek backwards, and speed.

## Acceptance

- [ ] All three runs play end to end at 1x, pause at every person event, and resume correctly
- [ ] Seeking to any point shows exactly the right state
- [ ] Finishing `run-rule-1005` changes RC-2026-014 from "New" to "What's left", with counts of 4, 1, 1 and 0
