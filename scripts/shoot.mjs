// Usage: node scripts/shoot.mjs <outDir> <path[,path...]> [palette] [waitMs]
// Screenshots each path at 1440 and 390 wide from the static server on :4321.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [outDir, pathsArg, palette = "graphite", waitArg = "1200", widthsArg = "1440,390"] = process.argv.slice(2);
const paths = pathsArg.split(",");
const widths = widthsArg.split(",").map(Number);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, deviceScaleFactor: w > 800 ? 1 : 2 });
  await ctx.addInitScript((p) => { try { const [a, b] = p.split("-"); localStorage.setItem("mad_palette", a); localStorage.setItem("mad_mode", b || "light"); } catch {} }, palette);
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  for (const p of paths) {
    await page.goto(`http://localhost:4321${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(Number(waitArg));
    const name = (p.replace(/[/?=&]+/g, "_").replace(/^_|_$/g, "") || "today") + `-${palette}-${w}.png`;
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) console.log(`OVERFLOW ${p} @${w}: ${over}px`);
    await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
    console.log("shot", name);
  }
  await ctx.close();
}
await browser.close();
if (errors.length) { console.log("CONSOLE ERRORS:\n" + [...new Set(errors)].join("\n")); }
