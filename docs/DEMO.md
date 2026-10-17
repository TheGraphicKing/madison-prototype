# Madison: five demo stories

Live at https://madison-prototype-2.vercel.app. Every story starts on **Today** and ends back on it.

**Before you start**
- Press **Reset demo** at the bottom of the rail.
- Switch person with **Viewing as** in the header. If the page you're on has a task for that person, you stay and see it under "Your task now". If not, you land on their Today with the task highlighted.
- Each story ends with a **What's next** card: the natural next step, plus **Back to Today**.

Each story has a Playwright test that clicks exactly this path (`npm run e2e`).

## 1. A new rule lands (Reg E run, about 4 min)
1. As Elena Petrova, on Today: click **Accept the obligations found in 12 CFR 1005.11(c)** in Needs you.
2. The change room opens, not started. Under Your task now, press **Run Madison on this rule**.
3. The map plays in place. Click the **Obligations** platform: the side panel shows each obligation with the rule's own words.
4. Watch the double-check gate hold one back. Hover the held block for its reason.
5. At the ring, press **Accept 6 obligations and exclude 1**.
6. Policies and controls flow into Linked. The four answers read 4 of 6, 1 gap, owner Margaret Ellison.
7. In What's next, press **See it in Coverage**. The Reg E plot holds the new red gap block, with its owner.
8. Go back. Press **Margaret's new task**: you are now Margaret, on her Today, with "Update POL-DISP-01 4.2" highlighted.
9. Today's "Since you last looked" line reads "6 obligations accepted · 1 gap found".

## 2. A handoff that unblocks a change (Loan Estimate, about 3 min)
1. As Elena, on Today: click **Confirm 2 proposed links for revised Loan Estimates**.
2. Press **Check coverage**. Policy, procedure and control flow into Linked, and the drift shows both numbers.
3. At the decision, choose **Link and raise the drift**. The map shows "Waiting on Grace Liu".
4. Switch to **Grace Liu**. You stay on the page, and her task is under Your task now.
5. Fill in the new wording and the date, then press **Update the procedure**. The toast reads "Updated the procedure".
6. In What's next, press **Back to Today**. Switch to **Elena**: "Grace Liu responded" tops Needs you, and Since you last looked reads "1 procedure updated".

## 3. Close a gap with a new control (MFA fix, about 4 min)
1. As Elena, on Today: click **Choose a fix for the MFA gap**.
2. Press **Choose a fix**. Suggest, Draft and Seven checks appear; D6 stops at "can't tell" and waits on Priya Raman.
3. Switch to **Priya Raman** (you stay). Choose "Yes, but it is vaulted and needs two officers", then **Send answer**.
4. Switch to **Anthony Marsh** (you stay). Choose **Approve**, then **Approve**. CTL-153 is in force.
5. Switch to **Elena**: her Today reads "CTL-153 in force". Open the change room again; What's next offers **See it in Coverage** and **Nadia's vendor reviews** (3 reviews on Nadia Brennan's Today).

## 4. Madison knows when a rule does not apply (prepaid and flood, about 2 min)
1. As Elena, on Today: click **All rule changes**, then the **Prepaid account error resolution** tile under Doesn't apply.
2. Only the Applies platform is drawn: Doesn't apply, the deciding fact "Prepaid accounts: no", certainty Clear.
3. Back to Today. Under Open rule changes, click **Flood insurance for loans in special flood hazard areas**: it is waiting on Grace Liu for one bank fact.
4. Switch to **Grace** (you stay). Answer **Yes** and press **Send answer**. In What's next, press **Back to Today**.
5. Switch to **Elena**. Since you last looked reads "flood lending fact answered (Yes)", and the flood rule now applies.

## 5. The CCO's view (about 3 min)
1. Switch to **Anthony Marsh**. Today shows the four counts, their monthly change and the mini field.
2. Click the **Known gap** count: Coverage opens filtered to known gaps. Switch the lens to **Owner** to see the legend of names.
3. In the plot list, click **12 CFR 208**: the wire-release known gap, accepted by Anthony until 31 Dec 2026, why, owner Margaret Ellison, and the consequence.
4. Click **Today**, then **Approve the Q3 board pack** in Needs you. The board pack opens. Press **Approve the board pack**.
5. In What's next, press **See it in the record**: today's record shows the signature. Switch to Chain and press **Replay this run** on a run cluster; the change map replays it in place.
6. Click **Today**: Since you last looked reads "board pack approved".

## Presenter tools (optional)
Add `?presenter=1` to any URL to bring back the Demos panel (the D shortcut) and the step-by-step coach card for this tab. `?presenter=0` turns them off again.
