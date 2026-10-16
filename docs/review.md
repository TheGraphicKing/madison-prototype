# Design review

## Phase 3: the agent canvas against the references

Screenshots: `docs/screens/phase-3/`. References: `docs/reference/textql_refinery_diagram.png`, `docs/reference/yukon_agents_verifier.png`.

| Reference | What it does | Ours | Honest verdict |
|---|---|---|---|
| TextQL nodes | Flat panels, corner brackets, a title, one mono subtitle, generous air | Same grammar: 10 px brackets, ink when live or done, hairline when waiting, mono subtitle with the stage's real detail | At their level for single nodes. Ours carry more inside (agent tags, held items), so the field is denser than TextQL's |
| TextQL connectors and ports | 1 px curves, small square ports exactly on edges, square packets | Every connector is a 1 px curve; a port is drawn at both ends of every path, so ports always sit exactly on edges; one packet per item event | Matches. Hop-over arcs between non-neighbour stages read well |
| TextQL write-back | One long arc from the end back to the start, labelled in mono | The arc sweeps from "What it touches" under the sources and up the left edge into "The record", labelled `/ WRITTEN TO THE RECORD · 27 ENTRIES` (counted from the script). On the coverage run it crosses the whole top of the canvas | Matches the idea; on the Reg E run the arc is shorter than TextQL's because the flow already ends on the left |
| TextQL outputs | Cards that type in with a caret | Same, driven by the player clock so seeking is exact; text keeps typing on the wall clock when the run pauses | Matches |
| TextQL observability strip | Thin mono strip, sparkline | Phase strip, rolling metrics, typed narration (also the aria-live region) | Matches; ours is more useful (it narrates) |
| Yukon agent column | Rows that fill lime when they submit, fan-in lines with dots | Rows fill with the highlight while their stage runs; activity meters grow with events; fan-in lines with moving dots run behind the canvas into the stage | Matches. Our lines are longer because stages sit across two lanes |
| Yukon verifier | Box that fills while checking, verified and rejected outlets | Gate fills from the quote check to the reviewer's verdict for each duty, a cell per verdict, check and cross strokes with counts, held-back tray with the reason | Matches, and explains more |
| Yukon step chart | Ringed points, step line, "new best" pill in lime | Ringed points, step line, a "Latest" pill in the highlight, newest point filled | Matches |

### Three things raised after the first comparison (all done)

1. **Too much boxing.** Empty trays were full hairline boxes, which made the lower lane look like a form. Empty trays are now a dashed hairline; they become a surface only when something lands in them.
2. **Fan-in lines competed with the schematic.** They drew on top of nodes at 55% ink. They now draw behind the canvas at 35%, so they read in the gaps and disappear under nodes, as Yukon's do.
3. **Crowded node footers.** Agent ids and held-item squares fought for the same 168 units. When a node holds items, its agent tags drop the id (the inspector and expanded view still show it).

Other fixes found by looking at the screenshots: the schematic was scaled to 76% (labels near 7 px), so the design width went from 1000 to 900 units and node type grew; the last packet of a run never landed because the run ended mid-hop; outputs and narration froze mid-word whenever the clock stopped; the build-in animation's fill mode pinned opacity at 1, which broke the hover dimming; the lineage walk leaked into sibling duties through vendors.

### Still below the references

- TextQL leaves much more empty ground. Our canvas carries trays under three stages; a future pass could fold trays into the expanded view.
- The depth view is legible and interactive, but its labels are HTML overlays that can overlap at steep angles.
- Frame rate was checked in headless Chromium only (smooth at 4x). The runs never put more than about a dozen packets in flight at once, so the 50-packet case is untested on a real laptop.

## Phase 5: the senior designer pass

Every screen was screenshotted at 1440 in Graphite (`docs/screens/phase-4/`, `docs/screens/demo/`) and checked against the list in `05_finish_and_deploy.md`.

| Check | Before | After |
|---|---|---|
| One bold element | Rule changes used the highlight on every row's current step, so the table competed with itself | Journey squares are ink only; the highlight is kept for live and new things |
| One accent action per view | My tasks showed a black primary button on every row | Only the first open task is primary; the rest are quiet |
| Colour without a label | All states carry a square and a word; mini bars carry an accessible label with the four counts | Unchanged |
| Hairlines, brackets, ports | Ports are drawn at both ends of every path, so they always sit on edges; brackets are 10 px everywhere (14 px on the task panel) | Unchanged |
| Words | "Overdue, due tomorrow" contradicted itself; stage titles ending in a question read "Applies?: Applies" in the record | "Overdue · deadline tomorrow"; "Does it apply to Northgate? Applies · Clear" |
| Motion | The canvas builds itself once per mount; the hero card rebuilds each loop; everything else answers a click or a run event | Unchanged |
| Responsive (390) | Rule changes, By rule, the board pack and the gallery scrolled sideways; Today's task rows squeezed their buttons; the hero schematic was unreadable on phones | Tables and segmented controls scroll in their own box; buttons sit under the text; phones get the strip instead of the card; no page scrolls sideways |
| Reliability | A full page reload reset the demo: a child set state before the session store rehydrated and overwrote it | The store rehydrates in a layout effect, before any child's effects |

### Quality floor

- **Lighthouse** (mobile preset, served with compression, as on Vercel or Netlify): Today 93, change room 92, canvas 91, duty room 90, record 93, coverage 88 (mobile opens on the 2D map with 1,894 squares; the desktop preset with the 3D field scores 100). Accessibility 100 on every page measured. Without compression (`python -m http.server`) scores drop to 58 to 76, so deploy behind a CDN.
- **Keyboard:** every control is a real button, link, radio or tab; focus is a 2 px `--focus` ring with a 2 px offset; the canvas takes Space, the arrow keys, Home and Escape; stage nodes and held items are focusable; menus take the arrow keys, Enter and Escape.
- **Reduced motion:** no packets move (items land instantly), typing is skipped, the build-in is skipped; the narration still reads.
- **3D:** both 3D views fall back to 2D when WebGL is missing. Smooth in headless Chromium; not measured on a real laptop GPU.
- **Console:** no errors through the whole demo path (`scripts/scenario.mjs` reports console errors and page errors).
