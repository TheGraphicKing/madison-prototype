# 30 Demo first: every flow runs from A to B

## The principle

This prototype exists to give demos. A demo is a story, with a clear start, a few clicks, and a satisfying end where something visibly changed.

Every flow must:
- start at an obvious place;
- complete fully, with no dead ends and no half-finished data;
- end on a visible result: a coverage block changing colour, a signed record entry, an approved report;
- be repeatable: resettable on its own in one click.

## 1. The demo hub

Add a quiet **"Demos"** entry at the bottom of the rail, above "Reset demo" (with its own glyph, and the shortcut D). It opens a panel with the 5 flows from `data/demo_flows.json`. Each card shows:
- the title;
- who it is for;
- the starting person;
- the length ("4 min");
- one line of the story;
- **"Start this demo"**.

**"Start this demo":**
1. resets only that flow's scenario data (`scenario_reset`);
2. switches to the starting persona;
3. goes to the starting screen;
4. turns on the guide.

## 2. Guided mode (the presenter's coach)

- **A small floating coach card,** bottom centre, 360 px: "Step 3 of 7 · Click 'Find the obligations' while it works", plus Back, Next and Exit. Next becomes available when the step's action happens.
- **The target gets a soft spotlight ring,** while the rest of the screen stays usable.
- **"Talk track"** (folded by default): the 2 to 3 sentences the presenter can say at this step.
- **At the end:** "Demo complete", with what changed, and "Start another demo".
- **Targets:** add a `data-demo="<flow>-<step>"` attribute to every element a step points at.
- **The guide is optional.** Every flow also works without it.

## 3. A scenario at every stage, visible at a glance

`data/scenario_matrix.json` lists the 9 rule changes at different stages:
- **not started** (0 of 6);
- **applies** (1);
- **obligations proposed** (2);
- **linked** (3);
- **what's left** (4 of 6);
- **closed** (6);
- **closed with a known gap**;
- **doesn't apply**;
- **needs a bank fact**.

Seed the data so each change is exactly at its stage, with consistent counts, tasks and record entries. **Flows create their own handoffs and tasks while they run** (do not seed them as already open), so nothing is duplicated.

## 4. Every flow must actually finish (test them)

Write a Playwright test per flow, `e2e/demo-D1.spec.ts` to `demo-D5.spec.ts`, that follows the steps in `demo_flows.json`, switching personas where needed. It asserts the end state:
- **D1:** the Reg E plot has the new gap block; Margaret Ellison has a task.
- **D2:** the MFA obligation is covered; CTL-153 is in force; 3 vendor reviews exist.
- **D3:** the obligation is covered; the handoff is done; the change is unblocked.
- **D4:** prepaid shows "Doesn't apply"; flood applies after Grace answers.
- **D5:** the board pack is approved; the record has the signature.

All five must pass before you deploy.
