# Madison demos (iteration 3)

Live at https://madison-prototype-2.vercel.app.

Open **Demos** at the bottom of the rail, or press **D**. Each card has **Start this demo**, which:
- resets only that story's data;
- switches to the starting person;
- opens the starting screen;
- turns on the coach card.

The coach shows each step, with Back, Next (which unlocks when the step has happened), Exit and a folded talk track. The guide is optional: every flow also works by hand.

Every flow has a Playwright test (`npm run e2e`) that plays it to the end and checks the result.

## D1 · A new rule lands (4 min, as Elena Petrova)
**First click:** on Today, the row "Provisional credit for card and ACH disputes" in Open rule changes.

1. The change room opens, not started: sources, six outlined platforms, and "Run Madison on this rule".
2. Run it. The map comes alive: the rule text flows from eCFR, sections split, and the scope check lights up.
3. Click the Obligations platform while it works. The side panel lists each obligation with the rule's own words.
4. The double-check gate holds one back. Hover the held block to see why.
5. At You decide, the blocks queue on the ring. Press **Accept 6 obligations and exclude 1**.
6. Policies and controls flow into Linked, and the drift appears. The strip reads 4 of 6, with owner Margaret Ellison.
7. **Open in Coverage.** The Reg E plot holds the new gap block, raised and red, with its owner.

**Ending:** the Reg E plot is updated, Margaret Ellison has her policy and procedure tasks, and the record has the run's entries and the signed decision.

## D2 · Close a gap with a new control (4 min, as Elena Petrova)
**First click:** **Choose a fix** in the change room for 12 CFR 208 App. D-2 III.C (4 of 6 done, What's left active).

1. Suggest, Draft and Seven checks platforms appear. D1 to D7 fill, and D6 stops at "can't tell".
2. A handoff to Priya Raman is created.
3. As Priya: open her task, pick "Yes, but it is vaulted and needs two officers", and send.
4. As Anthony Marsh: approve CTL-153.
5. Back as Elena: the MFA obligation is covered, CTL-153 stands behind it in the lineage, and Nadia Brennan has 3 vendor reviews.

**Ending:** the gap is closed, the control is in force, and the vendor reviews and a retest are planned.

## D3 · A handoff that unblocks a change (3 min, as Elena Petrova)
**First click:** **Check coverage** in the change room for 12 CFR 1026.19(e) (3 of 6 done).

1. Policy, procedure and control flow into Linked, and the drift appears with both numbers.
2. At the decision, choose **Link and raise the drift**. "Waiting on Grace Liu" appears on the map.
3. As Grace Liu: Today shows the task from Elena. Open it: three quotes are given; new wording and a date are needed.
4. Fill both and press **Update the procedure**. A toast confirms it and the record gets an entry.
5. Back as Elena: "Grace Liu responded" is on Today, the obligation is Covered, and the map is unblocked.

**Ending:** the drift is fixed, the obligation is covered, and both sides are in the record.

## D4 · Madison knows when a rule does not apply (2 min, as Elena Petrova)
**First click:** in Rule changes, the "Prepaid account error resolution" tile in the Doesn't apply column.

1. Only the Applies platform is drawn, with the verdict, the deciding fact (prepaid accounts: no) and certainty Clear.
2. Open "Flood insurance": its Applies platform is waiting on Grace Liu for one bank fact.
3. As Grace: answer **Yes**. Back as Elena, the flood rule now applies and its obligations step unlocks.

**Ending:** two rules are resolved without wasted work.

## D5 · The CCO's view (3 min, as Anthony Marsh)
**First click:** Today's mini coverage field and its lens switch, beside the four counts.

1. Coverage: switch the lens to **Owner**. Plots are coloured by owner, with a legend of names.
2. Click the 12 CFR 208 plot: the wire-release known gap, accepted by Anthony until 31 Dec 2026, why, owner Margaret Ellison, and the consequence.
3. Reports, then the board pack: read the conclusions and How this report was built, then **Approve the board pack**.
4. The record shows the signature. A run cluster offers **Replay this run**, which replays it in place on its change map.

**Ending:** the board pack is approved, and the record shows the signature.

## Notes for presenters
- **Reset:** each demo resets only its own story. "Reset demo" in the rail resets everything.
- **Scene controls:** the mouse wheel scrolls the page. Zoom with Ctrl or Cmd and the wheel, a pinch, or the + and − buttons. "Overview" reframes the scene.
- **Fallbacks:** without WebGL, or with reduced motion, the change room shows the List view and Coverage shows the Map.
