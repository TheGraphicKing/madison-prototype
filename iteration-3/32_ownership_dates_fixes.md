# 32 Ownership, dates, data, and fixes from the live review

## 1. Who owns what: clear everywhere (`data/ownership.json`)

- **Every obligation has five roles:**
  - accountable owner (the process owner);
  - policy owner;
  - control owner;
  - compliance reviewer (Elena Petrova);
  - approver (Anthony Marsh, the CCO).
- **A standard "Who owns this" block** appears on every obligation page, change room side panel, coverage plot panel and task drawer. Example: "Debit card disputes · Payments and card services · Margaret Ellison, Head of Payment Operations. Reviewed by Elena Petrova · Approved by Anthony Marsh".
- **Rule changes show their process area and owner** (for example, "Card and ACH disputes · Margaret Ellison").
- **Coverage gets a lens switch: State | Owner | Deadline.** "Owner" colours plots and blocks by accountable owner, with a legend of names. "Deadline" shades by days left. This answers "who owns the card disputes section at my bank?" in one click.
- **Add Hannah Cole** (Head of Retail Deposits) to `users.json` and to the persona switch.

## 2. Dates: the same four everywhere (`data/dates.json`)

- **Every rule change** shows Published, Effective, Northgate deadline (effective date minus the 30-day buffer) and Days left, in the header and the list. Overdue shows in the risk colour.
- **Obligations** show the rule's deadline in plain words ("5 business days"), plus the compliance date.
- **Tasks** show due date and relative days. **Known gaps** show their expiry.
- "Today" is 16 Oct 2026. All dates must be consistent across files.

## 3. Data hygiene

- Merge `ownership.json`, `dates.json` and `scenario_matrix.json` into the store, and type them.
- Every count must agree everywhere: the Today tiles, the lists, the My tasks filters, the rail badge, the coverage totals. Write one selector per count, and use it everywhere.
- "What changed this week" shows only changes published in the last 7 days; otherwise call it "Open rule changes".
- **No raw field names or internal ids in the UI:** "flood_zone_lending" becomes "Flood zone lending", and "RC-2026-019" becomes "12 CFR 339.3". Ids may appear only as small secondary labels.
- Use "obligation" everywhere, never "duty".

## 4. Fixes from the live review (F39), required

1. **Every 3D view:** the mouse wheel scrolls the page. Zoom needs Ctrl or Cmd plus the wheel, a pinch, or the +/- buttons.
2. **Coverage:**
   - Label every plot by regulation ("12 CFR 1005 · Reg E"), short by default and full on hover, with no collisions.
   - **The plot panel must be specific:** the top policies and controls, with counts; each obligation not covered (plain words, state, reason, owner, clickable); each known gap (who accepted it, until when, why); consequences; and the actions "Open these obligations" and "Start a fix".
3. **The record chain:**
   - Always-visible labels for run clusters and dates, and a legend.
   - Hover shows who, what and when. The latest entry is selected by default.
   - A run cluster offers "Replay this run", which opens that change map and replays it.
4. **Today:**
   - One primary action per row (the whole row opens the task).
   - Counts agree everywhere.
   - Keep the mini coverage field, using the same lens switch as Coverage.
5. **The obligation lineage:** the drift label is never clipped.
6. **Toasts** appear at the top centre and never cover a 3D scene.
7. **Typing text** always completes (no stuck "1 excluded (").
8. **The Live label** stays until a run ends.
