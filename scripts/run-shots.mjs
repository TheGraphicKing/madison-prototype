// Usage: node scripts/run-shots.mjs <outDir> <theme> [reduced]
// Steps through the three recorded runs with the arrow keys and screenshots the Agent view.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [out, theme = "graphite-light", reducedArg] = process.argv.slice(2);
const reduced = reducedArg === "reduced";
mkdirSync(out, { recursive: true });
const base = process.env.BASE ?? "http://localhost:4321";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
await ctx.addInitScript((p) => {
  try {
    const [a, m] = p.split("-");
    localStorage.setItem("mad_palette", a);
    localStorage.setItem("mad_mode", m || "light");
  } catch {}
}, theme);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const tag = reduced ? "2d" : "3d";

async function open(path) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator("footer").last().click();
}
async function step(n) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
  }
}
async function shot(name, wait = 1800) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}-${tag}-${theme}-1440.png` });
  console.log("shot", name);
}

await open("/runs/run-rule-1005/?mode=replay");
await step(14);
await shot("rule-a-sections");
await step(20);
await shot("rule-b-obligations");
await step(22);
await shot("rule-c-decide");
const back = page.getByRole("button", { name: "Back to the flow" });
if (await back.count()) {
  await back.first().click();
  await shot("rule-d-queue", 1200);
}
const decide = page.getByRole("button", { name: "Decide on the obligations" });
if (await decide.count()) {
  await decide.first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Accept 6 obligations and exclude 1" }).first().click();
  await page.waitForTimeout(300);
  await page.locator("footer").last().click();
  await step(12);
  await shot("rule-e-matching");
  await step(40);
  await shot("rule-f-done", 2500);
}
await open("/runs/run-coverage-1026/?mode=replay");
await step(30);
await shot("coverage-run", 2500);
await open("/runs/run-design-mfa/?mode=replay");
await shot("mfa-run", 2500);
await b.close();
if (errors.length) console.log("PAGE ERRORS:\n" + [...new Set(errors)].join("\n"));
