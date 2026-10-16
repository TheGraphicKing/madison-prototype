# Synthetic data: Northgate Community Bank

Everything is invented, but the shapes and field names follow Madison's real backend models (obligations, coverage links, policy sections, controls, exceptions, drift flags, proposals, agent runs). "Today" is 16 October 2026.

| File | What it is | Notes |
|---|---|---|
| `institution.json` | The bank profile: charter, regulator, size, states, product flags | Product flags drive scope. For example, `prepaid_cards: false` screens out 1005.18. `flood_zone_lending: null` makes 339.3 uncertain |
| `users.json` | 9 people | Elena Petrova is the current user. Anthony Marsh is the CCO |
| `agents.json` | Madison's agents: id, plain name, job, model or code, hue | Use the plain name on screen and the id as a small mono label |
| `regulations.json` | 22 regulations Madison watches, with the latest check | Feeds the Rule changes inventory |
| `rule_changes.json` | 9 rule changes, one per journey state | States: new, applies, uncertain, screened_out, duties, linked, whats_left, closed. `after_run` holds what a change looks like once its run finishes |
| `rule_sections.json` | Section text before and after, for the diff view | |
| `duties.json` | 20 duties: the rule's words, a plain version, actor, action, deadline, certainty, coverage state, owner and process tags | |
| `policy_sections.json`, `procedure_sections.json`, `controls.json` | The bank's documents and controls | Controls have cadence, last evidence, freshness and quiet days |
| `coverage_links.json` | The links from duty to policy and duty to control | Strength, quote, proposed or confirmed, who decided and when |
| `known_gaps.json`, `drift_flags.json` | Accepted gaps, and policy-versus-procedure disagreements | |
| `vendors.json`, `impacts.json` | Vendors with service process tags, and what the Reg E change touches | |
| `tasks.json` | Tasks for the "My tasks" list; `action` says which run or flow each one opens | |
| `position.json` | The four counts, 12 months of history, and counts per regulation | Covered 1,721 · not yet confirmed 121 · nothing behind 43 · known gaps 9 · total 1,894 |
| `reports.json` | Board pack sections and exam readiness (8 of 12 areas proven) | |
| `audit_trail.json` | The record: agent and person events | |
| `ask_madison.json` | Scripted questions, answers, citations and retrieval trails | |
| `runs/*.json` | Three scripted agent runs (see `02_data_and_player.md`) | |

**The three runs:**

1. **`run-rule-1005`** (about 31 seconds). Reads the synthetic Reg E amendment from start to finish.
   - 14 sections are read and 8 duties proposed; the reviewer agent holds back 1 (D-1005-Z9, which is not in `duties.json` on purpose).
   - The run pauses for Elena to accept the duties.
   - Coverage ends at 4 covered, 1 not yet confirmed and 1 nothing behind it, with one drift.
   - It touches 3 vendors.
2. **`run-coverage-1026`** (about 5 seconds). Checks coverage for a revised Loan Estimate duty, finds the procedure says 5 days, and pauses for Elena.
3. **`run-design-mfa`** (about 14 seconds). Designs CTL-153 for the MFA gap.
   - The seven design checks run, and D6 comes back "can't tell".
   - It pauses for Priya to answer, then for Anthony to sign off.
   - Then it re-checks coverage and hands off 3 vendor reviews and a test plan change.
