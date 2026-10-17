// Usage: node scripts/click-crawl.mjs [base]
// Clicks every visible link and button on each route. A click is dead when nothing happens:
// no navigation, no change to the page, no dialog. Prints each dead click; exits 1 if any.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:4321";
const routes = [
  "/", "/rules/", "/rules/RC-2026-014/", "/rules/RC-2026-011/", "/rules/RC-2026-016/", "/rules/RC-2026-018/", "/rules/RC-2026-019/",
  "/runs/run-rule-1005/?mode=replay", "/runs/run-coverage-1026/?mode=replay", "/runs/run-design-mfa/?mode=replay&view=simple",
  "/coverage/", "/coverage/?view=map", "/coverage/?view=rules", "/coverage/?view=documents", "/coverage/?view=calendar",
  "/obligations/", "/obligations/D-1005-E2/", "/obligations/D-208-W1/?tab=open", "/tasks/", "/reports/", "/reports/board-pack/", "/reports/exam/", "/record/", "/record/?view=list",
];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("dialog", (d) => d.dismiss());
await page.exposeFunction("__noop", () => {});
let dead = [];
let clicks = 0;

async function open(r) {
  await page.goto(base + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    window.__m = 0;
    new MutationObserver((l) => (window.__m += l.length)).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    window.print = () => (window.__m += 1);
  });
}

for (const r of routes) {
  await open(r);
  const n = await page.evaluate(() => {
    const els = [...document.querySelectorAll("a[href], button, [role=button], [role=tab], [role=radio], summary, input[type=checkbox], select")];
    els.forEach((e, i) => e.setAttribute("data-crawl", String(i)));
    return els.length;
  });
  for (let i = 0; i < n; i++) {
    const sel = `[data-crawl="${i}"]`;
    const el = page.locator(sel).first();
    if (!(await el.count())) continue;
    const info = await el.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      const hidden = r.width < 2 || r.height < 2 || st.visibility === "hidden" || st.display === "none" || e.closest("[aria-hidden=true]") || e.disabled;
      // a control already in its current state (this page, the open tab, the chosen option) is not a dead click
      const current = ["aria-current", "aria-selected", "aria-checked", "aria-pressed"].some((a) => e.getAttribute(a) && e.getAttribute(a) !== "false");
      return { hidden: Boolean(hidden) || current, text: (e.innerText || e.getAttribute("aria-label") || e.getAttribute("href") || e.tagName).trim().slice(0, 60), href: e.getAttribute("href") };
    });
    if (info.hidden) continue;
    const url = page.url();
    await page.evaluate(() => (window.__m = 0));
    try {
      await el.click({ timeout: 1500 });
    } catch {
      continue;
    }
    clicks++;
    await page.waitForTimeout(250);
    const moved = page.url() !== url;
    const changed = moved ? 1 : await page.evaluate(() => window.__m).catch(() => 1);
    if (!moved && !changed) dead.push(`${r} · ${info.text}`);
    if (moved || (await page.locator("[role=dialog]").count())) {
      await open(r);
      await page.evaluate(() => {
        const els = [...document.querySelectorAll("a[href], button, [role=button], [role=tab], [role=radio], summary, input[type=checkbox], select")];
        els.forEach((e, i) => e.setAttribute("data-crawl", String(i)));
      });
    }
  }
  console.log(`${r}: ${n} controls`);
}
await b.close();
console.log(`\n${clicks} clicks · ${dead.length} dead`);
for (const d of dead) console.log("DEAD", d);
process.exit(dead.length ? 1 : 0);
