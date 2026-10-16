// Usage: node scripts/compose.mjs <out.png> <title> <img> [img...]
// Places screenshots side by side on one page for comparison.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [out, title, ...imgs] = process.argv.slice(2);
const src = (p) => `data:image/png;base64,${readFileSync(resolve(p)).toString("base64")}`;
const figs = imgs.map((p) => `<figure style="margin:0;flex:1;min-width:0"><img src="${src(p)}" style="width:100%;border:1px solid #ddd;border-radius:8px;display:block"/><figcaption style="margin-top:6px;color:#666;font-size:12px">${p.split("/").pop()}</figcaption></figure>`).join("");
const html = `<!doctype html><html><body style="margin:0;background:#f4f4f2;font:14px system-ui;color:#222"><div style="padding:16px 20px 8px;font-weight:600">${title}</div><div style="display:flex;gap:16px;padding:0 20px 20px;align-items:flex-start">${figs}</div></body></html>`;
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1200 * Math.min(3, imgs.length), height: 800 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: out, fullPage: true });
await b.close();
console.log("composed", out);
