# Madison clickable prototype: Claude Code prompt pack

**A standalone, frontend-only prototype** with synthetic data. No backend, no changes to the real Madison repositories. It deploys as a static site to Vercel or Netlify.

## What is in the pack

| File | What it is |
|---|---|
| `00_brief.md` | **Paste first in every session.** The product, the visual direction from Siva's references, the hard rules (no icons, no AI slop), the tech stack, and where each component comes from |
| `01_foundation.md` | Project setup, tokens, the six palettes (Graphite default), the Color switcher, type, core components, the app shell, the gallery |
| `02_data_and_player.md` | Typed data, the prototype store, and the run player that plays the scripted agent runs |
| `03_agent_canvas.md` | **The centrepiece:** "Watch Madison work", with schematic and 3D depth views, the verifier gate, person checkpoints, the hover trace, the inspector |
| `04_screens.md` | Today, Rule changes, the change room, Coverage (3D field), Duties, My tasks, Reports, the record, Ask Madison |
| `05_finish_and_deploy.md` | The senior designer critique pass, the quality floor, the 5-minute demo path, Vercel and Netlify deploy |
| `data/` | The synthetic Northgate dataset (20 files plus 3 scripted runs), shaped on Madison's real backend models. See `data/README.md` |
| `palettes.json` | The six palettes as exact tokens (Graphite, Refinery, Yukon, Lyzr, Midnight, Terminal), all contrast-checked |
| `madison_palette_preview.html` | Open it in a browser to see the Color switcher and palettes |
| `reference/` | Siva's references: the TextQL and Yukon screenshots, both videos, and frame sheets |

## How to run it in Claude Code

1. Create an empty folder. Unzip this pack inside it as `prompt-pack/`.
2. Start Claude Code in that folder.
3. **Session 1:** "Read `prompt-pack/00_brief.md`, then do `prompt-pack/01_foundation.md`." Review the `/gallery` page.
4. **Session 2:** brief, plus `02_data_and_player.md`.
5. **Session 3:** brief, plus `03_agent_canvas.md`. This is the biggest one; review it against the reference images.
6. **Sessions 4 to 6:** brief, plus `04_screens.md`, in two or three sessions: the change room and Today first, then the rest.
7. **Session 7:** brief, plus `05_finish_and_deploy.md`, then deploy.

Run one prompt per session, and look at the result before starting the next.

## Timeline to Tuesday

- **Friday and Saturday:** sessions 1 to 3 (foundation, player, canvas).
- **Sunday:** session 4 (the change room and Today), then the rest of the screens if time allows.
- **Monday:** session 7 (the critique pass and deploy), then review with Vidur and Jeremiah.
- **Tuesday:** share the link with Siva.
