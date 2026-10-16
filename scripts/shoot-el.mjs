// Usage: node scripts/shoot-el.mjs <path> <out.png> <x> <y> <w> <h> [width] [palette] [waitMs]
import { chromium } from "playwright";
const [p, out, x, y, w, h, width = "1440", palette = "graphite", wait = "1500"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript((pal) => { try { localStorage.setItem("mad_palette", pal); } catch {} }, palette);
const page = await ctx.newPage();
await page.goto(`http://localhost:4321${p}`, { waitUntil: "networkidle" });
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out, fullPage: true, clip: { x: +x, y: +y, width: +w, height: +h } });
await b.close();
