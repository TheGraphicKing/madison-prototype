// Checks WCAG AA contrast for every text pair, in all six themes. Exits 1 on any failure.
import { readFileSync } from "node:fs";
const P = JSON.parse(readFileSync("src/theme/palettes_v2.json", "utf8"));
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ["ink", "ground"], ["ink", "surface"], ["ink", "surface2"], ["ink2", "surface"], ["ink2", "surface2"], ["ink3", "surface"], ["ink3", "ground"],
  ["accentInk", "accent"], ["ink", "accentSoft"], ["highlightInk", "highlight"],
  ["ok", "okSoft"], ["warn", "warnSoft"], ["risk", "riskSoft"], ["info", "infoSoft"],
  ["ok", "surface"], ["warn", "surface"], ["risk", "surface"], ["info", "surface"], ["accent", "surface"],
];
let fail = 0;
for (const [id, p] of Object.entries(P)) for (const mode of ["light", "dark"]) {
  const t = p[mode];
  const bad = pairs.map(([f, b]) => [f, b, ratio(t[f], t[b])]).filter(([, , r]) => r < 4.5);
  console.log(`${id} ${mode}: ${bad.length ? "FAIL " + bad.map(([f, b, r]) => `${f}/${b} ${r.toFixed(2)}`).join(", ") : "all " + pairs.length + " pairs pass AA"}`);
  fail += bad.length;
}
process.exit(fail ? 1 : 0);
