# Madison prototype: plan

## 1. Understanding

**What Madison is.** Lyzr's agentic compliance workbench for US banks. When a regulator changes a rule, Madison's agents fetch the official text, split it, decide if it applies to this bank, extract the duties with the exact sentence they came from, check every duty twice (a code quote check and a second agent), then wait for a named person to accept them. After that they match each duty to the bank's policies, procedures and controls, find where documents disagree (drift), and walk everything the change touches, vendors included. A person decides every step that matters; everything is written to the record.

**Who sees this.** Lyzr's CEO and head of product, then bank executives in live demos. They judge it in seconds: does it look like a real, shipped, careful product, and do I believe the agents' work? The bar is a senior product designer with 15 to 20 years of craft.

**What I take from each reference.**
- *TextQL Refinery:* the schematic grammar. Warm-grey ground, flat panels framed by corner brackets (not boxes), 1 px curved hairline connectors, 6 px square ports where lines meet nodes, small square packets travelling on the lines, a tiny mono capital label vocabulary with a slash prefix, output cards on the right that type in with a caret, a long write-back arc from the end of the flow back to the start, the diagram building itself once, and an observability strip along the bottom with a sparkline.
- *Yukon:* the verifier and the progress chart. A left column of agents whose row fills with the lime highlight when it submits, fan-in hairlines carrying dots into one central Verifier box that fills while checking, two outlets (verified / rejected), a step chart of progress with ringed points and a "new best" pill, and a phase strip (Iterate, Verify, Promote) with a moving marker.
- *Transformer Explainer:* depth through interaction, not decoration. Expand a stage in place (others compress to chips), hover one item to light up its whole lineage and dim everything else, and real values everywhere.

## 2. Design plan

### Palette tokens (Graphite default)
| Token | Use |
|---|---|
| `--ground` | Page background; the canvas field |
| `--surface` | Panels, table bodies, node fills, rail |
| `--surface2` | Hover fills, segmented track, inline code/quote wells |
| `--surface3` | Pressed states, the meter background |
| `--line` | Every resting hairline: panel borders, table rows, connectors |
| `--lineStrong` | Corner brackets, active connectors, input borders on focus-adjacent states |
| `--ink` / `--ink2` / `--ink3` | Primary text and the 1.5 px traced path / secondary text / mono labels |
| `--accent` + `--accentInk` | Exactly one primary action per view |
| `--accentSoft` | Selected row, selected segmented item |
| `--focus` | The 2 px focus ring, offset 2 |
| `--ok`, `--warn`, `--risk`, `--info` (+Soft) | Covered, not yet confirmed, nothing behind it, known gap. Always with a label |
| `--agent-1..6` | Hue squares for agents, packets while in that agent's stage |
| `--person` | The person node, initials circles |
| `--highlight` + `--highlightInk` | Only what is live, new, or just decided: running stage, the newest chart point, the active agent row, a "just found" item |

Palettes switch by `html[data-palette]`; a blocking inline script in `<head>` applies the saved palette before paint, so there is no flash. 200 ms colour transition on `background-color, color, border-color, fill, stroke`.

### Type scale
Satoshi (Fontshare, self-hosted) for text; JetBrains Mono for labels and data.
Display 40/44 500 -0.02em (once per page) · Page title 28/34 500 · Section 18/26 500 · Body 15/24 · Small 13/20 · Mono label 10.5/14 500 caps +0.14em `--ink3` · Mono data 12.5/18 tabular · Big count 44/44 400 -0.03em.

### Mark vocabulary (no icons)
Squares 4/5/6/10 px (filled = done or state, hollow = waiting), dots 4 px, rings (ringed chart points, person pulse), hairlines 1 px, corner brackets (10 px arms), chevrons as two strokes, a caret, and check/cross strokes inside verification results only. One `Mark` component draws chevron, check, cross, close, caret, plus, minus as inline SVG strokes.

### Grid and spacing
4 px base. 12-column content grid, 24 px column gap, max width 1320 px. Page gutters 40 px desktop, 20 px mobile. Section spacing 56 px (inside 48–64). Panels: 4 px radius, 1 px `--line`, 24 px padding. Chips and inputs 2 px radius. Schematic nodes radius 0 with brackets. No resting shadows; overlays get one soft shadow (`0 16px 40px -16px rgb(0 0 0 / .18)`).

### The one bold element per screen
| Screen | Bold element |
|---|---|
| Today | The wide hero card: the compact live canvas replaying the Reg E run |
| Rule changes | The rule table with its 6-square journey tracks and inline diff |
| Change room | "Your task now": the one decision, its evidence and the action |
| Agent canvas | The schematic itself |
| Coverage | The 3D field of 1,894 duty tiles |
| Duty room | The lineage graph |
| My tasks | The Overdue group, set in the risk ink with its count |
| Reports | The two document covers |
| Exam readiness | The 12-square proven grid |
| The record | The timeline line that fills as you scroll |
| Ask Madison | The inline retrieval trail |

### Review against the "no AI slop" rules — what I changed
- First draft had count tiles as four identical rounded cards (as in the palette preview). **Changed:** the four counts sit in one hairline row divided by vertical rules, numbers in ink, a 6 px state square plus label beneath; no cards.
- First draft used the preview's pill-shaped status chips with soft fills. **Changed:** square-led chips (6 px square + label, no pill fill) so status reads like the schematic, never like a SaaS badge.
- First draft had a "fade-up" on each Today section. **Changed:** no section entrance motion; the only orchestrated moment per page is the canvas build-in.
- First draft gave the rail a filled active item (preview). **Changed:** text links with a 2 px left rule.
- Shimmer on running labels is restyled to a flat ink-to-ink3 sweep (no gradient keyword in code): implemented as a moving mask step via `background-position` on a two-stop hard-edged repeating pattern? That still needs a gradient. **Changed:** running state uses a caret and a border-trail square travelling the bracket instead; shimmer replaced by opacity breathing of a single 5 px square. No `gradient` anywhere.
- Hero: no big number + gradient. Greeting in Display, three plain fact lines.

## 3. Phases (tasks, files, acceptance)

### Phase 0 — Setup
Tasks: `git init`; Next.js App Router TS scaffold with Tailwind 4, ESLint, `src/`; `output: 'export'`, `images.unoptimized`; install deps; shadcn init, remove lucide; copy `data/` → `src/data/`, `palettes.json` → `src/theme/`, `reference/` → `docs/reference/`; first commit.
Files: `package.json`, `next.config.ts`, `src/app/*`, `src/data/*.json`, `src/theme/palettes.json`, `docs/reference/*`.
Checks: `npm run build` produces `out/`.

### Phase 1 — Foundation (`01_foundation.md`)
Tasks: generated `palettes.css`; `@theme inline` mapping; fonts (Satoshi local, JetBrains Mono google); motion tokens; core components: Mark, Bracket, Port, Packet, MonoLabel, Count, StatusChip, CertaintyWord, AgentTag, PersonTag, Button, DataTable, Panel, SlideOver, Dialog, Popover, Tooltip, Tabs, Segmented, Typed, Sparkline, StepChart; app shell (rail, header, persona switch, Color button); every route stubbed with static params; `/gallery`.
Acceptance: static `out/` with no errors; no icon library in `package.json`, no emoji; every palette works on the gallery, Graphite default, choice persists on reload; rail, header, persona switch and Color button work on every route.

### Phase 2 — Data and player (`02_data_and_player.md`)
Tasks: `src/data/types.ts`, `src/data/index.ts` getters; dates helper (today = 16 Oct 2026, "4 Jan 2027", "in 80 days"); zustand store persisted to sessionStorage (persona, palette, decisions, runs, revealed) with apply-results, record entries, toasts, Reset demo; `src/lib/player/` pure `deriveRunState(run, t, responses)` and `useRunPlayer`; Vitest tests.
Acceptance: all three runs play end to end, pause at every person event and resume; seeking is exact; finishing `run-rule-1005` turns RC-2026-014 from New into What's left with 4, 1, 1, 0.

### Phase 3 — Agent canvas (`03_agent_canvas.md`)
Tasks: schematic layout (agents column, sources, two lanes, verifier gate with outlets and held-back tray, D1–D7 cells, person node and docked bar, outputs with typing, step chart, bottom strip with phases/metrics/narration, write-back arc, build-in); hover trace; expand in place; inspector slide-over; strip and card sizes; 3D depth view with WebGL fallback; controls (play/pause, speed, scrubber with typed ticks, keyboard); LIVE/REPLAY modes; done summary.
Acceptance: all three runs play at 1x and 4x, pause at people, hover trace on every item; 60 fps with 50+ packets; reduced motion; `docs/review.md` with honest comparison to both references.

### Phase 4 — Screens (`04_screens.md`), in order
Change room, Today, Rule changes (with diff), My tasks, Coverage (Field 3D, Map, By rule, Documents, Calendar), Duties register and duty room, Reports (index, board pack, exam), the record, Ask Madison. Each with a 6-line plan in `docs/screens.md` first.
Acceptance per screen: matches plan, bold element unmistakable; all six palettes; no icons/emoji/gradients, status labelled; every click goes somewhere real; screenshots at 1440 and 390.

### Phase 5 — Finish (`05_finish_and_deploy.md`)
Senior designer pass with before/after in `docs/review.md`; quality floor (Lighthouse, keyboard, 390 wide, 3D fps, no console errors); the 5-minute demo path end to end; `docs/DEMO.md`.

### Phase 6 — Ship
Root `README.md`, `.gitignore`, `netlify.toml`, `robots: noindex`; `gh repo create madison-prototype --private --source=. --push`; deploy (Vercel CLI if logged in, otherwise documented steps).

## 4. Component sourcing

| Library | Install | Component | What I change |
|---|---|---|---|
| shadcn/ui | `npx shadcn@latest init`, `add popover dialog tooltip tabs` | primitives (Radix) | remove lucide, restyle to tokens, square radii, no shadows at rest |
| Magic UI | `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"` etc. | number-ticker, typing-animation, animated-list, dot-pattern, file-tree | tokens; caret as a 1 px bar; file-tree chevrons redrawn with `Mark`, folder icons removed |
| Motion Primitives | `npx motion-primitives@latest add text-scramble border-trail tilt transition-panel text-roll spotlight` | as named | border-trail becomes a square travelling the bracket; tilt clamped to ±3°; spotlight as flat `--surface2` disc with hard edge |
| React Flow UI | `npx shadcn@latest add https://ui.reactflow.dev/animated-svg-edge` (and `base-node`) | edges and nodes in the duty room | square packet shape, brackets instead of borders |
| Vercel AI Elements | `npx ai-elements@latest add conversation message sources inline-citation chain-of-thought` | Ask Madison | strip every icon; if the install pulls the AI SDK or icon deps it does not need, rebuild the same structure locally and record that in `docs/COMPONENTS.md` |
| Origin UI | copied | stepper, timeline | squares and hairlines |
| Aceternity | copied | tracing-beam | flat `--ink` fill line, no gradient |

21st.dev's free plan allows 2 installs a day, so everything is installed from each library's own registry; 21st is only for browsing. Every install and edit is listed in `docs/COMPONENTS.md`.

## 5. Risks and fallbacks
- **Satoshi download fails:** use Inter Tight via `next/font/google` and note it here.
- **WebGL unavailable:** detect before mounting the Canvas; show the schematic (canvas) or the Map view (coverage).
- **Static export with dynamic routes:** `generateStaticParams` on `/rules/[id]`, `/runs/[id]`, `/duties/[id]`; `dynamicParams = false`.
- **Next.js API drift:** read `node_modules/next/dist/docs/` before using `params` (a Promise), metadata and fonts.
- **`useSearchParams` in static export** must sit inside a `Suspense` boundary.
- **ffmpeg is not installed:** motion studied from the two frame sheets instead of extracted frames.
- **A registry component pulls icons or heavy deps:** rewrite locally to the same API, logged in `docs/COMPONENTS.md`.

## 6. Decisions log
- Certainty mapping from data: `high` → Clear, `medium` → Likely, `low` → Unsure.
- Item event `t` = departure; a packet travels for one hop (700 ms at 1x) and then rests at `to`.
- At a `person` event the run clock freezes at that `t` until the right persona responds; elapsed time after it is script time.
- Ask Madison's suggested action `/changes/RC-2026-014` maps to `/rules/RC-2026-014` (the route the brief defines).
- Priya has no assigned tasks in `tasks.json`; "Priya sees the MFA gap" is met by also listing tasks whose duty she owns (T-298, D-208-M1).
- `position.by_regulation` covers 14 regulations; the remaining duties to reach 1,894 per state are spread over the other 8 regulations deterministically, so the field totals match exactly.
- **The agent canvas is drawn in SVG and HTML, not React Flow.** Packets must sit exactly where the pure player state says at every frame and after every seek; a custom schematic (design units 900 wide, scaled to fit) gives exact ports, hop-over arcs, trays and the write-back arc. React Flow is used for the duty room's lineage graph, where free layout and pan/zoom matter more.
- **Typed output is driven by the player clock** while it runs, and continues on the wall clock when the run pauses or waits for a person, so text never freezes mid-word.
- **While a person is awaited and the script has no narration for it,** the narration line shows the person event's own prompt (still from the script).
- **Toasts sit top right**, below the header and under overlays, so they never cover the person bar or the done summary.
- **Exam history** (`src/data/exam_history.json`) is added synthetic data: the pack gives 8 of 12 proven today but no history for the step chart, and names the four unproven areas only inside an Ask Madison answer.
