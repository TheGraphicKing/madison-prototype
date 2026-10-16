import { describe, expect, it } from "vitest";
import { run, getChange } from "@/data";
import { blockingTime, clampTime, derive, nextTime, personEvents, prevTime } from "./derive";

const reg = run("run-rule-1005")!;
const mfa = run("run-design-mfa")!;
const cov = run("run-coverage-1026")!;
const answerAll = (r: typeof reg) => Object.fromEntries(personEvents(r).map((p) => [String(p.i), p.e.actions[0].id]));

describe("derive: state at a given time", () => {
  it("starts with every stage waiting except the first running", () => {
    const s = derive(reg, 0, {});
    expect(s.stages.text.state).toBe("running");
    expect(s.stages.sections.state).toBe("waiting");
    expect(s.narration?.text).toMatch(/Fetching/);
  });

  it("at 5,400 ms the sections are split: 14 sections, 2 changed", () => {
    const s = derive(reg, 5400, {});
    expect(s.stages.sections.state).toBe("done");
    expect(s.metrics.sections).toBe(14);
    const sections = Object.values(s.resting).filter((i) => i.kind === "section");
    expect(sections).toHaveLength(14);
    expect(sections.filter((i) => i.changed)).toHaveLength(2);
  });

  it("packets are in flight for one hop, then rest at their destination", () => {
    const s = derive(reg, 900 + 350, {});
    expect(s.inFlight.map((i) => i.id)).toContain("doc-1005");
    expect(s.inFlight[0].progress).toBeCloseTo(0.5, 2);
    const later = derive(reg, 900 + 701, {});
    expect(later.inFlight).toHaveLength(0);
    expect(later.resting["doc-1005"].to).toBe("text");
  });

  it("the reviewer holds one duty back", () => {
    const s = derive(reg, 20840, {});
    expect(s.metrics.held_back).toBe(1);
    expect(s.resting["D-1005-Z9"].to).toBe("held");
    expect(s.checkFor["RC-04|D-1005-Z9"].result).toBe("block");
  });
});

describe("derive: pauses at person events", () => {
  it("the clock cannot pass Elena's decision without a response", () => {
    expect(blockingTime(reg, {})).toBe(20840);
    const s = derive(reg, 30000, {});
    expect(s.t).toBe(20840);
    expect(s.pending?.waiting_for).toBe("u-elena");
    expect(s.stages.decide.state).toBe("waiting_person");
    expect(s.stages.coverage.state).toBe("waiting");
    expect(s.done).toBe(false);
  });

  it("resumes after the response, and finishes", () => {
    const s = derive(reg, reg.duration_ms, answerAll(reg));
    expect(s.pending).toBeNull();
    expect(s.done).toBe(true);
    expect(s.stages.touches.state).toBe("done");
    expect(s.chart.map((c) => c.value)).toEqual([1, 2, 3, 4]);
    expect(s.metrics.cost_usd).toBe(1.07);
  });

  it("the MFA run waits for Priya, then for Anthony", () => {
    expect(derive(mfa, 99999, {}).pending?.waiting_for).toBe("u-priya");
    const priya = { [String(personEvents(mfa)[0].i)]: "answer" };
    const s = derive(mfa, 99999, priya);
    expect(s.pending?.waiting_for).toBe("u-anthony");
    expect(s.checkFor["D6|CTL-153"].result).toBe("pass");
    expect(derive(mfa, 99999, answerAll(mfa)).done).toBe(true);
  });

  it("D6 shows can't tell before Priya answers", () => {
    const s = derive(mfa, 9350, {});
    expect(s.checkFor["D6|CTL-153"].result).toBe("cannot_tell");
  });

  it("events after the person event at the same time also wait", () => {
    const s = derive(cov, 99999, {});
    expect(s.t).toBe(4900);
    expect(s.stages.decide.state).toBe("waiting_person");
  });
});

describe("seek and speed", () => {
  it("seeking backwards gives exactly the earlier state", () => {
    const resp = answerAll(reg);
    const forward = derive(reg, 9000, resp);
    derive(reg, 28000, resp);
    const back = derive(reg, 9000, resp);
    expect(back).toEqual(forward);
  });

  it("clampTime keeps seeks inside the run and before unanswered people", () => {
    expect(clampTime(reg, -50, {})).toBe(0);
    expect(clampTime(reg, 25000, {})).toBe(20840);
    expect(clampTime(reg, 99999, answerAll(reg))).toBe(reg.duration_ms);
  });

  it("speed only scales time: 4x for 1 s equals 1x at 4 s", () => {
    const at4x = derive(reg, 0 + 1000 * 4, {});
    const at1x = derive(reg, 4000, {});
    expect(at4x).toEqual(at1x);
  });

  it("stepping moves between distinct event times", () => {
    expect(nextTime(reg, 0)).toBe(900);
    expect(prevTime(reg, 900)).toBe(0);
  });
});

describe("results", () => {
  it("RC-2026-014 after the run is What's left with 4, 1, 1, 0", () => {
    const c = getChange("RC-2026-014")!;
    expect(c.state).toBe("new");
    expect(c.after_run?.state).toBe("whats_left");
    const k = c.after_run!.counts;
    expect([k.covered, k.not_yet_confirmed, k.nothing_behind, k.known_gap]).toEqual([4, 1, 1, 0]);
  });
});

