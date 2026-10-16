import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store";
import { handoffById, tasks } from "@/data";
import { handoffStatus, raiseHandoff, respondHandoff, taskView } from "./work";

const st = () => useStore.getState();
beforeEach(() => st().reset());

describe("handoffs and tasks", () => {
  it("there are 20 tasks across 8 assignees (the brief says 9; the data has 8)", () => {
    expect(tasks).toHaveLength(20);
    expect(new Set(tasks.map((t) => t.assignee_id)).size).toBe(8);
  });

  it("H-118 does not exist until the drift is raised, then Grace has a task", () => {
    expect(handoffStatus(handoffById("H-118")!, st())).toBe("dormant");
    expect(taskView(tasks.find((t) => t.id === "T-295")!, st()).hidden).toBe(true);
    raiseHandoff("H-118");
    expect(handoffStatus(handoffById("H-118")!, st())).toBe("open");
    expect(taskView(tasks.find((t) => t.id === "T-295")!, st()).hidden).toBe(false);
  });

  it("loop 1: Grace updates the procedure, Elena is told, D-1026-L2 is covered", () => {
    raiseHandoff("H-118");
    respondHandoff("H-118", "fix", { new_text: "Within 3 business days", effective: "2026-10-26" }, "u-grace");
    expect(handoffStatus(handoffById("H-118")!, st())).toBe("done");
    expect(st().obligationStates["D-1026-L2"]).toBe("covered");
    expect(st().notices.some((n) => n.to === "u-elena" && n.title === "Grace Liu responded")).toBe(true);
    expect(taskView(tasks.find((t) => t.id === "T-295")!, st()).state).toBe("done");
    expect(st().changes["RC-2026-016"].counts!.covered).toBe(2);
  });

  it("loop 2: Anthony is blocked until Priya answers, then signs and CTL-153 is in force", () => {
    const t297 = tasks.find((t) => t.id === "T-297")!;
    expect(taskView(t297, st()).state).toBe("blocked");
    respondHandoff("H-117", "answer", { answer: "Yes, but it is vaulted and needs two officers" }, "u-priya");
    expect(taskView(t297, st()).state).toBe("open");
    respondHandoff("H-116", "approve", { decision: "Approve" }, "u-anthony");
    expect(st().changes["RC-2026-011"].new_control).toBe("CTL-153");
    expect(st().obligationStates["D-208-M1"]).toBe("covered");
    expect(st().finishedRuns["run-design-mfa"]).toBeTruthy();
  });

  it("Reset demo restores the seed", () => {
    raiseHandoff("H-118");
    st().reset();
    expect(handoffStatus(handoffById("H-118")!, st())).toBe("dormant");
  });
});
