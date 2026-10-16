// What a finished run changes in the prototype: the change's state and counts,
// record entries for the agents' work, finished tasks, and a toast in plain words.
import { getChange, run as getRun, userById } from "@/data";
import { useStore } from "@/lib/store";
import { demoNowIso } from "@/lib/dates";
import type { Instance } from "./engine";

export function applyRunResults(inst: Instance) {
  const r = getRun(inst.runId);
  if (!r) return;
  const s = useStore.getState();
  if (s.finishedRuns[r.id]) return;
  const at = demoNowIso();
  const by = s.persona;
  const change = getChange(r.change_id);

  // agent work, written to the record
  const stageDone = r.events.filter((e) => e.type === "stage" && e.state === "done" && e.detail);
  for (const e of stageDone) {
    if (e.type !== "stage") continue;
    const stage = r.stages.find((x) => x.key === e.stage);
    if (!stage || stage.kind === "person") continue;
    s.addRecord({
      at,
      who: stage.agents[0],
      kind: "agent",
      what: stage.title.endsWith("?") ? `${stage.title} ${e.detail}` : `${stage.title}: ${e.detail}`,
      runId: r.id,
      changeId: r.change_id,
      live: true,
    });
  }

  if (change?.after_run) {
    s.overrideChange(change.id, {
      state: change.after_run.state,
      step: change.after_run.step,
      counts: change.after_run.counts,
      new_control: change.after_run.new_control,
    });
  }

  if (r.id === "run-rule-1005") {
    s.completeTask("T-301", by, at);
    s.toast(`6 obligations accepted for ${change?.citation}. One gap and one drift to fix.`, `/rules/${r.change_id}/?step=whats_left`);
  } else if (r.id === "run-design-mfa") {
    s.completeTask("T-298", by, at);
    s.toast("CTL-153 is in force. Three vendors and Assurance have their handoffs.", `/rules/${r.change_id}/`);
  } else if (r.id === "run-coverage-1026") {
    s.completeTask("T-296", by, at);
    const grace = userById("u-grace")?.name ?? "the owner";
    const linkOnly = Object.values(inst.responses).includes("link_only");
    s.decideLink("LNK-021", "confirmed");
    s.toast(linkOnly ? "Linked POL-MTG-02 3.1 to the revised Loan Estimate duty." : `Linked, and the drift is raised to ${grace}.`, `/rules/${r.change_id}/`);
  }

  s.finishRun(r.id, by, at, inst.responses);
}
