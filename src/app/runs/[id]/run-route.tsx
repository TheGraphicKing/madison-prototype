"use client";

import { useSearchParams } from "next/navigation";
import { RunView } from "@/components/run/run-view";
import { run } from "@/data";

export function RunRoute({ id }: { id: string }) {
  const sp = useSearchParams();
  const r = run(id);
  const mode = sp.get("mode") === "live" ? "live" : "replay";
  const from = sp.get("from") ?? (r ? `/rules/${r.change_id}/` : "/");
  // replays, demos and "How Madison got here" open the Agent view; live runs started from the change room ask for Simple
  const view = sp.get("view") === "simple" ? "simple" : "agent";
  return <RunView key={`${id}-${mode}`} runId={id} mode={mode} from={from} step={sp.get("step")} view={view} />;
}
