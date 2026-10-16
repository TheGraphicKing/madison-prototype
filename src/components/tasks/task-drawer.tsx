"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { NeededField } from "@/data/types";
import { getChange, taskById, userById, vendorsFor } from "@/data";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate, fmtStamp, relDays } from "@/lib/dates";
import { respondHandoff, useTaskView, type TaskState } from "@/lib/work";
import { kindOf, taskSpec } from "@/lib/task-spec";
import { SlideOver } from "@/components/core/overlays";
import { Button } from "@/components/core/button";
import { Mark } from "@/components/core/mark";
import { Initials } from "@/components/core/tags";
import { TaskGlyph, TASK_KIND_LABEL } from "@/components/glyphs";
import { DecisionPanel } from "@/components/decision/decision-panel";

export const STATE_CHIP: Record<TaskState, { label: string; bg: string; fg: string }> = {
  open: { label: "Open", bg: "var(--surface2)", fg: "var(--ink2)" },
  overdue: { label: "Overdue", bg: "var(--riskSoft)", fg: "var(--risk)" },
  blocked: { label: "Blocked", bg: "var(--warnSoft)", fg: "var(--warn)" },
  waiting_on_other: { label: "Waiting on others", bg: "var(--infoSoft)", fg: "var(--info)" },
  done: { label: "Done", bg: "var(--okSoft)", fg: "var(--ok)" },
};

export function StateChip({ state }: { state: TaskState }) {
  const c = STATE_CHIP[state];
  return (
    <span className="inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap" style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

/** Quotes with their numbers and day counts highlighted. */
export function KeyWords({ text }: { text: string }) {
  const parts = text.split(/(\b\d+(?:,\d{3})*\s(?:business\s)?days?\b|\b(?:three|five|ten|two)\s(?:business\s)?days?\b|day\s\d+\b)/i);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-[4px] bg-highlight px-1 text-highlight-ink">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** Where a provided item points: drafts open the run, records open their page. */
function hrefFor(label: string): string | undefined {
  if (/DR-031/.test(label)) return "/rules/RC-2026-014/#card-whats_left";
  if (/DR-029/.test(label)) return "/rules/RC-2026-016/#card-whats_left";
  if (/CTL-153/.test(label)) return "/runs/run-design-mfa/?mode=replay&from=/tasks/";
  if (/POL-|PRC-/.test(label)) {
    const id = label.match(/(POL-[A-Z]+-\d+) ([\d.]+)|(PRC-[A-Z]+-\d+) step (\d+)/);
    if (id?.[1]) return `/coverage/?view=documents&doc=${id[1]}-${id[2]}`;
    if (id?.[3]) return `/coverage/?view=documents&doc=${id[3]}-${id[4]}`;
  }
  if (/Bank profile/.test(label)) return "/rules/RC-2026-019/";
  if (/Vendors in scope/.test(label)) return "/rules/RC-2026-014/?touches=1";
  if (/CTL-132|Last evidence/.test(label)) return "/obligations/D-1005-E2/";
  return undefined;
}

export function TaskDrawer() {
  const id = useStore((s) => s.drawerTask);
  const openTask = useStore((s) => s.openTask);
  const view = useTaskView(id);
  const t = view?.task ?? (id ? taskById(id) : undefined);
  return (
    <SlideOver open={Boolean(id && t)} onOpenChange={(o) => !o && openTask(null)} title={t?.title ?? ""} subtitle={t ? <DrawerHead id={t.id} /> : undefined} width={560}>
      {t && view ? <DrawerBody key={t.id} taskId={t.id} /> : null}
    </SlideOver>
  );
}

function DrawerHead({ id }: { id: string }) {
  const v = useTaskView(id);
  if (!v) return null;
  const t = v.task;
  return (
    <span className="flex flex-wrap items-center gap-3">
      <TaskGlyph kind={kindOf(t)} size={30} />
      <span className="text-[12.5px] text-ink2">
        {TASK_KIND_LABEL[kindOf(t)]}
        {v.from ? ` · from ${userById(v.from)?.name}` : t.requested_by_id ? "" : " · from Madison"}
        {" · due "}
        {fmtDate(t.due)} ({relDays(t.due)})
      </span>
      <StateChip state={v.state} />
    </span>
  );
}

function DrawerBody({ taskId }: { taskId: string }) {
  const v = useTaskView(taskId)!;
  const t = v.task;
  const persona = useStore((s) => s.persona);
  const store = useStore();
  const router = useRouter();
  const spec = useMemo(() => taskSpec(t, v.handoff), [t, v.handoff]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const local = v.handoff ? store.handoffs[v.handoff.id] : undefined;
  const thread = [...(v.handoff?.thread ?? []), ...(v.handoff ? store.threads[v.handoff.id] ?? [] : store.threads[t.id] ?? [])];
  const isMine = t.assignee_id === persona;
  const blocked = v.state === "blocked";
  const done = v.state === "done";
  const required = spec.needed.filter((f) => f.required);
  const ready = required.every((f) => (fields[f.id] ?? "").trim().length > 0 && !(fields[f.id] ?? "").includes('"_partial"'));

  useEffect(() => {
    if (local?.fields) setFields(local.fields);
  }, [local?.fields]);

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
    if (optionId === "nudge") {
      store.toast("Reminder sent to Corvane Payments");
      return;
    }
    store.completeTask(t.id, persona, at);
    if (t.id === "T-289") store.overrideChange("RC-2026-013", { state: "linked", step: "linked" });
    store.toast(`${o?.label ?? "Done"}.`);
  };

  // the optionless primary gate: required fields first
  const options = spec.options.map((o) => ({ ...o, disabled: (o.primary && !o.href && !ready) || blocked || !isMine }));

  const given = (
    <Block title="What you've been given">
      {spec.provided.length === 0 ? <p className="text-[13.5px] text-ink3">Nothing was attached.</p> : null}
      <ul className="flex flex-col gap-2">
        {spec.provided.map((p, i) => {
          const href = hrefFor(p.label);
          return (
            <li key={i} className="rounded-[10px] bg-surface2 px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-medium text-ink2">{p.label}</span>
                {href ? (
                  <Link href={href} onClick={() => store.openTask(null)} className="shrink-0 text-[12.5px] underline underline-offset-4">
                    {p.kind === "draft" ? "Open the draft" : "Open"}
                  </Link>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] leading-[22px]">
                {p.kind === "quote" ? (
                  <>
                    &ldquo;
                    <KeyWords text={p.text} />
                    &rdquo;
                  </>
                ) : (
                  p.text
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </Block>
  );

  const form = spec.needed.length ? (
    <Block title="What you need to provide">
      <div className="flex flex-col gap-4">
        {spec.needed.map((f) => (
          <Field key={f.id} f={f} value={fields[f.id] ?? ""} onChange={(val) => setFields((x) => ({ ...x, [f.id]: val }))} disabled={done || !isMine || blocked} changeId={t.change_id} />
        ))}
      </div>
    </Block>
  ) : null;

  return (
    <div className="flex flex-col gap-7">
      {blocked ? (
        <div className="rounded-[12px] bg-warn-soft px-4 py-3 text-[14px] text-warn">
          <span className="font-medium">Blocked.</span> {v.waitsOn}. You can read everything; the answer opens when it is unblocked.
        </div>
      ) : null}
      {v.state === "waiting_on_other" ? <div className="rounded-[12px] bg-info-soft px-4 py-3 text-[14px] text-info">{v.waitsOn}</div> : null}

      <Block title="What you're asked to do">
        <p className="text-[15px] leading-[24px]">{spec.ask}</p>
      </Block>
      <Block title="Why it matters">
        <p className="text-[14.5px] leading-[23px]">{spec.why}</p>
        {spec.blocks.length ? (
          <ul className="mt-2 flex flex-col gap-1">
            {spec.blocks.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13.5px] text-ink2">
                <span className="mt-[7px] block size-[6px] shrink-0 rounded-[2px] bg-warn" />
                Until this is done: {b}
              </li>
            ))}
          </ul>
        ) : null}
      </Block>

      {spec.decision ? (
        <>
          {given}
          <DecisionPanel
            compact
            deciding={spec.ask}
            why={spec.why}
            deadline={`${fmtDate(t.due)} (${relDays(t.due)})`}
            evidence={[]}
            options={options}
            decider={t.assignee_id}
            next={nextPerson(t.id)}
            onChoose={submit}
            form={form}
            done={done ? { label: local?.option ? spec.options.find((o) => o.id === local.option)?.label ?? "Done" : "Done", by: local?.by ?? store.tasksDone[t.id]?.by ?? t.assignee_id, at: local?.at ?? store.tasksDone[t.id]?.at ?? demoNowIso() } : null}
          />
        </>
      ) : (
        <>
          {given}
          {form}
          <Block title="Options">
            {done ? (
              <div className="flex items-center gap-3 rounded-[10px] bg-ok-soft px-4 py-3 text-[14px] text-ok">
                <Mark kind="check" /> Done{local?.by ? ` by ${userById(local.by)?.name}, ${fmtStamp(local.at!)}` : ""}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {options.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
                    <span className="min-w-0 flex-1 text-[13px] text-ink2">
                      <span className="font-medium text-ink">What happens next: </span>
                      {o.next}
                    </span>
                    <Button variant={o.primary ? "primary" : "quiet"} size={40} disabled={o.disabled} onClick={() => submit(o.id)}>
                      {o.label}
                    </Button>
                  </div>
                ))}
                {!isMine ? <p className="text-[13px] text-ink3">This is {userById(t.assignee_id)?.name}&apos;s task. Switch to them under Viewing as to respond.</p> : null}
                {isMine && !ready && required.length && !blocked ? <p className="text-[13px] text-ink3">Fill the required fields to continue.</p> : null}
              </div>
            )}
          </Block>
        </>
      )}

      <Block title="Thread">
        <ul className="flex flex-col gap-3">
          {thread.map((m, i) => (
            <li key={i} className="flex gap-3">
              <Initials initials={userById(m.by)?.initials ?? "?"} size={26} />
              <div>
                <div className="text-[12.5px] text-ink3">
                  {userById(m.by)?.name} · {fmtStamp(m.at)}
                </div>
                <p className="text-[14px] leading-[21px]">{m.text}</p>
              </div>
            </li>
          ))}
          {thread.length === 0 ? <li className="text-[13.5px] text-ink3">No messages yet.</li> : null}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            store.addThread(v.handoff?.id ?? t.id, { at: demoNowIso(), by: persona, text: note.trim() });
            setNote("");
          }}
        >
          <label className="sr-only" htmlFor="note">
            Add a note
          </label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" className="h-10 min-w-0 flex-1 rounded-[10px] bg-surface px-3 text-[14px] shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:shadow-[inset_0_0_0_1px_var(--ink)]" />
          <Button type="submit" variant="quiet" size={40} disabled={!note.trim()}>
            Add a note
          </Button>
        </form>
      </Block>
    </div>
  );
}

function nextPerson(taskId: string) {
  const map: Record<string, string> = {
    "T-297": "Nadia Brennan sends 3 vendor reviews; Ravi Sethuraman plans a retest",
    "T-284": "Margaret Ellison fixes policy 4.2 and procedure step 4",
    "T-287": "Margaret Ellison, as the gap owner",
    "T-280": "The board risk committee",
    "T-298": "Priya Raman answers D6",
    "T-289": "Madison matches the obligations to policies and controls",
    "T-301": "Anthony Marsh accepts the impact",
  };
  return map[taskId];
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-medium text-ink3">{title}</h3>
      {children}
    </section>
  );
}

function Field({ f, value, onChange, disabled, changeId }: { f: NeededField; value: string; onChange: (v: string) => void; disabled?: boolean; changeId?: string }) {
  const label = (
    <span className="mb-1.5 flex items-center gap-2 text-[13.5px] font-medium">
      {f.label}
      {f.required ? <span className="rounded-full bg-surface2 px-2 text-[11px] font-normal text-ink2">Required</span> : <span className="text-[12px] font-normal text-ink3">Optional</span>}
    </span>
  );
  const box = "w-full rounded-[10px] bg-surface px-3 text-[14px] shadow-[inset_0_0_0_1px_var(--lineStrong)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--ink)] disabled:opacity-60";
  if (f.kind === "text")
    return (
      <label className="block">
        {label}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} className={cn(box, "py-2 leading-[22px]")} />
      </label>
    );
  if (f.kind === "date")
    return (
      <label className="block">
        {label}
        <input type="date" value={value} min="2026-10-16" onChange={(e) => onChange(e.target.value)} disabled={disabled} className={cn(box, "h-10 max-w-[220px]")} />
      </label>
    );
  if (f.kind === "file")
    return (
      <div>
        {label}
        <label className={cn("flex cursor-pointer flex-col items-start gap-1 rounded-[12px] bg-surface2 px-4 py-4 outline-1 outline-line-strong outline-dashed hover:bg-surface3", disabled && "pointer-events-none opacity-60")}>
          <span className="text-[14px] font-medium">{value || "Drop a file, or choose one"}</span>
          <span className="text-[12px] text-ink3">Stays in this browser. The prototype records the file name and size only.</span>
          <input
            type="file"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChange(`${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`);
            }}
          />
        </label>
      </div>
    );
  if (f.kind === "choice")
    return (
      <fieldset>
        <legend>{label}</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {f.choices?.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value === c}
              disabled={disabled}
              onClick={() => onChange(c)}
              className={cn("rounded-full px-3.5 py-2 text-left text-[13.5px] leading-5 transition-colors", value === c ? "bg-ink text-surface" : "bg-surface2 text-ink hover:bg-surface3", "disabled:opacity-60")}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>
    );
  // table: one outcome per vendor in scope
  const rows = changeId ? vendorsFor(changeId) : [];
  const parsed: Record<string, string> = value ? JSON.parse(value) : {};
  return (
    <div>
      {label}
      <table className="w-full overflow-hidden rounded-[10px] text-[13.5px] shadow-[inset_0_0_0_1px_var(--line)]">
        <tbody>
          {rows.map(({ vendor }) => (
            <tr key={vendor.id} className="border-b border-line last:border-b-0">
              <td className="px-3 py-2.5">{vendor.name}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {["Meets 5 days", "Needs a fix", "No answer yet"].map((o) => (
                    <button
                      key={o}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const next = { ...parsed, [vendor.id]: o };
                        onChange(Object.keys(next).length === rows.length ? JSON.stringify(next) : JSON.stringify(next).replace(/}$/, ',"_partial":"1"}'));
                      }}
                      className={cn("rounded-full px-2.5 py-1 text-[12px]", parsed[vendor.id] === o ? "bg-ink text-surface" : "bg-surface2")}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
