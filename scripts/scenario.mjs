// Usage: node scripts/scenario.mjs <scenario.json>
// { "width": 1440, "palette": "graphite", "steps": [ {"go": "/path"}, {"wait": 1000}, {"click": "text"}, {"shot": "file.png"}, {"key": "Space"}, {"hover": "css"} ] }
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
const sc = JSON.parse(readFileSync(process.argv[2], "utf8"));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: sc.width ?? 1440, height: sc.height ?? 900 }, deviceScaleFactor: sc.dpr ?? 1, reducedMotion: sc.reduced ? "reduce" : "no-preference" });
await ctx.addInitScript((p) => { try { localStorage.setItem("mad_palette", p); } catch {} }, sc.palette ?? "graphite");
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
for (const s of sc.steps) {
  if (s.go) await page.goto("http://localhost:4321" + s.go, { waitUntil: "networkidle" });
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.click) await page.getByRole(s.role ?? "button", { name: s.click, exact: s.exact ?? false }).first().click();
  if (s.clickText) await page.getByText(s.clickText, { exact: s.exact ?? false }).first().click();
  if (s.css) await page.locator(s.css).first().click();
  if (s.hover) await page.locator(s.hover).first().hover();
  if (s.key) await page.keyboard.press(s.key);
  if (s.eval) console.log(JSON.stringify(await page.evaluate(s.eval)));
  if (s.shot) { mkdirSync(dirname(s.shot), { recursive: true }); await page.screenshot({ path: s.shot, fullPage: s.full ?? false }); console.log("shot", s.shot); }
}
await b.close();
if (errors.length) console.log("CONSOLE ERRORS:\n" + [...new Set(errors)].join("\n"));
