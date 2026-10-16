# 03 The agent canvas: "Watch Madison work"

First, read `00_brief.md`, `02_data_and_player.md`, `reference/textql_refinery_diagram.png`, `reference/yukon_agents_verifier.png` and both frame sheets. Watch both `.mp4` files.

This is the most important screen in the prototype. It must make anyone watching feel that real, careful agent work is happening, and let them check it.

## 1. Layout at 1440 wide (route `/runs/[id]`; also opened full-screen from the change room)

```
┌ Madison reads 12 CFR 1005.11(c)                   [ LIVE ]   Pause  0.5 1 2 4  ───●──────── 00:12 / 00:31 ┐
│ / RUN 16 OCT 2026 · STARTED BY ELENA PETROVA                                                            │
├──────────────┬────────────────────────────────────────────────────────────────────┬────────────────────┤
│ / AGENTS · 9 │  / SOURCES        ┌ Get the text ┐ ─■─ ┌ Split ┐ ─■─ ┌ Applies? ┐ ─■─ ┌ Find duties ┐ │ / OUTPUTS          │
│ ■ Rule feed  │  eCFR  ■──────────└──────────────┘     └───────┘     └──────────┘     └──────┬──────┘ │ Applies to         │
│ ■ Splitter   │  Fed. Register ■                                                            │        │ Northgate          │
│ ■ Scope      │  Bank profile ■   ┌ What it touches ┐ ─■─ ┌ Match coverage ┐ ─■─ ┌ You ┐ ─■─ ┌ Verifier ┐ │ Yes · consumer EFT_│
│ ■ Duty finder│  Policies ■       └─────────────────┘     └────────────────┘     └─────┘     └──────────┘ │                    │
│ ■ Reviewer   │  Controls ■          ↘ held back tray                                                     │ Covered in change  │
│ …            │                                                                                            │ step chart 0→4 / 6 │
├──────────────┴────────────────────────────────────────────────────────────────────┴────────────────────┤
│ Read ─── Check ─── Decide ─── Cover        sections 14 · duties 8 · held back 1 · links 12 · $1.07 · 00:31 │
│ Reading section 1005.11(c)(2): found 2 duties_                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Left column (260 px): "/ AGENTS · 9 ON THIS RUN"** (from the Yukon reference)
- One row per agent and person in the run: hue square, plain name, mono id, and a tiny 5-bar activity meter that grows with that agent's events.
- **The active row fills with `--highlight`.** Thin fan-in lines run from active rows to their stage node, with dots travelling along them.

**Centre: the schematic** (from the TextQL reference)
- Stage nodes are flat panels with **corner brackets**. Each shows:
  - its title ("Find the duties");
  - a mono subtitle (`/ 8 PROPOSED · 9 OF 14 SECTIONS`);
  - its agent tags;
  - a state line: waiting is hollow; running has a `border-trail` in the agent hue plus `text-shimmer` on the subtitle; done is solid.
- **Ports** are 6 px squares. **Connectors** are 1 px hairline curves (React Flow custom edges).
- **Packets** are 4 to 5 px squares moving along connectors (React Flow UI `animated-svg-edge` with a square shape, or the `Packet` core component). There is one packet per `item` event; it carries the item's label in a hover tooltip.
- **Two lanes.**
  - The upper lane reads: text, sections, scope, duties.
  - A curved connector drops to the lower lane, which runs right to left so the flow reads as a loop: verifier gate, you decide, coverage, what it touches. That makes room for the write-back arc.
- **Sources** sit as a column of small text tiles (with ports) on the left edge of the canvas. Policy and control packets come from them during coverage.

**The verifier gate** (the "Check every duty" stage, as Yukon's Verifier)
- A taller box. Every duty packet enters it and the box **fills** (`--highlight` at low opacity) while that duty is checked.
- **Two outlets.** "✓ verified" continues; "× held back" drops into a **held-back tray** below the gate, showing the held item and its reason. Draw the check and cross as strokes.
- In `run-design-mfa`, the gate shows **seven small cells, D1 to D7**:
  - each fills on pass;
  - D6 shows as hollow with "can't tell" and a hairline running to the owner node;
  - D6 fills only after Priya answers.

**The person node** ("You decide", "Owner answers", "CCO signs off")
- A distinct shape: a bracketed panel with a 28 px initials circle, in `--person`.
- When the flow reaches it, the canvas **visibly waits**: packets queue at its port, a slow ring pulses on the node, and a docked bar appears at the bottom centre ("Waiting for Elena Petrova: Accept 6 duties and exclude 1"), with the action buttons.
- If the persona is wrong, the bar says who is needed and offers "Continue as …".

**Right column (300 px): "/ OUTPUTS"** (the TextQL right column)
- Output cards **type in, with a caret** (`Typed`): a mono label, then the value.
- Below them, a Yukon-style **step chart**, "Covered in this change". It steps up as duties become covered (0 to 4 of 6), with ringed points and a "Latest" pill in `--highlight`.

**Bottom strip** (the TextQL observability strip and the Yukon phase strip)
- **A phase strip:** Read, Check, Decide, Cover. Hairline segments; the current phase is a filled square that moves.
- **Live metrics** in mono, rolling as they change (`text-roll`): sections, duties found, held back, links, cost and elapsed time.
- **The narration line:** one sentence, typed (`Typed`). It is also the `aria-live` region.

**The write-back arc.** When the run finishes, a long hairline arc draws from "What it touches" back over the canvas to the left edge, labelled `/ WRITTEN TO THE RECORD · 23 ENTRIES` (copied from the TextQL write-back arc). Clicking it opens `/record`, filtered to this run.

**First appearance.** The diagram **builds itself** in about 1.2 seconds:
1. Nodes appear in flow order.
2. Connectors draw once (stroke-dashoffset).
3. Ports pop in.

This is the one orchestrated moment. After that, motion comes only from the run.

## 2. The three interactions that make it feel deep (from the Transformer Explainer)

1. **Hover to trace.** Hovering any packet, item, output card or tray item highlights its whole lineage (rule, section, duty, link, policy or control) in 1.5 px `--ink`, and dims everything else to 25% opacity. This is the signature interaction. Make it instant and smooth.
2. **Expand a stage in place.** Click a node and it widens, while the other nodes compress to small labelled chips (320 ms, `motion` layout animation). The expanded node shows:
   - its sub-steps (for "Find the duties": duty finder, then quote check, then reviewer);
   - the items it holds, as a list with their state;
   - its inputs and outputs;
   - time and cost.

   Escape collapses it.
3. **The inspector.** Click any item to open a right slide-over with:
   - the rule's own words, with the extracted sentence highlighted (`text-scramble` resolves the citation);
   - the plain version;
   - the certainty word;
   - the reviewer's verdict and reason;
   - the agent, version and model (synthetic: "claude-sonnet · prompt v14"), duration and cost;
   - who decided, and when (after the person event);
   - links onward to the duty room.

## 3. The depth view (3D)

A segmented control, **Schematic | Depth**, switches to an isometric 3D view of the same run, driven by the same player state:

- **Scene:**
  - Stages are low matte slabs on a pale ground plane, with hairline edges. A slab's height grows with the items it holds.
  - The verifier is a translucent box that fills.
  - Person stages are a raised ring.
- **Packets** are 6 px cubes (instanced mesh) gliding along ground lines between slabs, in the agent hue.
- **Camera:** orthographic, at a fixed isometric angle, with limited orbit (±25°), zoom, and a gentle idle drift that stops when you interact.
- **Light:** soft ambient plus one directional light with contact shadows. No bloom, no reflections, no glow.
- Labels are HTML (drei `Html`) in the same mono label style, so the type stays crisp.
- Fall back to the schematic if WebGL is unavailable.

## 4. Controls and states

- **Controls:** Pause or Play (text buttons), speed 0.5x, 1x, 2x or 4x (segmented), and a scrubber whose event ticks are coloured by type (stage, check, person, output).
  - Keyboard: Space plays or pauses; the arrow keys step; Home restarts.
- **Modes:** `[ LIVE ]` when started from a button, `[ REPLAY ]` when opened from the record. Replay starts paused, with the build-in animation.
- **Done state:** every node is solid, the write-back arc is drawn, and a summary panel slides up at the bottom with a primary action ("Open what's left", "Open the impact"). The change room behind it is updated.

## 5. Compact versions (same component, a `size="strip"` prop)

- **A strip** (96 px tall): the stage chain with packets, the narration line and the current phase. Used at the top of the change room and on Today while a run is active, with "Open full view".
- **A card** (Today hero): the schematic at small scale with `tilt` on pointer move (±3°), playing a looped replay of `run-rule-1005` at 2x, muted, with the label `/ LIVE ON 12 CFR 1005.11(c)`.

## Acceptance

- [ ] All three runs play beautifully at 1x and 4x, pause at people, and the hover trace works on every item
- [ ] It runs smoothly (60 fps) in Chrome on a normal laptop, with 50 or more packets moving
- [ ] Reduced motion: no moving packets; state changes highlight instead; the narration still reads
- [ ] It looks like the references' level of craft. Put screenshots next to the reference images in `docs/review.md` and critique them honestly
