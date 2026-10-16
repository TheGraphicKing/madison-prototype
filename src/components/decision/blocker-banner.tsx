"use client";

import { tasks, userById } from "@/data";
import { useStore } from "@/lib/store";
import { useBlockers } from "@/lib/work";
import { fmtDate } from "@/lib/dates";

/** "Blocked: waiting on Grace Liu to …", with a link to the handoff, for one change. */
export function BlockerBanner({ changeId, className }: { changeId: string; className?: string }) {
  const blockers = useBlockers(changeId);
  const openTask = useStore((s) => s.openTask);
  if (!blockers.length) return null;
  return (
    <div className={className}>
      <ul className="flex flex-col gap-2">
        {blockers.map(({ h, st }) => {
          const t = tasks.find((x) => x.handoff_id === h.id);
          return (
            <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] bg-warn-soft px-4 py-3 text-[14px] text-warn">
              <span className="min-w-0 flex-1">
                <span className="font-medium">Blocked:</span> waiting on {userById(h.to_user_id)?.name} to {h.title.charAt(0).toLowerCase() + h.title.slice(1)}
                {st === "waiting_on_previous" ? " (after an earlier answer)" : ""} · due {fmtDate(h.due)}
              </span>
              {t ? (
                <button onClick={() => openTask(t.id)} className="shrink-0 text-[13.5px] font-medium underline underline-offset-4">
                  Open the request
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
