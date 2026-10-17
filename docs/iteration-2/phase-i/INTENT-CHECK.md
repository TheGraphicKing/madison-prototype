# Screen intent check (21_screen_intents.md)

Each screen against its intent test, with the evidence screenshot.

| Screen | The intent test | Result | Evidence |
|---|---|---|---|
| Today | A new analyst knows their first action within 5 seconds | Pass. "Needs you" is the bold tile, and the first row is the top task with one primary button | phase-e/today-* |
| Rule changes | Find everything new this week that applies, in one click | Pass. The "New, applies" filter does it in one click | phase-e/rules-* |
| Change room | The CCO can sign, or see why they can't, without leaving the page | Pass. "Your task now" shows the sign-off, or the blocker with who it waits on | phase-d/rules_RC-2026-011-*, loops/16-*, loops/19-* |
| Run view | Someone new can explain what happened after one viewing | Pass. "What Madison found" answers the five questions in plain words. The Simple view holds the plain step list, and the Agent view (added later by F37 and F38) shows the live system. Metrics, costs and agent ids are gone | f38/rule-*-3d-*, f38/rule-*-2d-* |
| Coverage | Name the riskiest gap and who owns it within 10 seconds | Pass. Click the Regulation E plot: "What isn't covered" names the provisional credit obligation and its owner, and "What it means" gives the exam risk as a word | phase-f/coverage_view_field_plot_reg-01-* |
| Obligations | Find an obligation, then see what stands behind it | Pass. Search plus four filter popovers in one row; the page opens on the lineage stack | phase-g/* |
| My tasks | Each row says what, from whom, why, when, state and one action; blocked rows say what they wait on | Pass | phase-h/tasks-* |
| Reports | Conclusions first; how it was built; approve or comment without leaving | Pass | phase-h/reports_* |
| The record | Follow the trail: who, when, what it refers to, signed or not | Pass. Chain and List, with entry detail and Replay this run | phase-h/record-* |
