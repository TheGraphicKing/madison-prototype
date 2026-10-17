"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getChange } from "@/data";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate, relDays } from "@/lib/dates";
import { respondHandoff, useTaskView } from "@/lib/work";
import { taskSpec } from "@/lib/task-spec";
import { DecisionPanel } from "@/components/decision/decision-panel";
import { Field } from "./task-drawer";

/** Fields, readiness and submit for one task: shared by the task drawer and "Your task now". */
export function useTaskAction(taskId: string) {
  const v = useTaskView(taskId);
  const store = useStore();
  const router = useRouter();
  const persona = store.persona;
  const spec = useMemo(() => (v ? taskSpec(v.task, v.handoff) : null), [v]);
  const local = v?.handoff ? store.handoffs[v.handoff.id] : undefined;
  const [fields, setFields] = useState<Record<string, string>>(() => local?.fields ?? {});
  if (!v || !spec) return null;
  const t = v.task;
  const isMine = t.assignee_id === persona;
  const blocked = v.state === "blocked";
  const done = v.state === "done";
  const required = spec.needed.filter((f) => f.required);
  const ready = required.every((f) => (fields[f.id] ?? "").trim().length > 0 && !(fields[f.id] ?? "").includes('"_partial"'));

  const submit = (optionId: string) => {
    const o = spec.options.find((x) => x.id === optionId);
    if (o?.href) {
      store.openTask(null);
      router.push(o.href);
      return;
    }
    if (v.handoff) {
      respondHandoff(v.handoff.id, optionId, fields, persona);
      return;
    }
    const at = demoNowIso();
    const c = t.change_id ? getChange(t.change_id) : undefined;
    const text = `${o?.label}: ${t.title}${c ? ` (${c.citation})` : ""}`;
    store.decide({ label: o?.label ?? optionId, text, by: persona, at, changeId: t.change_id });
    store.addRecord({ at, who: persona, kind: "person", what: text, changeId: t.change_id, live: true });
    if (optionId === "nudge") {
      store.toast("Reminder sent to Corvane Payments");
      return;
    }
    store.completeTask(t.id, persona, at);
    if (t.id === "T-289") store.overrideChange("RC-2026-013", { state: "linked", step: "linked" });
    store.toast(`${o?.label ?? "Done"}.`);
  };

  // guide targets: the answer that moves each demo flow on
  const DEMO: Record<string, string> = { "H-117": "D2-4", "H-116:approve": "D2-5", "H-118:fix": "D3-4", "H-114": "D4-3", "T-280:approve": "D5-4" };
  const demoFor = (oid: string) => DEMO[`${v.handoff?.id ?? t.id}:${oid}`] ?? (v.handoff && spec.options[0]?.id === oid ? DEMO[v.handoff.id] : undefined);
  const options = spec.options.map((o) => ({ ...o, demo: demoFor(o.id), disabled: (o.primary && !o.href && !ready) || blocked || !isMine }));
  const doneInfo = done
    ? {
        label: local?.option ? spec.options.find((o) => o.id === local.option)?.label ?? "Done" : (store.decisions.find((d) => d.text.includes(t.title))?.label ?? "Done"),
        by: local?.by ?? store.tasksDone[t.id]?.by ?? t.assignee_id,
        at: local?.at ?? store.tasksDone[t.id]?.at ?? demoNowIso(),
      }
    : null;
  return { v, t, spec, fields, setFields, submit, options, ready, isMine, blocked, done, doneInfo, local };
}

/** A task as a Decision panel, with its form and evidence: "Your task now" in the change room. */
export function TaskDecision({ taskId, next, className, hideEvidence, compact }: { taskId: string; next?: string; className?: string; hideEvidence?: boolean; compact?: boolean }) {
  const a = useTaskAction(taskId);
  if (!a) return null;
  const { t, spec, fields, setFields, submit, options, isMine, blocked, done, doneInfo, v } = a;
  return (
    <DecisionPanel
      compact={compact}
      className={className}
      deciding={spec.ask}
      why={
        <>
          {spec.why}
          {spec.blocks.length ? <span className="mt-1 block text-[13.5px] text-ink2">Until this is done: {spec.blocks.join("; ")}.</span> : null}
          {blocked && v.waitsOn ? <span className="mt-2 block rounded-[10px] bg-warn-soft px-3 py-2 text-[13.5px] text-warn">Blocked. {v.waitsOn}.</span> : null}
        </>
      }
      deadline={`${fmtDate(t.due)} (${relDays(t.due)})`}
      evidence={hideEvidence ? [] : spec.provided.map((p, i) => ({ key: String(i), label: p.label, summary: p.kind === "quote" ? `“${p.text}”` : p.text }))}
      options={options}
      decider={t.assignee_id}
      next={next}
      onChoose={submit}
      done={doneInfo}
      form={
        spec.needed.length ? (
          <div className="flex flex-col gap-4">
            {spec.needed.map((f) => (
              <Field key={f.id} f={f} value={fields[f.id] ?? ""} onChange={(val) => setFields((x) => ({ ...x, [f.id]: val }))} disabled={done || !isMine || blocked} changeId={t.change_id} />
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
