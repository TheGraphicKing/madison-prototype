// Scans the rendered text of every route for forbidden things (iteration 2):
// "duty"/"duties", agent ids, cost figures, dollar penalties, corner-bracket mode labels.
// Text inside [data-how] ("Show how Madison did this") is allowed to name agents.
// Usage: node scripts/scan-text.mjs [base]   (default http://localhost:4321)
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:4321";
const routes = [
  "/", "/rules/", "/rules/RC-2026-014/", "/rules/RC-2026-011/", "/rules/RC-2026-016/", "/rules/RC-2026-018/", "/rules/RC-2026-019/",
  "/runs/run-rule-1005/?mode=replay", "/runs/run-coverage-1026/?mode=replay", "/runs/run-design-mfa/?mode=replay",
  "/coverage/", "/coverage/?view=map", "/coverage/?view=rules", "/coverage/?view=documents", "/coverage/?view=calendar",
  "/obligations/", "/obligations/D-1005-E2/", "/obligations/D-208-W1/", "/tasks/", "/reports/", "/reports/board-pack/", "/reports/exam/", "/record/", "/gallery/",
];
// $100,000 is the wire-approval threshold in the rule itself, not a penalty
const allowedDollars = new Set(["$100,000"]);
const checks = [
  { name: "duty", re: /\bdut(y|ies)\b/gi },
  { name: "agent id", re: /\b(RC|QC|CD|AM)-\d{1,2}\b/g },
  { name: "cost", re: /\$\d+\.\d{2}\b/g },
  { name: "dollar amount", re: /\$\d[\d,]*(\.\d+)?\s?(k|m|million|bn)?/gi, allow: (m) => allowedDollars.has(m.trim()) },
  { name: "bracket label", re: /\[\s+[A-Z]+\s+\]/g },
  { name: "model name", re: /claude-|prompt v\d|tokens?\b/gi },
  { name: "raw field name", re: /\b[a-z]+(?:_[a-z]+)+\b/g },
  { name: "raw change id", re: /\bRC-20\d\d-\d{3}\b/g },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let hits = 0;
for (const r of routes) {
  await page.goto(base + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const text = await page.evaluate(() => {
    const st = document.createElement("style");
    st.textContent = "[data-how]{display:none!important}";
    document.head.appendChild(st);
    const t = document.body.innerText;
    st.remove();
    return t;
  });
  for (const c of checks) {
    const found = [...text.matchAll(c.re)].map((m) => m[0]).filter((m) => !(c.allow && c.allow(m)));
    if (found.length) {
      hits += found.length;
      console.log(`${r}  ${c.name}: ${[...new Set(found)].slice(0, 8).join(", ")}`);
    }
  }
}
await browser.close();
console.log(hits ? `${hits} forbidden hits` : "Rendered text is clean.");
process.exit(hits ? 1 : 0);
