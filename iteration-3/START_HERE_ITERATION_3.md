# Start here: iteration 3 (demo-ready Madison)

You are improving the **existing** prototype in this repository. Read every file in `prompt-pack/iteration-3/`. They override earlier iterations wherever they conflict, including the F37 and F38 run-view work: the change map replaces the separate run page.

## Goal

Make Madison demo-ready.
- **Several complete A-to-B demo flows,** each starting somewhere obvious and ending on a visible result.
- **One agentic, Coverage-quality 3D "change map"** in the change room, instead of the old top-to-bottom flow.
- **Clear ownership and dates everywhere.**
- **Every fix from the live review.**

**The Coverage field is the quality bar** for everything visual.

## Step 1: Read

1. `30_demo_first.md`
2. `31_agentic_change_room.md`
3. `32_ownership_dates_fixes.md`
4. Every file in `data/`: `demo_flows.json`, `scenario_matrix.json`, `ownership.json`, `dates.json`
5. Look again at `prompt-pack/reference/` (TextQL, Yukon) and at your current Coverage field code. You will reuse its scene kit.

## Step 2: Audit and plan

1. Run the app, and screenshot Today, Rule changes, every change room state, Coverage, an obligation page, My tasks and the record, into `docs/iteration-3/before/`.
2. Write `docs/ITERATION-3-PLAN.md`:
   - each requirement, then the files, then how you will do it;
   - the scenario seeding plan, per rule change, to its stage in `scenario_matrix.json`;
   - the five demo flows and the `data-demo` targets they need;
   - risks (3D performance, scene-kit reuse, state resets).
3. Write `docs/ITERATION-3-PROGRESS.md` as a checklist. If the session drops, re-read both files and continue from the first unchecked item. **Commit after every meaningful step.**

## Step 3: Build, in this order

| Phase | What |
|---|---|
| J Data and ownership | Merge ownership, dates and scenarios. Seed every rule change to its stage. Add Hannah Cole. One selector per count. Fix ids and field names in the UI |
| K The change map | Build it with the Coverage scene kit, in every state (not started, part done, doesn't apply, needs a fact, closed). The run plays in place. Side panel with platform detail and the Decision panel. The four-answers strip. Pucks for agents, arcs and packets for data, the gate, the person ring. Blocks settle into this regulation's plot. "List view" toggle |
| L Rule changes | The "Where every change stands" tile strip; the collapsed table with owner, deadline and days left; no auto-expanded row |
| M Coverage and the fixes | The lens switch (State, Owner, Deadline); labels by regulation; a specific plot panel; the wheel fix on every 3D view; the record chain made readable; the Today, lineage, toast, typing and Live-label fixes |
| N Demo hub and guide | The "Demos" panel; scenario reset per flow; the coach card with spotlight and talk track; `data-demo` targets |
| O Prove and ship | Playwright tests D1 to D5, all passing; screenshots of every change map state and of each flow's end in Graphite light, Graphite dark and Harbor light; a side-by-side critique against Coverage and the references; then `docs/DEMO.md` with the five flows; then push and redeploy |

**At the end of each phase:**
- the build and tests pass;
- screenshots, which you look at and fix;
- a search for "duty", raw ids, emoji and icon libraries;
- commit `iteration 3 · phase <x>: <what>`;
- a 5-line status.

## When you finish

Give me:
- the deploy URL;
- the status of every requirement;
- the five demo flows, each with its first click and its ending;
- anything you simplified, and why.
