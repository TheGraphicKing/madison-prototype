// Usage: node scripts/shoot-size.mjs <outDir> <WxH> <path[,path...]> [theme] [waitMs]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [out, size, pathsArg, theme = "graphite-light", wait = "3000"] = process.argv.slice(2);
const [w, h] = size.split("x").map(Number);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const ctx = await b.newContext({ viewport: { width: w, height: h } });
await ctx.addInitScript((t) => { try { const [p, m] = t.split("-"); localStorage.setItem("mad_palette", p); localStorage.setItem("mad_mode", m || "light"); } catch {} }, theme);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
for (const p of pathsArg.split(",")) {
  await page.goto((process.env.BASE ?? "http://localhost:4321") + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(Number(wait));
  const name = (p.replace(/[/?=&]+/g, "_").replace(/^_|_$/g, "") || "today") + `-${theme}-${size}.png`;
  await page.screenshot({ path: `${out}/${name}` });
  console.log("shot", name);
}
await b.close();
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
