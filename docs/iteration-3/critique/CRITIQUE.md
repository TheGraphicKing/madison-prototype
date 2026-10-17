# Iteration 3: the change map against Coverage and the references

Comparisons: `compare-change-map.png` (the map beside the Coverage field and TextQL Refinery) and `compare-change-map-running.png` (the map at the decision, beside Yukon).

## What now matches the bar
- **One kit, one look.** The map uses the same Stage, lights, ground, contact shadows, ambient occlusion, rounded blocks, platforms and camera rig as Coverage.
- **Shared blocks.** Its plot is drawn with Coverage's blocks and heights, so the obligations a run adds land in the same object that "Open in Coverage" flies to.
- **Data visibly flows (the TextQL lesson).**
  - Arcs run from the source stacks into the platforms they feed, and a packet travels while a platform works.
  - The links fly in from the Policies and Controls stacks.
  - Agents are labelled pucks that glide to the platform they work on.
- **State reads at a glance.**
  - Done platforms carry their result as objects; not-started ones are dashed outlines; the current one is lifted and highlighted.
  - A blocked one says who it waits on.
  - A doesn't-apply change draws only the Applies platform, with its deciding fact.
- **The run plays in place.** Nothing disappears afterwards, and the decision opens beside the scene, never over it.

## Where it still falls short
- **Density.** Coverage fills its frame with 1,894 blocks. The change map is a wide, shallow scene, so at 1440 px the platforms sit in a band with air above. TextQL labels every edge; we label only platforms, sources and the plot.
- **Label crowding.** In tight spots (the gate, "Double-check", and the link arcs near Linked) labels can touch.
- **Phones.** The map's labels need more width than a phone has, so the change room opens on the List view there, with the map one tap away.
- **Headless rendering.** It is slow without a GPU. The tests run Chromium with the GPU enabled; on a laptop GPU the scenes are light (instanced blocks, one draw call per kind of block, about 30 HTML labels).

## Fixed during this pass
- The first scene label was dropped, and leaving a scene threw a DOM error. Labels now mount into a stable portal.
- The coach card covered its own target. It now moves to the top when the target is low on the screen.
- The overview was framed too loosely. Sources and the plot were moved in, and the framing tightened.
