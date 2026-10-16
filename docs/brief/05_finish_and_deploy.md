# 05 Finish, critique and deploy

## 1. The senior designer pass (do this honestly, with screenshots)

For every screen, take a 1440 screenshot in Graphite and check it against this list. Fix each failure before moving on. Record the before and after in `docs/review.md`.

1. **The one bold element is obvious in 3 seconds.** Everything else is quieter.
2. **Space.**
   - Sections breathe (48 to 64 px).
   - Nothing touches a panel edge.
   - Columns align on the 12-column grid.
   - There are no orphan widths.
3. **Type.** No more than the defined styles. Mono labels only where they carry information. Line length under 75 characters.
4. **Lines.** Hairlines everywhere; no doubled borders; the corner brackets are consistent; the ports sit exactly on edges.
5. **Colour.**
   - The highlight appears only on live or new things.
   - At most one accent action per view.
   - No colour without a label.
6. **No slop.** Search the codebase for:
   - `gradient`, `blur(`, `backdrop-filter`, `shadow-2xl`, `lucide`;
   - emoji;
   - `animate-pulse` on resting content.

   Remove everything that does not explain something.
7. **Motion.**
   - Every motion either answers a click or is a run event. Only one build-in sequence per page.
   - Reduced motion works.
8. **Words.**
   - Sentence case.
   - Plain verbs.
   - The same action name in the button and in the toast.
   - Agent ids only as small mono labels.
9. **Compare with the references.** Put each canvas screenshot next to `reference/textql_refinery_diagram.png` and `reference/yukon_agents_verifier.png`. Is our craft at their level? List three things to raise, and do them.

## 2. Quality floor

- [ ] Lighthouse: Performance 90 or more, Accessibility 95 or more (static export)
- [ ] Keyboard: every screen and the canvas can be used without a mouse; focus is always visible (2 px `--focus` ring, offset 2)
- [ ] Responsive: the screens work at 390 wide (the canvas shows the strip view plus a "Best viewed on desktop" note); no horizontal page scroll
- [ ] 3D: 60 fps on a normal laptop; the 2D fallback works
- [ ] No console errors; `npm run build` is clean

## 3. The 5-minute demo path

Make sure this works perfectly, in this order. Write it in `docs/DEMO.md`.

1. **Today, as Elena.** The hero card is replaying a run. Point at "Needs you".
2. **Open "Accept the duties found in 12 CFR 1005.11(c)"** to reach the change room, then press **Run Madison on this rule**. The canvas opens full-screen and builds itself:
   - sections stream in;
   - duties are found;
   - the verifier holds one back;
   - the flow waits for Elena. Press **Accept 6 duties and exclude 1**.
   - Coverage links flow in from Policies and Controls.
   - The drift is found.
   - The vendors light up.
   - The write-back arc draws.
3. **Hover the "Provisional credit within 5 business days" duty,** to trace its lineage. Click it to open the inspector.
4. **Back in the change room:** "What's left" now shows the gap and the drift. Open "What it touches" to see the 3 vendors and why.
5. **Switch to Priya.** Open the MFA gap and choose a fix. Watch the seven checks; D6 asks Priya; answer. Switch to Anthony and sign off. CTL-153 goes into force, and the handoffs go to TPRM and Assurance.
6. **Coverage, Field view.** Orbit the 1,894 duties, then click the Regulation E plot.
7. **Ask Madison:** "Which Regulation E duties have nothing behind them?"
8. **The record:** every decision just made is there, with names and times. Replay the run.
9. **Change the Color** to show the palettes. End on Graphite.

## 4. Deploy

**Vercel**
- `npm i -g vercel`, then `vercel` (preview) and `vercel --prod`. The framework is detected; static export works.
- Or push to GitHub and import the repository at vercel.com/new.

**Netlify**
- `netlify.toml`:

  ```
  [build]
  command = "npm run build"
  publish = "out"
  ```

- Then `npx netlify-cli deploy --prod --dir=out`.

**For both:**
- Add `robots: noindex` in the metadata, so the prototype is not indexed.
- Keep the URL private.
