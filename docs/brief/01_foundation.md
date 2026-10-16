# 01 Foundation: project, design system, shell and the Color switcher

First, read `00_brief.md` and look at every file in `reference/`.

## 1. Create the project

1. Create a new Next.js App Router project in TypeScript (`madison-prototype`), with Tailwind 4, ESLint and `src/`.
   - Set `output: 'export'` and `images: { unoptimized: true }` in `next.config`.
2. Install: `motion`, `@xyflow/react`, `d3-scale`, `d3-shape`, `d3-interpolate`, `@react-three/fiber`, `@react-three/drei`, `three`, `zustand`, `@tanstack/react-table`.
   - Run `npx shadcn@latest init`, then **remove `lucide-react`** and every icon import. Draw chevrons, checks and close marks as tiny inline SVG strokes in one `Mark` component.
3. Copy `data/` into `src/data/`, `palettes.json` into `src/theme/` and `reference/` into `docs/reference/`.
4. Fonts:
   - Download Satoshi (Variable, Regular, Medium) from Fontshare into `src/fonts/` and load it with `next/font/local` as `--font-sans`.
   - Load JetBrains Mono (400, 500) with `next/font/google` as `--font-mono`.

## 2. Tokens and palettes

1. Generate `src/theme/palettes.css` from `palettes.json`: one `html[data-palette="<id>"]` block per palette, setting:
   - `--ground`, `--surface`, `--surface2`, `--surface3`, `--line`, `--lineStrong`
   - `--ink`, `--ink2`, `--ink3`
   - `--accent`, `--accentInk`, `--accentSoft`, `--focus`
   - `--ok`, `--okSoft`, `--warn`, `--warnSoft`, `--risk`, `--riskSoft`, `--info`, `--infoSoft`
   - `--agent-1` to `--agent-6`, `--person`
   - `--highlight`, `--highlightInk`
   - and `color-scheme`.

   Map them into Tailwind 4 with `@theme inline`. **Graphite is the default.**
2. **Colour rules:**
   - Surfaces are calm; colour carries meaning only.
   - `--highlight` (lime in Graphite and Yukon) is used **only** for what is live, new or just decided: the running stage, a "just found" item, the newest point on a chart. Never for decoration.
   - `--accent` is for the one primary action per view.
   - Text on `--highlight` is always `--highlightInk`.
3. **Space:**
   - A 4 px grid. Page gutters are 40 px on desktop and 20 px on mobile.
   - Section spacing is 48 to 64 px; dense tables are the exception.
   - Be generous. Whitespace is part of the look.
4. **Lines and shape:**
   - Hairlines are 1 px `--line`; active lines are 1 px `--lineStrong`, or 1.5 px `--ink` for the selected path.
   - Radii are small: 4 px on panels, 2 px on chips and inputs, and 0 on schematic nodes, which use corner brackets instead.
   - No drop shadows on resting surfaces. Overlays get one soft shadow.
5. **Motion tokens:**
   - Durations of 120, 180, 240 and 320 ms, plus a 600 to 1,200 ms "hop" for packets.
   - Entering ease `cubic-bezier(0.22, 1, 0.36, 1)`.
   - Everything respects `prefers-reduced-motion`.

## 3. Type

| Role | Specification |
|---|---|
| Display | Satoshi 40/44, weight 500, tracking -0.02em. One per page at most |
| Page title | 28/34, weight 500 |
| Section title | 18/26, weight 500 |
| Body | 15/24, weight 400 |
| Small | 13/20 |
| Mono label | JetBrains Mono 10.5/14, weight 500, capitals, tracking 0.14em, colour `--ink3` |
| Mono data | JetBrains Mono 12.5/18 (ids, citations, table numbers, with tabular figures) |
| Big counts | Satoshi 44/44, weight 400, tracking -0.03em |

**The label vocabulary** (copy the TextQL reference exactly, and use it with discipline):
- `/ LABEL` for a section or node subtitle.
- `/ A · B · C` only for real metadata lists.
- `[ LABEL ]` only for the one global mode label per page (for example `[ LIVE ]`, `[ REPLAY ]`).
- Never put a label above every heading. A label must carry information.

## 4. Core building blocks (`src/components/core/`)

Each one gets every state (hover, focus, active, disabled, loading), keyboard support, and a gallery entry (step 6).

1. **`Bracket`.** Draws corner-bracket frames: four L-shaped strokes, 10 px arms, 1 px. It wraps schematic nodes and the hero panels.
2. **`Port`.** A 6 px square, filled or hollow, sitting on a node edge where connectors meet.
3. **`Packet`.** A 4 to 5 px square that moves along an SVG path (offset-path, or `animateMotion`). Coloured `--ink`, or the agent hue while it is in that agent's stage, or `--highlight` while being decided.
4. **`MonoLabel`**, plus **`Count`** (the big number with its label underneath, animated with Magic UI `number-ticker`).
5. **`StatusChip`.** A 6 px square, then the label: covered (`--ok`), not yet confirmed (`--warn`), nothing behind it (`--risk`), known gap (`--info`), out of scope (`--ink3`).
6. **`CertaintyWord`.** Clear, Likely, Unsure, shown as text with a 3-segment hairline meter.
7. **`AgentTag`.** A 6 px square in the agent's hue, the plain name, then the id in mono (`Duty finder  RC-03`).
8. **`PersonTag`.** A 20 px circle with initials (no photo), plus the name.
9. **`Button`.**
   - Primary: `--accent` with `--accentInk`.
   - Quiet: transparent, with a hairline.
   - Text: an underline on hover.
   - Heights 32 and 40. No icons. Press state scales to 0.98.
10. **`DataTable`** (TanStack):
    - Hairline rows, no zebra striping; rows 44 high; right-aligned tabular numbers; mono ids.
    - Hover a row to show a 2 px left rule in `--ink`.
    - Sortable headers with drawn chevrons; sticky header; keyboard row navigation.
11. **`Panel`.** A surface with a 1 px hairline and an optional header row: title, mono subtitle and actions.
12. **`SlideOver`** (from the right, 520 px), **`Dialog`**, **`Popover`**, **`Tooltip`**, **`Tabs`** (an underline style), **`Segmented`**: all from shadcn, restyled.
13. **`Typed`.** Typing text with a blinking caret (Magic UI `typing-animation`, restyled), for outputs and narration.
14. **`Sparkline`** and **`StepChart`** (d3-shape `curveStepAfter`, ringed points, a newest-point pill in `--highlight`), as in the Yukon reference.

## 5. The app shell

**Rail (left, 240 px; collapses to 64 px):**
- The wordmark "Madison" set in Satoshi 20/500. A tiny "by Lyzr" in mono. No logo image.
- Below it: "Northgate Community Bank", in small text.
- **Navigation, as text links** with a 2 px left rule on the active item:
  - Today
  - Rule changes
  - Coverage
  - Duties
  - My tasks
  - Reports
  - The record
- A 1 px hairline divider between the rail and the content.

**Header (64 px):**
- A breadcrumb in mono labels, and the page title.
- On the right:
  1. **"Viewing as"**, a persona switch: Elena Petrova (analyst), Anthony Marsh (CCO), Priya Raman (CISO). It changes greetings, task lists, and who can act at person checkpoints.
  2. **The Color button:** four overlapping 10 px squares of the current palette, then "Color". It opens a popover with the six palettes; each row has a swatch strip, the name, light or dark, and a one-line description. Picking one applies instantly, with a 200 ms colour transition, and is remembered in `localStorage`. Keyboard: arrows, Enter, Escape. Copy the behaviour of `madison_palette_preview.html` exactly.
  3. **The Ask Madison launcher** (bottom right, built in session 04).

**Routes** (with static params):
- `/` (Today)
- `/rules`, `/rules/[id]` (the change room)
- `/runs/[id]` (the agent canvas)
- `/coverage` (with `?view=field|map|rules|documents|calendar`)
- `/duties`, `/duties/[id]`
- `/tasks`
- `/reports`, `/reports/board-pack`, `/reports/exam`
- `/record`
- `/gallery`

## 6. The gallery

`/gallery` shows every token, every type style and every core component in every state, with the Color switcher working.

**Check it in all six palettes before moving on.** This page is how the team judges the look.

## Acceptance

- [ ] `npm run build` produces a static `out/` with no errors
- [ ] No icon library in `package.json`; no emoji anywhere (grep for them)
- [ ] Every palette works on the gallery; Graphite is the default; the choice persists on reload
- [ ] Rail, header, persona switch and Color button work on every route
