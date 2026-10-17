# 31 The agentic change room: the change map

## Why

The change room still reads top to bottom (steps, then cards), and the agent run is a separate page. That is the previous-generation pattern.

The team's benchmark is the Coverage field: real 3D, plots you click, a camera that flies to them. Siva's references (TextQL, Yukon) show **data visibly flowing between agents**, where you can click anything to see what is working where.

So **the change room becomes one living scene, the change map,** built with the same scene kit and the same quality as Coverage. The run happens **in place**. There is no separate page, and nothing disappears afterwards.

## 1. Layout (one screen, no long scroll)

```
┌ Header: citation · title · Applies chip · Published · Effective · Northgate deadline · Days left · Owner chip ┐
├──────────────────────────────────────────────────────────────────────────┬───────────────────────────────────┤
│  THE CHANGE MAP (3D, about 65% width, at least 560px tall)               │  SIDE PANEL (about 35%)           │
│  sources → platforms → coverage plot; blocks travel; agents work         │  Your task now (Decision) when    │
│                                                                          │  needed; otherwise the selected   │
│                                                                          │  platform's detail                │
├──────────────────────────────────────────────────────────────────────────┴───────────────────────────────────┤
│  FOUR ANSWERS STRIP: Applies? · What it asks · Are we covered? · What's left (owner, due date) · next action    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. The scene (same kit, lights, materials and camera as Coverage)

- **Sources** stand on the left as stacks: eCFR, Federal Register, Bank profile, Policies, Controls, Vendors.
- **The 6 journey platforms,** on a gentle arc: Applies, Obligations, Linked, Covered, What's left, Close. Each platform shows **its current state on it**:
  - Done platforms carry the result as objects. For example, the Obligations platform holds 6 obligation blocks plus 1 excluded block set apart, with a short floating label ("6 obligations · 1 excluded").
  - Not-started platforms are hollow outlines with the label "Not started".
  - The current platform is lifted and tinted with the highlight colour.
  - A blocked platform shows a "Waiting on Grace Liu" tag.
- **Obligation blocks are the same rounded blocks as Coverage,** coloured by state. At the end, they settle into this regulation's **coverage plot**, at the right end of the scene. That plot is the same object as in Coverage, and "Open in Coverage" flies there.
- **Agents are small labelled pucks** (soft rounded discs with a plain name). They glide to the platform they are working on and pulse gently while they work. Dotted trails between pucks and platforms show who did what. Clicking a puck highlights everything that agent touched.
- **Data flows** are thin arcs (the TextQL look) from the sources into platforms, with small packets moving along them during work. Policy and control packets fly from their stacks into "Linked".
- **The gate** (double-check) sits between Obligations and Linked, as a translucent frame the blocks pass through. A held-back block drops beside it, with its reason on hover.
- **The person checkpoint** is a raised ring on the platform. Blocks queue there, and the Decision side sheet opens on the right. **The scene stays visible.**
- **Camera:**
  - default: frame the whole map;
  - while running: "Follow the work" frames the active platform **and its neighbours**;
  - "Overview" resets it;
  - mouse wheel scrolls the page; zoom needs Ctrl or Cmd plus the wheel, a pinch, or the +/- buttons.

## 3. States the map must show (seed one rule change in each)

| State | What the map shows |
|---|---|
| **Not started** (RC-2026-014) | Sources glowing softly, platforms as outlines, one big action ("Run Madison on this rule") that plays the run in place |
| **Part done** (RC-2026-016: 3 of 6; RC-2026-011: 4 of 6) | The finished platforms carry their results; the current one is lifted, with its action |
| **Doesn't apply** (RC-2026-018) | Only the Applies platform, showing the verdict, the deciding bank fact as a small tag, and certainty. The rest of the map is not drawn |
| **Needs a bank fact** (RC-2026-019) | Applies, waiting on Grace Liu |
| **Closed** (RC-2026-009) | Every platform done, the plot complete, "Replay how Madison did this" |

## 4. The side panel (replaces the vertical battle cards)

- **Click a platform** to see its detail: what Madison read, what it found (the rule's own words), certainty, who decided and when, the owner, and the dates. This is where the old battle card content now lives.
- **When a decision is needed,** the Decision panel is pinned at the top ("Your task now"), with the options and what happens next.
- **"How Madison did this"** replays this step in the scene.

## 5. Rule changes list: cleaner, with a stage overview

- **At the top: a compact "Where every change stands" strip.** Seven columns (Not started, Applies, Obligations, Linked, What's left, Closed, Doesn't apply), each change as a small rounded tile in its column, coloured by urgency (days left). Click a tile to open its change map.
- **Below it: the table, collapsed by default.** Never auto-expand the first row. Columns: citation, what changed, Applies chip, owner (process area and person), Northgate deadline with days left, stage.
- **Expanding a row** shows the before and after text.

## 6. The Simple and Agent switch

Remove the separate run page from navigation. The change map is the agentic view. Keep **"List view"** as a small toggle in the change room header, for people who prefer the step list, using the existing Simple view. Default to the change map.
