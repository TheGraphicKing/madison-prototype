# F38: one 3D language, critiqued against the references

Comparisons in this folder: `compare-agent-view.png`, `compare-agent-view-decide.png`, `compare-coverage.png` and `compare-lineage-record.png`. The references are Yukon's agents verifier, TextQL's Refinery diagram and our own Coverage field.

## What is now shared
`src/components/scene/` holds the kit:
- **Stage:** fov 35 camera, key, fill and rim lights, a Lightformer environment, contact shadows and N8AO.
- **Shapes:** instanced rounded blocks, platforms, slabs and the gate.
- **Labels:** crisp HTML labels that are never scaled by distance.
- **Camera:** one rig with guided easing and Overview.

Five places use the kit: Coverage, the run's live system, the obligation lineage, the record chain and the Today mini field.

## Honest critique
**Agent view (live system)**
- **Better than F37.** Sources stand as stacks and are wired to the steps they feed. Sheets and blocks move between platforms with the run's own timing. The gate fills and holds one block back in a tray. The decision platform rises, queues the 7 blocks and lights up. At the end the blocks settle into the Regulation E plot.
- **Not a card grid.** There are no "01" or "Done" chips. Agent names are tiny monospace metadata under each step.
- **Still weaker than TextQL** on information density: TextQL labels every edge, and ours labels only the break and the sources. The canvas also leaves empty floor above the plot.
- **Labels can touch** when a step's result runs to four lines.
- **Headless renders are slow** (software WebGL), so the screenshots step with the arrow keys. On a laptop GPU the scene is light: one draw call per kind of block and about 20 HTML labels.

**Coverage**
- Still the strongest scene. It has real depth, height by urgency, the fly-to and the plot panel.
- Labels show only on the largest plots until hover, which keeps the field calm but hides small regulations until you point at them.

**Lineage**
- It reads as a stack, from the rule's words down to the evidence.
- The drift break and the dashed missing layer carry the meaning.
- On a phone it opens in the Chain view, because the cards do not fit beside the stack.

**Record chain**
- People are cubes and agents are tiles. The `prev` links and run clusters read clearly.
- At 24 entries the chain is short and looks sparse. It would look better with a year of entries, so the time slider earns its place as the record grows.

**Today mini field**
- A small, honest echo of Coverage: hover for counts, click to open Coverage.

## Fallbacks
- **No WebGL, or reduced motion:**
  - Coverage falls back to the Map.
  - The run falls back to the refined 2D schematic: sources column, rounded steps, packets, the gate bar.
  - The lineage falls back to the Chain.
  - The record falls back to the List.
  - Today shows a link instead of the mini field.
- **Phones:** the run uses the schematic, since the 3D labels would collide that narrow.
