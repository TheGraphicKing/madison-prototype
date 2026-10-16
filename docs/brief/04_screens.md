# 04 The screens

First, read `00_brief.md`, then build the screens in this order. Each screen: one bold element, everything else quiet. Before coding each screen, write a 6-line plan (purpose, the bold element, content order, components, data, motion) and check it against the references.

## Today (`/`)

- **Purpose:** what changed, what needs me, and where we stand, in 10 seconds.
- **Layout:**
  1. **Greeting.** Display type: "Good morning, Elena". Under it, three facts, each a link, written as three short separate lines (not one run-on sentence): "3 tasks need you this week", "Next deadline: CTL-132 evidence, tomorrow", "Known gap on wire releases expires 31 Dec".
  2. **The bold element:** a wide hero card with the compact agent canvas (03 §5, card) replaying the Reg E run, with `tilt`, and the label `/ LIVE ON 12 CFR 1005.11(c)`. Clicking it opens the run.
  3. **"Needs you":** a ranked list from `tasks.json` for the current persona. Each row has the plain title, the why, due (with relative days), the change citation in mono, and one action button that opens the right flow (see My tasks).
  4. **"Where Northgate stands":** the four counts (`Count` with Magic UI `number-ticker`), then a 12-month step chart of covered duties (`StepChart`, with the newest point in `--highlight`). No percentages.
  5. **"Madison overnight":** a Magic UI `animated-list` of the audit trail entries, each with an agent or person tag.
- **Persona:** Anthony sees "Needs your sign-off" first; Priya sees the MFA gap.

## Rule changes (`/rules`)

- **Purpose:** every rule Madison has read, and what changed.
- **Layout:**
  - Title, then a segmented filter: New this week, Needs a decision, In progress, Closed, Doesn't apply.
  - A search field; filter chips for agency and effective date.
  - **The bold element:** a `DataTable` of the 9 rule changes plus the 22 watched regulations. Columns:
    - citation (mono)
    - what changed (a plain summary)
    - agency
    - effective date (with relative days)
    - the journey state as a 6-square mini step track (Applies, Duties, Linked, Covered, What's left, Close), with filled squares done
    - owner
  - A row expands inline to show the **before and after diff** of its changed sections (`rule_sections.json`): removed words struck through in `--risk`, added words underlined in `--ok`, with a "Show only changes" toggle.
  - Screened-out and uncertain rows show their reason in plain words.
- **Motion:** none beyond row expand. This is a calm, dense working screen.

## The change room (`/rules/[id]`) (build this second, after the canvas)

- **Purpose:** everything about one rule change, decision first.
- **Layout (two columns, 8 and 4 of 12):**
  1. **Header:** citation (mono), title (page title), the synthetic note where present ("Synthetic amendment for demonstration"), effective date, owner.
  2. **The bold element, "Your task now":** one panel with the decision this persona must make, the evidence beside it, and the action.
     - For RC-2026-014 in state New, it is **"Run Madison on this rule"**. This opens the canvas full-screen (`run-rule-1005`) and returns here when done, with the page updated.
     - For RC-2026-011, it is **"Choose a fix for the MFA gap"**, which starts `run-design-mfa`.
     - For RC-2026-016, it is **"Confirm 2 proposed links"**, which starts `run-coverage-1026`.
  3. **The step track:** Applies, Duties, Linked, Covered, What's left, Close (Origin UI `stepper`, restyled to squares and hairlines). Every step is clickable; finished steps show a one-line summary.
  4. **Below the step track, a stack of sections.** Finished ones collapse to one line; the current one is open (`transition-panel` between them):
     - **Applies:** the scope result, the bank facts used, and the certainty word.
     - **Duties:** a table of duties with the rule's words, plain versions and certainty. Excluded and held-back duties are shown separately, with their reasons.
     - **Linked:** each duty, its links, strength and quote. Proposed links have Confirm and Reject.
     - **Covered:** the four counts for this change.
     - **What's left:** gaps, drift (DR-031 shown as two quotes side by side, with the numbers highlighted), and tasks.
  5. **Right column:**
     - **"Who has this":** now, next and waiting on, with person tags.
     - **"What it touches"** (opens a slide-over listing duties, policy sections, procedures, controls with quiet badges, and the 3 vendors with why each is in scope).
     - **"How Madison got here"** (opens the canvas in replay).
  6. While a run is active, show the strip canvas (03 §5) at the top.

## Coverage (`/coverage`)

- **Purpose:** where the bank stands, explorable.
- **Header:** the four counts across the top, with a view switch: **Field**, Map, By rule, Documents, Calendar.
- **Field (the bold element, 3D, react-three-fiber):**
  - All 1,894 applicable duties as small tiles on an isometric plane (instanced mesh), grouped into plots by regulation. Each plot carries a mono label.
  - Tile colour is the coverage state; known gaps are raised a little; "nothing behind it" tiles sit slightly lower.
  - Orbit, zoom and pan. Hovering a plot shows its counts (Motion Primitives `spotlight` feel on the label). Clicking a plot flies the camera to it and lists its duties in a side panel. Hovering a tile shows the duty.
  - Matte, soft light, contact shadows. A 2D fallback is the Map view.
  - Generate tile positions from `position.json` (`by_regulation` counts, plus the remaining duties spread across the other regulations, so the totals match exactly).
- **Map (2D):** the same idea as a flat grid of squares per regulation, zoomable (bank, then regulation, then duty).
- **By rule:** a table of regulations with a mini stacked bar of the four counts and "Check coverage" on each row (runs `run-coverage-1026` for the Truth in Lending row; others show a short scripted check).
- **Documents:** policies and procedures as a Magic UI `file-tree` on the left, with the section text on the right. Drift badges are square markers where policy and procedure disagree (DR-029, DR-031).
- **Calendar:** a large month and quarter view of effective dates, due dates and known-gap expiries, navigable.

## Duties (`/duties`, `/duties/[id]`)

- **The register:** a `DataTable` of all duties in `duties.json`, filterable by coverage state, owner, regulation and process tag. Filters combine.
- **The duty room** (`/duties/[id]`). The bold element is a **lineage graph** (React Flow, schematic style, corner brackets): rule section, the rule's words, the duty, policy section, procedure step, control, evidence, owner and vendors.
  - Hover a node to highlight its path.
  - Below the graph: the duty's history (a timeline: proposed, reviewed, accepted, linked, with person and agent tags), its open items, and its controls' freshness (for example "CTL-132 quiet for 49 days").

## My tasks (`/tasks`)

- Grouped by Overdue, This week and Later. Each row: what to do, why, due, the change, and **one** action:
  - "Start" opens the right run or flow (`action` in `tasks.json`): run_rule, design_control, check_coverage, review_duties, answer_fact, upload_evidence, sign_off.
  - Starting a task with a run shows the strip canvas **inside the task row**, expanding into the full canvas.
- Clear and calm. This is the screen people use most.

## Reports (`/reports`, `/reports/board-pack`, `/reports/exam`)

- **Index:** two documents shown as covers (`tilt` on hover), with the as-of date and a date control (previous and next month). Small labelled summary tiles, not big cards.
- **Board pack:** reads like a bank document. A cover; then sections from `reports.json`, each with a two-line summary at the top; the four counts; the change list; the accepted gaps with expiry; "What needs the board". Print styles: margins, page numbers, header and footer, no app chrome.
- **Exam readiness:** "8 of 12 areas proven" as a 12-square grid (filled when proven), each area clickable, and a Yukon-style step chart of proven areas over time. Pressing Print gives a clean document.

## The record (`/record`)

- **Purpose:** every decision and agent run, the trail an examiner follows.
- **Layout:** a vertical timeline (Origin UI `timeline`, with an Aceternity `tracing-beam` line that fills as you scroll). Each entry has an agent or person tag, the time, the plain text, and links.
- Run entries have "Replay", which opens the canvas in `[ REPLAY ]`.
- Decisions made during the demo appear at the top, live.

## Ask Madison (global; launcher bottom right; ⌘J)

- **The launcher:** a small bracketed tab, bottom right, reading "Ask Madison". No icon.
- **The panel:** 440 px, slides from the right. Use Vercel AI Elements (`conversation`, `message`, `chain-of-thought`, `sources`, `inline-citation`), restyled, with no icons.
  - It shows 3 suggested questions for the current screen (`ask_madison.json`, by context).
  - Asking one plays its **retrieval trail** as a tiny inline flow: steps with agent tags, each with a found-count, and dots moving between them. Then the answer types in, with the certainty word and clickable citations (opening the duty, policy, vendor or change).
  - If it suggests an action, it shows a button that opens the right screen. **It never acts on its own.**
  - Free-text questions not in the script get a polite "In this prototype, try one of these", plus the suggestions.

## Acceptance for every screen

- [ ] It matches its plan; the bold element is unmistakable; generous space
- [ ] It works in all six palettes; Graphite looks best
- [ ] No icons, no emoji, no gradients; status always has a label
- [ ] Every clickable thing goes somewhere real in the prototype
- [ ] Screenshots at 1440 and 390 wide in `docs/screens/`
