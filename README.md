# Madison: clickable prototype

A standalone, frontend-only prototype of **Madison**, Lyzr's agentic compliance workbench for US banks. Every screen runs on synthetic data for a fictional bank (Northgate Community Bank), and every click works: scripted agent runs play back live, pause where a named person must decide, and write what happened to the record.

There is no backend and no API call. It exports to static files.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Static export to `out/` |
| `npm test` | Vitest: the run player's derivation, the coverage field totals, the hover-trace lineage |
| `npm run check` | Searches the source for icon libraries, emoji, gradients, blur and coverage percentages |
| `npm run palettes` | Regenerates `src/theme/palettes.css` from `src/theme/palettes.json` |

## Deploy

Live: https://madison-prototype-2.vercel.app (Vercel project `madison-prototype-2`).


**Vercel:** `npx vercel --prod` (the framework is detected; the static export works), or import the repository at vercel.com/new.

**Netlify:** `netlify.toml` is included (`npm run build`, publish `out`). Run `npx netlify-cli deploy --prod --dir=out`, or connect the repository.

Pages carry `robots: noindex`. Keep the URL private.

## The 5-minute demo

1. Today, as Elena: the hero card replays the Reg E run. Point at "Needs you".
2. Open the Reg E task, press **Run Madison on this rule**, watch the canvas, press **Accept 6 duties and exclude 1**.
3. Hover D-1005-E2 to trace its lineage; click it to open the inspector.
4. Back in the change room: What's left shows the gap and the drift; open What it touches (3 vendors).
5. Switch to Priya, choose a fix for the MFA gap, answer D6, continue as Anthony and sign off. CTL-153 goes into force.
6. Coverage, Field view: orbit the 1,894 duties, click the Regulation E plot.
7. Ask Madison: "Which Regulation E duties have nothing behind them?"
8. The record: every decision with names and times. Replay a run.
9. Change the Color; end on Graphite.

Full script: `docs/DEMO.md`. **Reset demo** (rail footer) clears the session.

## What is where

| Path | |
|---|---|
| `src/data/` | The synthetic dataset and three scripted runs, typed in `types.ts`, read through `index.ts` |
| `src/lib/player/` | The run player: state is a pure function of (events, time, responses); one rAF engine for every playing run |
| `src/lib/store.ts` | Prototype state (persona, decisions, record, finished runs), kept in `sessionStorage` |
| `src/components/canvas/` | "Watch Madison work": schematic, verifier gate, person checkpoints, hover trace, inspector, depth view, strip and card |
| `src/components/core/` | Design system: brackets, ports, packets, labels, chips, certainty, tags, buttons, data table, overlays, charts |
| `/gallery` | Every token, type style and component, with the Color switcher |
| `docs/` | Plan, progress, design review, screen plans, components and licences, the demo, screenshots |

Stack: Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS 4, motion, React Flow, d3, react-three-fiber and drei, zustand, TanStack Table. Type: Satoshi and JetBrains Mono.
