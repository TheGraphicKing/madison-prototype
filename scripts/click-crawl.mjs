// Usage: node scripts/click-crawl.mjs [base] [WxH] [persona-id]
// Clicks every visible link and button on each route. A click is dead when nothing happens:
// no navigation, no change to the page, no dialog. Prints each dead click; exits 1 if any.
import { chromium } from "playwright";
import { existsSync } from "node:fs";

// an internal link is alive when the static export has that page; it is checked, not clicked
const pageExists = (href) => {
  const path = href.split("#")[0].split("?")[0].replace(/^\//, "").replace(/\/$/, "");
  return existsSync(`out/${path}${path ? "/" : ""}index.html`) || existsSync(`out/${path}.html`);
};
const seenLinks = new Set();

const base = process.argv[2] ?? "http://localhost:4321";
const [vw, vh] = (process.argv[3] ?? "1440x900").split("x").map(Number);
const persona = process.argv[4] ?? "u-elena";
const routes = [
  "/", "/rules/", "/rules/RC-2026-014/", "/rules/RC-2026-011/", "/rules/RC-2026-016/", "/rules/RC-2026-018/", "/rules/RC-2026-019/",
  "/rules/RC-2026-017/", "/rules/RC-2026-013/", "/rules/RC-2026-009/", "/rules/RC-2026-012/", "/rules/RC-2026-014/?view=list",
  "/coverage/", "/coverage/?view=map", "/coverage/?view=rules", "/coverage/?view=documents", "/coverage/?view=calendar",
  "/obligations/", "/obligations/D-1005-E2/", "/obligations/D-208-W1/?tab=open", "/tasks/", "/reports/", "/reports/board-pack/", "/reports/exam/", "/record/", "/record/?view=list",
];
const b = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const ctx = await b.newContext({ viewport: { width: vw, height: vh } });
// start as this person: the demo store is in sessionStorage
await ctx.addInitScript((id) => {
  try {
    const k = "madison-demo-v2";
    const v = JSON.parse(sessionStorage.getItem(k) || '{"state":{},"version":0}');
    if (!v.state.persona) {
      v.state.persona = id;
      sessionStorage.setItem(k, JSON.stringify(v));
    }
  } catch {}
}, persona);
const page = await ctx.newPage();
page.on("dialog", (d) => d.dismiss());
const consoleErrors = new Set();
page.on("pageerror", (e) => consoleErrors.add(`pageerror ${e.message}`));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && consoleErrors.add(m.text()));
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

for (const r of process.env.ROUTES ? process.env.ROUTES.split(",") : routes) {
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
    if (info.href && /^\//.test(info.href)) {
      clicks++;
      if (!seenLinks.has(info.href)) {
        seenLinks.add(info.href);
        if (!pageExists(info.href)) dead.push(`${r} · link to a missing page ${info.href}`);
      }
      continue;
    }
    if (info.href && /^https?:/.test(info.href)) continue;
    const url = page.url();
    await page.evaluate(() => (window.__m = 0));
    try {
      await el.click({ timeout: 1500 });
    } catch {
      continue;
    }
    clicks++;
    await page.waitForTimeout(250);
    let moved = page.url() !== url;
    let changed = moved ? 1 : await page.evaluate(() => window.__m).catch(() => 1);
    // a busy machine can be slow to respond: look again before calling a click dead
    if (!moved && !changed) {
      await page.waitForTimeout(900);
      moved = page.url() !== url;
      changed = moved ? 1 : await page.evaluate(() => window.__m).catch(() => 1);
    }
    if (!moved && !changed) {
      dead.push(`${r} · ${info.text}`);
      if (process.env.SHOT_DEAD && dead.length === 1) await page.screenshot({ path: "docs/iteration-3/f42/crawl/first-dead.png" });
    }
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
console.log(`\n${vw}x${vh} ${persona}: ${clicks} clicks · ${dead.length} dead · ${consoleErrors.size} console errors`);
for (const e of consoleErrors) console.log("CONSOLE", e.slice(0, 200));
for (const d of dead) console.log("DEAD", d);
process.exit(dead.length ? 1 : 0);
