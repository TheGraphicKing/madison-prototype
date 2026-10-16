# Screen plans (written before each screen was built)

Each plan: purpose · bold element · content order · components · data · motion.

## Change room `/rules/[id]`
1. Purpose: everything about one rule change, decision first.
2. Bold element: "Your task now", a bracketed panel with the one decision, its evidence beside it and the primary action.
3. Order: header (citation, title, synthetic note, effective date, owner) · task now · six-square step track · stacked sections (Applies, Duties, Linked, Covered, What's left) · right column (Who has this, What it touches, How Madison got here).
4. Components: Bracket, StepTrack, Panel, DataTable rows, StatusChip, CertaintyWord, PersonTag, SlideOver, RunStrip, TransitionPanel.
5. Data: rule_changes (+ store overrides after runs), duties, coverage_links, drift_flags, impacts, vendors, controls, rule_sections, runs (held-back and scope results).
6. Motion: only the open section's height and the strip while a run is active.

## Today `/`
1. Purpose: what changed, what needs me, where we stand, in 10 seconds.
2. Bold element: the wide hero card replaying the Reg E run, with tilt.
3. Order: greeting and three fact lines · hero card · Needs you · Where Northgate stands (four counts + 12-month step chart) · Madison overnight feed.
4. Components: RunCard, Count (number ticker), StepChart, AnimatedList, AgentTag, PersonTag, Button.
5. Data: tasks (by persona), controls, known_gaps, position, audit_trail, store record.
6. Motion: the card's looped replay; counts tick once; feed entries open one by one.

## Rule changes `/rules`
1. Purpose: every rule Madison has read, and what changed.
2. Bold element: the table with a 6-square journey track per row, expanding to the before/after diff.
3. Order: title · segmented filter · search and chips · table (9 changes, then 22 watched regulations).
4. Components: Segmented, DataTable, JourneyTrack, Diff, Chip.
5. Data: rule_changes, regulations, rule_sections, users.
6. Motion: row expand only.

## My tasks `/tasks`
1. Purpose: what I have to do, calmly.
2. Bold element: the Overdue group, set apart with its count.
3. Order: Overdue · This week · Later; each row what, why, due, change, one action.
4. Components: TaskRow, RunStrip inside the row, Button.
5. Data: tasks (by persona), rule_changes, controls, store tasksDone.
6. Motion: a started run's strip opens inside the row.

## Coverage `/coverage`
1. Purpose: where the bank stands, explorable.
2. Bold element: the 3D field of 1,894 duty tiles.
3. Order: four counts · view switch (Field, Map, By rule, Documents, Calendar) · the view.
4. Components: react-three-fiber instanced tiles, Map grid, DataTable with stacked bars, FileTree, Calendar.
5. Data: position (counts, by_regulation), regulations, policy and procedure sections, drift_flags, rule_changes, tasks, known_gaps.
6. Motion: camera fly-to on plot click; idle orbit drift stops on interaction.

## Duties `/duties`, `/duties/[id]`
1. Purpose: the register of duties, and one duty's whole lineage.
2. Bold element: the register table; in the duty room, the lineage graph.
3. Order: filters · table. Duty room: header · lineage graph · history timeline · open items · control freshness.
4. Components: DataTable, filter chips, React Flow with bracketed nodes, timeline.
5. Data: duties, coverage_links, policy/procedure sections, controls, vendors, drift, gaps, audit trail and store record.
6. Motion: hover highlights a path.

## Reports
1. Purpose: documents for the board and the examiner.
2. Bold element: two covers on the index; the 12-square grid on exam readiness.
3. Order: index covers with as-of control · board pack sections · exam grid and step chart.
4. Components: Tilt, Count, StepChart, print styles.
5. Data: reports, position, rule_changes, known_gaps.
6. Motion: tilt on hover only.

## The record `/record`
1. Purpose: every decision and agent run, the examiner's trail.
2. Bold element: the timeline line that fills as you scroll.
3. Order: filters · live decisions from this demo · the record.
4. Components: timeline, tracing beam, AgentTag, PersonTag.
5. Data: audit_trail plus store record and decisions.
6. Motion: the beam fill on scroll.

## Ask Madison
1. Purpose: answers from the bank's record, with citations.
2. Bold element: the inline retrieval trail.
3. Order: suggestions for this screen · question · trail · typed answer with certainty and citations · suggested action.
4. Components: conversation, message, chain of thought, sources, inline citation (AI Elements structure, rebuilt without icons).
5. Data: ask_madison.
6. Motion: dots move between trail steps; the answer types in.
