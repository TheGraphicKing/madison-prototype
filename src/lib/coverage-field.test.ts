import { describe, expect, it } from "vitest";
import { coverageField, STATES } from "./coverage-field";
import { position } from "@/data";

describe("coverage field", () => {
  it("has exactly the position totals, per state", () => {
    const { tiles, plots } = coverageField();
    const p = position();
    expect(tiles.length).toBe(p.total_applicable);
    for (const s of STATES) expect(tiles.filter((t) => t.state === s).length).toBe(p[s]);
    expect(plots.reduce((n, x) => n + x.total, 0)).toBe(1894);
  });
  it("keeps by_regulation counts exact", () => {
    const { plots } = coverageField();
    for (const r of position().by_regulation) {
      const pl = plots.find((x) => x.regulationId === r.regulation_id)!;
      expect(pl.counts.covered).toBe(r.covered);
      expect(pl.counts.known_gap).toBe(r.known_gap);
    }
  });
});
