# F37 Agent view: an honest critique against the references

References: `prompt-pack/reference/yukon_agents_verifier.png` and `textql_refinery_diagram.png`.

## What works
- **Three zones, one job each.** The team is on the left, the flow in the centre and the answers on the right. The right zone answers "Does it apply? What did it find? What must I do?" in plain words, so a first-time viewer gets them without reading the flow.
- **The packets are real.** They come from the run's own items in flight, not decoration.
- **The gate bar** fills cell by cell, and the held-back item shows its reason.
- **The decision overlay** reuses the shared Decision panel.

## Where it falls short of the references
- **It reads like a generic card grid.** Uniform white cards with a check circle, "01" and "Done" on each one look like a SaaS dashboard. Yukon and TextQL feel like a *system*: sources visibly feed the work, and lines carry meaning.
- **The team is disconnected from the flow.** Yukon draws every agent's line into the verifier. Here the link is only the chips inside each card.
- **There are no sources.** eCFR, the bank profile, policies and controls never appear, so the "inputs to outputs" story is lost.
- **Labels are truncated** (the folded team rows, the result lines).
- **There is a lot of empty canvas** under the second row.
- **Large rounded cards repeat** the same shape eight times. The flow is a grid, not a path.

## Next
The user's F38 direction answers all of these: one shared 3D scene kit, sources as stacks, steps as platforms, obligations as the same blocks used in Coverage, a translucent gate, a decision platform, and a settling coverage plot. A refined schematic is the 2D fallback. That work starts from this commit.
