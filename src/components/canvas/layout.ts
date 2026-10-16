// Geometry for the schematic, in design units (1000 x H), scaled to fit.
// Two lanes: the upper lane reads left to right, a curved connector drops to the
// lower lane, which reads right to left, so the flow is a loop.
import type { Run } from "@/data/types";

export const W = 900;
export const NODE_W = 168;
export const NODE_H = 112;
export const COLS = [146, 330, 514, 698];
export const SRC_W = 104;
export const SRC_H = 38;

export type Side = "left" | "right" | "top" | "bottom";
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface NodeGeo extends Box {
  key: string;
  dir: 1 | -1; // reading direction of its lane
  lane: "upper" | "lower";
}
export interface TrayGeo extends Box {
  key: string;
  label: string;
  /** where packets arrive */
  entry: [number, number];
  /** which stage feeds it */
  from: string;
}
export interface Layout {
  H: number;
  nodes: Record<string, NodeGeo>;
  sources: Record<string, Box>;
  trays: Record<string, TrayGeo>;
  /** the stage chain connectors, as [fromKey, toKey, path] */
  chain: { from: string; to: string; d: string }[];
  /** static hairlines from sources to the stages that read them */
  sourceLinks: { source: string; stage: string; d: string }[];
  writeBack: { d: string; labelAt: [number, number]; vertical?: boolean };
  /** the record, where every step is written */
  record: Box;
  /** for run-design-mfa: from the D6 cell to the owner node */
  ownerLine?: { from: [number, number]; to: [number, number] };
}

export const port = (b: Box, side: Side, f = 0.5): [number, number] =>
  side === "left"
    ? [b.x, b.y + b.h * f]
    : side === "right"
      ? [b.x + b.w, b.y + b.h * f]
      : side === "top"
        ? [b.x + b.w * f, b.y]
        : [b.x + b.w * f, b.y + b.h];

/** A horizontal S curve between two ports. */
export function hCurve([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const dx = Math.max(24, Math.abs(x2 - x1) / 2);
  const s = x2 >= x1 ? 1 : -1;
  return `M ${x1} ${y1} C ${x1 + dx * s} ${y1}, ${x2 - dx * s} ${y2}, ${x2} ${y2}`;
}

/** From a horizontal tangent into a vertical one (source into a node's top). */
export function hvCurve([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const dx = (x2 - x1) * 0.6;
  const dy = Math.max(30, Math.abs(y2 - y1) * 0.8);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

/** Straight down from a port into a tray. */
export function vLine([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

/** The drop from the end of the upper lane to the start of the lower lane, bulging right. */
function drop([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const bx = Math.max(x1, x2) + 34;
  return `M ${x1} ${y1} C ${bx} ${y1}, ${bx} ${y2}, ${x2} ${y2}`;
}

function sourceBoxes(run: Run, top: number, gap = 52): Record<string, Box> {
  const out: Record<string, Box> = {};
  run.sources.forEach((s, i) => (out[s.id] = { x: 0, y: top + i * gap, w: SRC_W, h: SRC_H }));
  return out;
}

export const RECORD: Box = { x: 0, y: 30, w: SRC_W, h: SRC_H };

/** The long hairline from the end of the flow back to the record, top left. */
function writeBackFrom(start: [number, number], dir: 1 | -1, H: number): Layout["writeBack"] {
  const [x, y] = start;
  const ry = RECORD.y + RECORD.h / 2;
  if (dir === -1) {
    // the flow ends on the left: sweep down under the sources, up the left edge, into the record
    const by = H - 24;
    const d = `M ${x} ${y} C ${x - 30} ${y}, ${x - 26} ${by}, ${x - 70} ${by} L 6 ${by} C -12 ${by}, -16 ${by - 10}, -16 ${by - 28} L -16 ${ry + 18} C -16 ${ry + 4}, -10 ${ry}, 0 ${ry}`;
    return { d, labelAt: [-24, by - 40], vertical: true };
  }
  // the flow ends on the right: rise, cross over the top of the canvas, land in the record
  const top = 12;
  const d = `M ${x} ${y} C ${x + 26} ${y}, ${x + 30} ${y - 24}, ${x + 30} ${y - 56} L ${x + 30} ${top + 30} C ${x + 30} ${top + 8}, ${x + 16} ${top}, ${x - 10} ${top} L ${RECORD.w + 40} ${top} C ${RECORD.w + 14} ${top}, ${RECORD.w} ${top + 6}, ${RECORD.w} ${ry}`;
  return { d, labelAt: [RECORD.w + 48, top - 8] };
}

function node(key: string, col: number, y: number, lane: "upper" | "lower", h = NODE_H, dir?: 1 | -1): NodeGeo {
  return { key, x: COLS[col], y, w: NODE_W, h, lane, dir: dir ?? (lane === "upper" ? 1 : -1) };
}

function inPort(n: NodeGeo): [number, number] {
  return n.dir === 1 ? port(n, "left") : port(n, "right");
}
function outPort(n: NodeGeo): [number, number] {
  return n.dir === 1 ? port(n, "right") : port(n, "left");
}

function chainFor(run: Run, nodes: Record<string, NodeGeo>) {
  const chain: Layout["chain"] = [];
  for (let i = 0; i < run.stages.length - 1; i++) {
    const a = nodes[run.stages[i].key];
    const b = nodes[run.stages[i + 1].key];
    if (a.lane === b.lane) chain.push({ from: a.key, to: b.key, d: hCurve(outPort(a), inPort(b)) });
    else chain.push({ from: a.key, to: b.key, d: drop(port(a, "right", a.h > NODE_H ? 0.5 : 0.5), port(b, "right", b.h > NODE_H ? 0.5 : 0.5)) });
  }
  return chain;
}

const UPPER_Y = 96;
const LOWER_Y = 356;

function layoutRule1005(run: Run): Layout {
  const nodes: Record<string, NodeGeo> = {
    text: node("text", 0, UPPER_Y, "upper"),
    sections: node("sections", 1, UPPER_Y, "upper"),
    scope: node("scope", 2, UPPER_Y, "upper"),
    duties: node("duties", 3, UPPER_Y, "upper"),
    checks: { ...node("checks", 3, LOWER_Y - 34, "lower", NODE_H + 68) },
    decide: node("decide", 2, LOWER_Y, "lower"),
    coverage: node("coverage", 1, LOWER_Y, "lower"),
    touches: node("touches", 0, LOWER_Y, "lower"),
  };
  const sources = sourceBoxes(run, 96);
  const g = nodes.checks;
  const trays: Record<string, TrayGeo> = {
    held: { key: "held", label: "Held back", from: "checks", x: g.x, y: g.y + g.h + 44, w: g.w, h: 76, entry: [g.x + g.w / 2, g.y + g.h + 44] },
  };
  const c = nodes.coverage;
  trays.covered = { key: "covered", label: "Covered", from: "coverage", x: c.x, y: c.y + c.h + 44, w: c.w, h: 30, entry: [c.x + 24, c.y + c.h + 44] };
  trays.not_yet_confirmed = { key: "not_yet_confirmed", label: "Not yet confirmed", from: "coverage", x: c.x, y: c.y + c.h + 78, w: c.w, h: 30, entry: [c.x + c.w / 2, c.y + c.h + 78] };
  trays.nothing_behind = { key: "nothing_behind", label: "Nothing behind it", from: "coverage", x: c.x, y: c.y + c.h + 112, w: c.w, h: 30, entry: [c.x + c.w - 24, c.y + c.h + 112] };
  const t = nodes.touches;
  trays.out = { key: "out", label: "What it touches", from: "touches", x: t.x, y: t.y + t.h + 44, w: t.w, h: 132, entry: [t.x + t.w / 2, t.y + t.h + 44] };

  const sourceLinks = [
    { source: "src-ecfr", stage: "text", d: hCurve(port(sources["src-ecfr"], "right"), port(nodes.text, "left", 0.42)) },
    { source: "src-fr", stage: "text", d: hCurve(port(sources["src-fr"], "right"), port(nodes.text, "left", 0.7)) },
    { source: "src-profile", stage: "scope", d: hvBottom(port(sources["src-profile"], "right"), port(nodes.scope, "bottom")) },
    { source: "src-policies", stage: "coverage", d: hvCurve(port(sources["src-policies"], "right"), port(nodes.coverage, "top", 0.38)) },
    { source: "src-controls", stage: "coverage", d: hvCurve(port(sources["src-controls"], "right"), port(nodes.coverage, "top", 0.62)) },
  ];
  return {
    H: 720,
    nodes,
    sources,
    trays,
    chain: chainFor(run, nodes),
    sourceLinks,
    writeBack: writeBackFrom(port(nodes.touches, "left"), -1, 720),
    record: RECORD,
  };
}

/** From a source, under the upper lane, rising into a node's bottom port. */
function hvBottom([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const dy = Math.max(30, Math.abs(y1 - y2) * 0.8);
  return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.6} ${y1}, ${x2} ${y2 + dy}, ${x2} ${y2}`;
}

function layoutDesignMfa(run: Run): Layout {
  const GATE_H = 284;
  const nodes: Record<string, NodeGeo> = {
    suggest: node("suggest", 0, UPPER_Y, "upper"),
    draft: node("draft", 1, UPPER_Y, "upper"),
    checks: node("checks", 2, UPPER_Y - (GATE_H - NODE_H) / 2, "upper", GATE_H),
    owner: node("owner", 3, LOWER_Y + 20, "lower"),
    signoff: node("signoff", 2, LOWER_Y + 20, "lower"),
    publish: node("publish", 1, LOWER_Y + 20, "lower"),
    handoff: node("handoff", 0, LOWER_Y + 20, "lower"),
  };
  // the gate hands straight across to the owner, who sits under the upper lane's end
  const sources = sourceBoxes(run, 96);
  const h = nodes.handoff;
  const trays: Record<string, TrayGeo> = {
    tprm: { key: "tprm", label: "TPRM", from: "handoff", x: h.x, y: h.y + h.h + 44, w: h.w, h: 88, entry: [h.x + h.w * 0.3, h.y + h.h + 44] },
    assurance: { key: "assurance", label: "Assurance", from: "handoff", x: h.x, y: h.y + h.h + 144, w: h.w, h: 40, entry: [h.x + h.w * 0.75, h.y + h.h + 144] },
  };
  const g = nodes.checks;
  const chain: Layout["chain"] = [
    { from: "suggest", to: "draft", d: hCurve(port(nodes.suggest, "right"), port(nodes.draft, "left")) },
    { from: "draft", to: "checks", d: hCurve(port(nodes.draft, "right"), port(g, "left")) },
    { from: "checks", to: "owner", d: drop(port(g, "right"), port(nodes.owner, "right")) },
    { from: "owner", to: "signoff", d: hCurve(port(nodes.owner, "left"), port(nodes.signoff, "right")) },
    { from: "signoff", to: "publish", d: hCurve(port(nodes.signoff, "left"), port(nodes.publish, "right")) },
    { from: "publish", to: "handoff", d: hCurve(port(nodes.publish, "left"), port(nodes.handoff, "right")) },
  ];
  const sourceLinks = [
    { source: "src-duty", stage: "draft", d: hvCurve(port(sources["src-duty"], "right"), port(nodes.draft, "top")) },
    { source: "src-policy", stage: "suggest", d: hCurve(port(sources["src-policy"], "right"), port(nodes.suggest, "left", 0.6)) },
    { source: "src-controls", stage: "suggest", d: hCurve(port(sources["src-controls"], "right"), port(nodes.suggest, "left", 0.8)) },
    { source: "src-profile", stage: "checks", d: hvBottom(port(sources["src-profile"], "right"), port(g, "bottom")) },
  ];
  // D6 is the sixth of seven cells; cells sit in the gate body
  const cellY = g.y + 90 + 5 * 21 + 8;
  return {
    H: 720,
    nodes,
    sources,
    trays,
    chain,
    sourceLinks,
    writeBack: writeBackFrom(port(nodes.handoff, "left"), -1, 720),
    record: RECORD,
    ownerLine: { from: [g.x + g.w, cellY], to: port(nodes.owner, "top", 0.5) },
  };
}

function layoutCoverage1026(run: Run): Layout {
  const Y = 200;
  const nodes: Record<string, NodeGeo> = {
    read: node("read", 0, Y, "upper"),
    search: node("search", 1, Y, "upper"),
    compare: node("compare", 2, Y, "upper"),
    decide: node("decide", 3, Y, "upper"),
  };
  const sources = sourceBoxes(run, 380, 52);
  const s = nodes.search;
  const trays: Record<string, TrayGeo> = {
    search: { key: "search", label: "Candidates", from: "search", x: s.x, y: s.y + s.h + 28, w: s.w + 40, h: 120, entry: [s.x + s.w / 2, s.y + s.h + 28] },
  };
  const sourceLinks = run.sources.map((src) => ({
    source: src.id,
    stage: "search",
    d: hvBottom(port(sources[src.id], "right"), port(s, "bottom", src.id === "src-policies" ? 0.3 : src.id === "src-procedures" ? 0.5 : 0.7)),
  }));
  return {
    H: 560,
    nodes,
    sources,
    trays,
    chain: chainFor(run, nodes),
    sourceLinks,
    writeBack: writeBackFrom(port(nodes.decide, "right"), 1, 560),
    record: RECORD,
  };
}

const cache = new Map<string, Layout>();
export function layoutFor(run: Run): Layout {
  const hit = cache.get(run.id);
  if (hit) return hit;
  const l = run.id === "run-design-mfa" ? layoutDesignMfa(run) : run.id === "run-coverage-1026" ? layoutCoverage1026(run) : layoutRule1005(run);
  cache.set(run.id, l);
  return l;
}

/** The path a packet takes for a move from one place to another. */
export function pathFor(layout: Layout, from: string, to: string, srcLinkIndex = 0): string {
  const { nodes, sources, trays } = layout;
  const chain = layout.chain.find((c) => c.from === from && c.to === to);
  if (chain) return chain.d;
  if (sources[from]) {
    const link = layout.sourceLinks.filter((l) => l.source === from && l.stage === to)[srcLinkIndex] ?? layout.sourceLinks.find((l) => l.source === from);
    if (link && link.stage === to) return link.d;
    const n = nodes[to];
    if (n) return hvCurve(port(sources[from], "right"), port(n, "top"));
  }
  if (trays[to] && nodes[from]) {
    return vLine(port(nodes[from], "bottom", trayEntryFraction(nodes[from], trays[to])), trays[to].entry);
  }
  if (nodes[from] && nodes[to]) {
    // not neighbours: hop over the stage between, from top port to top port
    const a = port(nodes[from], "top", 0.78);
    const b = port(nodes[to], "top", 0.22);
    const lift = 46;
    return `M ${a[0]} ${a[1]} C ${a[0]} ${a[1] - lift}, ${b[0]} ${b[1] - lift}, ${b[0]} ${b[1]}`;
  }
  if (nodes[from]) return vLine(port(nodes[from], "bottom"), [nodes[from].x + nodes[from].w / 2, nodes[from].y + nodes[from].h + 40]);
  return "M 0 0 L 1 1";
}

function trayEntryFraction(n: NodeGeo, t: TrayGeo) {
  return Math.min(0.9, Math.max(0.1, (t.entry[0] - n.x) / n.w));
}
