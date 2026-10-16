import { describe, expect, it } from "vitest";
import { usePlayback } from "./engine";
import { useStore } from "@/lib/store";

const tickFor = (ms: number, step = 16) => {
  for (let t = 0; t < ms; t += step) usePlayback.getState().tick(step);
};

describe("playback engine", () => {
  it("plays at 1x, stops at the person checkpoint, resumes and applies results", () => {
    const p = usePlayback.getState();
    p.ensure("k", "run-rule-1005");
    p.play("k");
    tickFor(25000);
    const i = usePlayback.getState().instances.k;
    expect(i.t).toBe(20840);
  });

  it("4x reaches the same point four times faster", () => {
    const p = usePlayback.getState();
    p.ensure("a", "run-design-mfa");
    p.ensure("b", "run-design-mfa");
    p.setSpeed("b", 4);
    p.play("a");
    p.play("b");
    tickFor(1000);
    const { a, b } = usePlayback.getState().instances;
    expect(Math.round(b.t)).toBe(Math.round(a.t * 4));
  });

  it("finishing run-rule-1005 turns RC-2026-014 into What's left with 4, 1, 1, 0", async () => {
    const { personEvents } = await import("./derive");
    const { run } = await import("@/data");
    const r = run("run-rule-1005")!;
    const key = String(personEvents(r)[0].i);
    const p = usePlayback.getState();
    p.ensure("live", "run-rule-1005", { speed: 4 });
    p.play("live");
    tickFor(8000);
    expect(usePlayback.getState().instances.live.t).toBe(20840);
    p.respond("live", key, "accept_all", "u-elena", "2026-10-16T09:00:00Z");
    tickFor(4000);
    const done = usePlayback.getState().instances.live;
    expect(done.t).toBe(r.duration_ms);
    expect(done.completed).toBe(true);
    const o = useStore.getState().changes["RC-2026-014"];
    expect(o.state).toBe("whats_left");
    expect([o.counts!.covered, o.counts!.not_yet_confirmed, o.counts!.nothing_behind, o.counts!.known_gap]).toEqual([4, 1, 1, 0]);
    expect(useStore.getState().record.length).toBeGreaterThan(0);
  });
});
