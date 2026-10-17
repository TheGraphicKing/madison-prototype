# F42 bug sweep

The sweep covered every route, clicking through each one at 1470x704 and 1440x900 for all eight personas (`scripts/click-crawl.mjs`, `scripts/crawl-all.sh`). It also screenshotted 8 routes in Graphite light, Graphite dark and Harbor light (`f42/themes/`) and ran a text scan for internal ids, capitals and repeated-command toasts (`scripts/scan-text.mjs`).

The before screenshots are in `f42/bugs/` and the after screenshots in `f42/bugs-after/`.

| # | Bug | Before | After | Fix |
|---|-----|--------|-------|-----|
| 1 | Change map clipped at 1280x720: Close and the plot fell off the right edge, and labels overlapped the source stacks | `bugs/01-before-map-framing.png` | `bugs-after/rules_RC-2026-014-u-elena-graphite-light-1280x720.png`, `f42/rules_*-1470x704.png` | Box-fit camera (`fitMode="box"`), a tighter layout, source labels anchored left, and platform notes hidden on narrow canvases unless the platform is active |
| 2 | Map labels in capitals ("41 IN SCOPE") | `bugs/02-before-map-capitals.png` | `bugs-after/rules_RC-2026-014-…-1470x704.png` | Plain small text, sentence case ("41 in scope") |
| 3 | Obligation lineage drawn as stacked planes, with the header leaving an empty area | `bugs/03-before-lineage-stack.png` | `bugs-after/obligations_D-1005-E2-…-1470x704.png` | A left-to-right chain of six platforms with the drift break label, a dashed "Nothing here" step, and a three-column header; tabs and the chain sit above the fold |
| 4 | Closed change (RC-2026-009): the plot label was clipped, and the Close count disagreed with the obligation count | `bugs/04-before-plot-label-and-close-count.png` | `bugs-after/rules_RC-2026-009-…-1470x704.png` | The plot label uses its short citation; the Close count uses the larger of the listed and counted obligations, and a closed change counts as all done ("4 of 4") |
| 5 | Record and task text showed internal ids ("drift DR-031", "known gap KG-007") | `bugs/05-before-record-internal-id.png` | `bugs-after/record_view_list-…-1470x704.png` | Plain words: "Drift: <summary>", "The known gap on record"; scan-text now fails on `DR-/KG-/H-/T-/LNK-/E-` ids |
| 6 | Obligation breadcrumb showed the id (D-1005-E2) | `bugs/06-before-obligation-crumb-id.png` | `bugs-after/obligations_D-1005-E2-…-1470x704.png` | The crumb shows the citation, and the first crumb returns to where you came from |
| 7 | Demo guide overlay covered the page | `bugs/07-before-guide-overlay.png` | `bugs-after/today-u-elena-graphite-light-1470x704.png` | Demo hub and coach shown only with `?presenter=1` |
| 8 | Toasts repeated the command ("Update the procedure") | not shot | n/a | Toasts use the past tense (`pastTense`: "Updated the procedure") |
| 9 | Drift pair and document links used internal wording | not shot | n/a | "Drift · policy and procedure disagree", "Open the obligation: …" |

## Crawl results (`f42/crawl/*.txt`)

- 16 passes (2 sizes × 8 personas), with 593 to 618 clicks each and **0 console errors in every pass**.
- Each pass logged 4 dead clicks, or 22 when it ran alongside another pass, all of them on Today:
  - "Reset demo", "Collapse", "Viewing as" and "Color", which open dialogs or change state without changing the DOM text the crawler watches;
  - Elena's task rows, under load.

  Clicking each one by hand confirmed that it works: the DOM changed, or the dialog opened. They are artifacts of the crawler, not bugs.
- Every internal link was checked against the built `out/` pages, and none was broken.

## Themes

Every 3D view (change map, lineage chain, coverage field, record chain) is framed, scroll-safe and readable in all three themes; see `f42/themes/`.

## Not changed

- Hannah Cole has no tasks in the data, so her Today shows the empty state.
