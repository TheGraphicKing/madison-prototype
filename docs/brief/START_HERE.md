# Start here: the master prompt for one Claude Code session

You are building the **Madison clickable prototype**. Everything you need is in the `prompt-pack/` folder next to this file. Read the files yourself; do not ask me to paste anything.

## Ground rules

- Build a **new, standalone, frontend-only** project in the current folder (the repository root), with synthetic data and a static export.
- Do not connect to, copy from or change any other repository or backend. Do not use the "lyzr-brand-guardian" skill.
- Follow the prompt-pack files exactly. If two files disagree, `00_brief.md` wins; otherwise the more specific file wins.

## Step 1: Read everything, in this order, before writing any code

1. `prompt-pack/README.md`
2. `prompt-pack/00_brief.md`
3. `prompt-pack/01_foundation.md`
4. `prompt-pack/02_data_and_player.md`
5. `prompt-pack/03_agent_canvas.md`
6. `prompt-pack/04_screens.md`
7. `prompt-pack/05_finish_and_deploy.md`
8. `prompt-pack/data/README.md`, then open every JSON file in `prompt-pack/data/` and `prompt-pack/data/runs/`
9. `prompt-pack/palettes.json`, and `prompt-pack/madison_palette_preview.html` (to see the Color switcher behaviour)
10. Every image in `prompt-pack/reference/`. If `ffmpeg` is available, extract a frame every second from both `.mp4` files into `docs/reference/frames/` and study how things move: packets on lines, typing outputs, the verifier filling, rows lighting up, the diagram building itself.

## Step 2: Write the plan before writing code

Create `docs/PLAN.md`, containing:

1. **Your understanding,** in your own words: what Madison is, who sees this prototype, and exactly what you will take from TextQL, Yukon and the Transformer Explainer.
2. **The design plan:**
   - how each palette token is used, with Graphite as the default;
   - the type scale;
   - the mark vocabulary (squares, dots, hairlines, corner brackets; **no icons**);
   - the grid and spacing;
   - the one bold element on each screen.

   Then review this plan against the "no AI slop" rules in `00_brief.md`. If any part reads as a generic default, revise it, and write down what you changed.
3. **The phases below,** each with its tasks, the files it creates, and its acceptance checks, copied from the prompt files.
4. **The component sourcing list:** library, install command, and what you will change in each. Note that 21st.dev's free plan allows only 2 installs a day, so install from each library's own free registry.
5. **Risks and fallbacks:**
   - The Satoshi download fails: use Inter Tight and note it.
   - WebGL is unavailable: show the 2D fallback.
   - Static export with dynamic routes: use `generateStaticParams`.
   - Check the installed Next.js docs before using any API.

Also create `docs/PROGRESS.md`, a checklist of every phase and task. Update it at the end of every phase. If this conversation gets long or is compacted, re-read `docs/PLAN.md` and `docs/PROGRESS.md` before doing anything else, and continue from the first unchecked item.

## Step 3: Build in phases

Never start a phase until the previous one passes its checks. At the start of each phase, re-read its prompt file.

| Phase | What | Source |
|---|---|---|
| 0 Setup | `git init`; the project scaffold; copy `data/`, `palettes.json` and `reference/` into the project; a first commit | `01_foundation.md` §1 |
| 1 Foundation | Tokens, the six palettes (Graphite default), the Color switcher, fonts, the core components (Bracket, Port, Packet, labels, chips, buttons, table, panels, Typed, StepChart), the app shell (rail, header, persona switch), and `/gallery` | `01_foundation.md` |
| 2 Data and player | Types, getters, the prototype store with "Reset demo", the run player (pure derivation, person pauses, seek, speed), and Vitest tests | `02_data_and_player.md` |
| 3 Agent canvas | Schematic layout (agents column, sources, two lanes, verifier gate, person node, outputs with typing, step chart, bottom strip, write-back arc, build-in), then hover trace, expand in place, the inspector, the compact strip and card, and last the 3D depth view | `03_agent_canvas.md` |
| 4 Screens | In this order: change room, Today, Rule changes (with the diff), My tasks, Coverage (the 3D field first, then map, by rule, documents, calendar), Duties and the duty room, Reports, the record, Ask Madison | `04_screens.md` |
| 5 Finish | The senior designer pass, the quality floor, the 5-minute demo path working end to end, `docs/DEMO.md` | `05_finish_and_deploy.md` |
| 6 Ship | The repository README, `.gitignore`, `netlify.toml`, the GitHub repository, and the deploy | Step 4 below |

**At the end of every phase:**

1. `npm run build` passes and `npm test` passes.
2. Take Playwright screenshots (install it if needed) of everything the phase built, at 1440 and 390 wide, into `docs/screens/phase-<n>/`. **Look at them yourself** and fix anything that falls short of the brief. For the canvas, compare it side by side with `reference/textql_refinery_diagram.png` and `reference/yukon_agents_verifier.png`, and keep refining until the craft is at their level.
3. Search the code for anything forbidden, and fix every hit:
   - `lucide`, any icon import;
   - emoji;
   - `gradient`, `backdrop-filter`, `blur(`;
   - a percentage shown for coverage.
4. Commit with the message `phase <n>: <what was built>`, tick it off in `docs/PROGRESS.md`, and print a 5-line status to me.

**Working rules:**

- Use only the synthetic data. Never invent numbers inside components.
- Quality over speed. If something looks generic or like a template, redo it before moving on.
- Do not stop to ask me unless you are truly blocked, for example GitHub login or a download that fails twice. Otherwise decide, write the decision in `docs/PLAN.md`, and continue.

## Step 4: GitHub and deploy

1. Write a root `README.md`: what the prototype is, how to run it (`npm install`, `npm run dev`), how to deploy, and the demo path.
2. If the GitHub CLI is installed and logged in, run `gh repo create madison-prototype --private --source=. --push`. If not, stop and give me the exact commands to run.
3. If the Vercel CLI is logged in, run `vercel --prod` and give me the URL. Otherwise give me the Netlify and Vercel steps from `05_finish_and_deploy.md`.

## When you finish

Give me:
- the GitHub link;
- the deploy URL, if there is one;
- what is done;
- anything left or simplified, and why;
- the demo path, in 9 steps.
