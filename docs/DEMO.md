# The 5-minute demo

Start on Today in Graphite. If anything was clicked before, use **Reset demo** at the bottom of the rail.

1. **Today, as Elena.** The hero card replays the Reg E run on a loop. Point at "Needs you": four tasks, ranked, each with one action.
2. **Open "Accept the duties found in 12 CFR 1005.11(c)"** (Open the change room), then press **Run Madison on this rule**. The canvas opens full screen and builds itself. Watch the 14 sections stream in, the duty finder propose 8 duties, and the verifier fill for each one and hold one back with its reason. The flow stops at "You decide": press **Accept 6 duties and exclude 1**. Coverage links flow in from Policies and Controls, the drift is found, the vendors light up in "What it touches", and the write-back arc draws to the record. (Use 2x or 4x to keep time.)
3. **Hover D-1005-E2** (the square in "Nothing behind it") to trace its lineage: its section, the policy and control links, the drift and the vendors light up, everything else dims. Click it to open the inspector: the rule's own words with the sentence highlighted, the reviewer's verdict, the agent and model, and who decided.
4. **Back in the change room** (Open what's left): the step track has moved to What's left, which shows the gap and the drift as two quotes side by side. Open **What it touches**: 3 vendors and why each is in scope.
5. **Switch to Priya** (Viewing as). On Today, open **Choose a fix**, then press **Choose a fix**. Watch the seven design checks: D6 comes back "can't tell" and a line runs to the owner. Answer as Priya. The flow waits for the CCO: press **Continue as Anthony Marsh**, then **Sign off as Anthony Marsh**. CTL-153 goes into force and the handoffs go to TPRM and Assurance.
6. **Coverage, Field view.** Orbit the 1,894 duties, then click the **12 CFR 1005** plot (or pick it from the list) to fly to Regulation E.
7. **Ask Madison** (bottom right, or Cmd J): "Which Regulation E duties have nothing behind them?" Watch the retrieval trail, then the answer with its certainty and sources.
8. **The record:** every decision just made is there with names and times, newest first. Press **Replay** on a run to open the canvas in `[ REPLAY ]`.
9. **Color:** show Refinery, Yukon, Midnight and Terminal. End on Graphite.

The path was run end to end with `node scripts/scenario.mjs scripts/demo-path.json` against a static server on port 4321 (screenshots of every step in `docs/screens/demo/`).
