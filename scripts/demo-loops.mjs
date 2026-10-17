// Usage: node scripts/demo-loops.mjs <outDir> [theme]
// Plays the two handoff loops end to end, switching personas, with a screenshot at each step.
// Personas switch through the demo store in sessionStorage; titles come from the data files.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const [out = "docs/iteration-2/phase-i/loops", theme = "graphite-light"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const base = process.env.BASE ?? "http://localhost:4321";
const handoffs = Object.fromEntries(JSON.parse(readFileSync("src/data/handoffs.json", "utf8")).map((h) => [h.id, h]));
const tasks = JSON.parse(readFileSync("src/data/tasks.json", "utf8"));
const taskFor = (hid) => tasks.find((t) => t.handoff_id === hid);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
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
let n = 0;
const shot = async (name, full = false) => {
  await page.waitForTimeout(900);
  const f = `${out}/${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: f, fullPage: full });
  console.log("shot", f);
};
const go = async (p) => {
  await page.goto(base + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
};
const as = async (id) => {
  await page.evaluate((id) => {
    const k = "madison-demo-v2";
    const v = JSON.parse(sessionStorage.getItem(k) || '{"state":{},"version":0}');
    v.state.persona = id;
    sessionStorage.setItem(k, JSON.stringify(v));
  }, id);
};
const text = async (t) => (await page.getByText(t, { exact: false }).count()) > 0;
async function answer(hid, choice) {
  const h = handoffs[hid];
  const t = taskFor(hid);
  await go(`/tasks/?open=${t.id}`);
  await shot(`${hid}-drawer`);
  const dlg = page.locator("[role=dialog]").last();
  if (choice) await dlg.getByText(choice, { exact: true }).first().click();
  for (const el of await dlg.locator("textarea, input[type=text]").all()) if (await el.isEditable()) await el.fill("Synthetic demo answer: see the attached procedure update.");
  for (const el of await dlg.locator("input[type=date]").all()) if (await el.isEditable()) await el.fill("2026-10-30");
  await shot(`${hid}-filled`);
  await dlg.getByRole("button", { name: h.options[0].label, exact: true }).first().click();
  await shot(`${hid}-sent`);
}

// loop 1: raise the drift, the procedure owner answers, the analyst sees it
await go("/");
await as("u-elena");
await go("/rules/RC-2026-016/");
await shot("loop1-change-room");
await go("/runs/run-coverage-1026/?mode=live&view=simple&from=/rules/RC-2026-016/");
await page.getByRole("radio", { name: "4×" }).first().click();
await page.getByRole("button", { name: "Link and raise the drift" }).first().waitFor({ timeout: 90000 });
await shot("loop1-checkpoint");
await page.getByRole("button", { name: "Link and raise the drift" }).first().click();
await page.waitForTimeout(6000);
await shot("loop1-run-done");
await go("/");
await shot("loop1-today-waiting");
console.log("waiting shown:", await text("Waiting on"));
await as(handoffs["H-118"].to_user_id);
await go("/");
await shot("loop1-owner-today");
await answer("H-118");
await as("u-elena");
await go("/");
await shot("loop1-back-today-responded");
await go("/rules/RC-2026-016/");
await shot("loop1-change-room-unblocked");
await go("/obligations/D-1026-L2/");
await shot("loop1-obligation-covered");
console.log("covered:", await text("Covered"));

// loop 2: the owner answers D6, which unblocks the CCO's sign-off; the control goes into force
await as(handoffs["H-117"].to_user_id);
await go("/");
await shot("loop2-owner-today");
await answer("H-117", handoffs["H-117"].needed.find((x) => x.kind === "choice").choices[1]);
await as(handoffs["H-116"].to_user_id);
await go("/");
await shot("loop2-cco-today");
await answer("H-116", "Approve");
await as("u-elena");
await go("/rules/RC-2026-011/");
await shot("loop2-change-room");
await go("/runs/run-design-mfa/?mode=replay");
await shot("loop2-run-finished");
await go("/obligations/D-208-M1/");
await shot("loop2-obligation");
await go("/record/");
await shot("loop2-record");
await b.close();
if (errors.length) console.log("PAGE ERRORS:\n" + [...new Set(errors)].join("\n"));
