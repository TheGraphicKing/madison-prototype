# 00 Brief: read this first, in every Claude Code session

## What you are building

A **standalone, clickable frontend prototype** of Madison, Lyzr's agentic compliance workbench for US banks. It must look and behave like a real, shipped, next-generation product: never like a prototype, a template or a demo.

- **A brand new project.** It is not connected to any existing repository or backend. No API calls and no servers.
- **All data is synthetic**, from the JSON files in `data/`. They mirror Madison's real data model, so every screen shows realistic content.
- **Every click works.** Scripted agent runs play back with live motion, and pause where a person must decide.
- **Deploys as a static site** to Vercel or Netlify, from one command.

The audience is Lyzr's CEO, the head of product, and bank executives in demos. The bar is a senior product designer with 15 to 20 years of experience: rich, illustrative, diagrammatic, calm, precise, with generous space.

## What Madison does, in one minute

When a regulator changes a rule, a bank must work out:

1. **Does it apply to us?**
2. **What does it ask us to do?** These are the duties.
3. **Are we covered?** Is there a policy, a procedure and a control behind each duty?
4. **What's left to fix?**
5. **Can we prove it?**

Madison's agents read, match, check and draft. **A named person decides every step that matters.** Everything is recorded.

The interface must make the agents' work **visible and believable**: you can watch items flow between agents, see a reviewer agent hold one back, see the flow wait for a person, and click into any step to see exactly what was read and why.

## The visual direction (study `reference/` before designing)

Siva sent two references. Both are in `reference/`, with the original videos and frame sheets. Take their **visual language**, not their content.

**1. TextQL "Refinery"** (`textql_refinery_diagram.png`, `textql_motion.mp4`)
- A schematic system diagram on a warm light grey ground.
- Nodes are flat panels with **corner-bracket frames** (L-shaped marks at the corners, not full boxes).
- **Hairline connectors** curve between nodes, with small **square ports** where lines meet nodes.
- **Small square packets** travel along the lines.
- Tiny **monospace capital labels** with a slash prefix (`/ READ IN PLACE`, `/ 5 AGENTS · 14 QUERIES · EVERY STEP LOGGED`).
- Output cards on the right **type their text in, with a caret**.
- A long arc connects the end of the flow back to the start (the write-back).
- The diagram **builds itself in sequence** when it first appears.
- A thin observability strip runs along the bottom, with a sparkline.

**2. Yukon "Open frontier research"** (`yukon_agents_verifier.png`, `yukon_motion.mp4`)
- Paper white with deep indigo hairlines and a single **lime highlight**.
- A list of agents on the left. Each row lights up (lime fill) when it submits; fan-in lines carry dots into a central **Verifier** box, which fills while it checks.
- Verified results become ringed points on a **step chart** of progress; a "new best" pill marks the latest.
- A phase strip along the bottom (Iterate, then Verify, then Promote) shows where the loop is.
- On the right, a list of challenges with tiny step-sparklines.

**What to take from both:**
- One flow, readable left to right.
- Hairlines, not heavy boxes.
- Squares and dots as the only marks.
- A small mono label vocabulary used with discipline.
- One accent plus one highlight colour.
- Motion that **is** the information: packets, fills, typing, steps.
- Lots of space.

**3. The Transformer Explainer** (poloclub.github.io/transformer-explainer)
- **Expand any stage in place** to see its sub-steps, with smooth transitions between overview and detail.
- **Hover one item to light up its whole path** and dim the rest.
- Real values everywhere.

## Hard rules

1. **No icons. Anywhere.**
   - No icon library (remove `lucide-react` if shadcn adds it), no pictograms, no emoji, no logos inside nodes.
   - The only marks allowed are geometric, drawn in SVG or CSS: squares (filled or hollow), dots, rings, hairlines, corner brackets, chevrons drawn as two strokes, a caret, and a checkmark or cross drawn as strokes inside a verification result only.
   - Text labels do the rest.
2. **No AI slop.** Never use:
   - purple-to-blue gradients, glow blobs, glassmorphism, neon borders;
   - sparkles, "magic" wands, robots;
   - a gradient on headings;
   - identical rounded cards with the same soft shadow;
   - hero sections with a big number and gradient;
   - fade-and-slide on every section;
   - "AI-powered" copy;
   - rainbow beams.

   Every effect library below is used **restyled to the palette tokens**: flat colour, hairline, square packets.
3. **No percentages for coverage.** Use the four counts (covered, not yet confirmed, nothing behind it, known gaps), which always add up.
4. **Certainty is a word:** Clear, Likely or Unsure. Never a number.
5. **Status is never colour alone.** A label always accompanies it.
6. **A person decides.** Agent output looks like a proposal until a named person accepts it; then it shows the name and the time.
7. **Plain, active, sentence-case words.** A button says what happens ("Accept 6 duties"). Agent ids such as RC-03 appear only as small mono labels beside a plain name ("Duty finder").
8. **Depth and 3D are welcome where they explain.**
   - A 3D coverage field, and an isometric depth view of the agent flow.
   - Light, layered surfaces and parallax.
   - Matte materials, soft light, no chrome or glossy reflections.
   - 3D must stay legible, be interactive (orbit, zoom, hover), and run at 60 fps.

## Tech stack (the most modern, static-exportable)

- **Next.js** (latest stable, App Router), **React 19**, **TypeScript** in strict mode.
  - `output: 'export'`, so it deploys as static files to Vercel or Netlify.
  - Use `generateStaticParams` for every dynamic route.
  - Check the installed Next.js docs in `node_modules/next/dist/docs/` for current APIs: `params` is a Promise in recent versions.
- **Tailwind CSS 4**, with CSS variables for every token. **shadcn/ui** for primitives, restyled, with icons removed.
- **motion** (`motion/react`) for all transitions and layout animation.
- **@xyflow/react** (React Flow) for node and edge diagrams.
- **d3-scale**, **d3-shape** and **d3-interpolate** for chart and path maths. React renders the SVG.
- **@react-three/fiber** and **@react-three/drei** for the 3D views. Use instanced meshes, an orthographic camera and soft shadows.
- **zustand** for prototype state: the palette, decisions made, run playback, the current persona.
- **@tanstack/react-table** for data tables.
- **Fonts:**
  - Satoshi, from Fontshare, free for commercial use, self-hosted with `next/font/local`, for all text.
  - JetBrains Mono, through `next/font/google`, for labels, ids, citations and numbers in tables. JetBrains Mono is the Lyzr brand's mono.

Do **not** use the "lyzr-brand-guardian" skill or its brown "Ferra" palette. It is out of date.

## Where components come from (free sources first)

21st.dev's free plan allows only **2 installs per day**. So install from each library's own free registry, and use 21st.dev to browse, preview and compare. Use the 21st MCP only if a paid Builder plan is available. Restyle every component to the tokens, and strip every icon.

| Library | Free install | Use these |
|---|---|---|
| React Flow UI | `npx shadcn@latest add https://ui.reactflow.dev/<name>` | `animated-svg-edge` (square packets along an edge: the TextQL effect), `base-node`, `node-status-indicator`, `zoom-slider` (check the exact names on reactflow.dev/ui) |
| Magic UI | `npx shadcn@latest add "https://magicui.design/r/<name>.json"` | `animated-beam` (packets between DOM nodes on Home), `number-ticker` (the four counts), `typing-animation` (output cards and narration), `animated-list` (the live activity feed), `dot-pattern` and `grid-pattern` (faint canvas grounds), `file-tree` (the documents tree) |
| Motion Primitives | `npx motion-primitives@latest add <name>` | `text-shimmer` (the label of whatever is running), `text-scramble` (ids and citations resolving when found), `text-roll` (counts changing), `transition-panel` (switching steps in the change room), `border-trail` (a running node's edge), `tilt` (subtle 3D tilt on the hero flow card and report cover), `spotlight` (hover on the coverage map) |
| Vercel AI Elements | `npx ai-elements@latest add <name>` | `conversation`, `message`, `chain-of-thought`, `sources`, `inline-citation`, `task` (inside Ask Madison, restyled, no icons) |
| Origin UI (originui.com, also on 21st.dev) | copy from the site | `stepper` (the change room steps), `timeline` (the record), date and segmented inputs |
| Aceternity UI (ui.aceternity.com) | copy from the site | `tracing-beam` only (the scroll line beside the replay narrative). Nothing else from it: most of it is too decorative |
| 21st.dev | browse `21st.dev/community/components/s/<tag>` | Inspiration and comparison for tables, AI chat, dashboards and text animation. Install Animated Beams by Yad Hakim (auto paths between elements) through the 21st MCP if a key is available |

Write `docs/COMPONENTS.md`, listing every component you installed: its source, licence and every change you made to it.
