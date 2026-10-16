"use client";

import { useSearchParams } from "next/navigation";
import { RunView } from "@/components/run/run-view";
import { run } from "@/data";

export function RunRoute({ id }: { id: string }) {
  const sp = useSearchParams();
  const r = run(id);
  const mode = sp.get("mode") === "live" ? "live" : "replay";
  const from = sp.get("from") ?? (r ? `/rules/${r.change_id}/` : "/");
  return <RunView key={`${id}-${mode}`} runId={id} mode={mode} from={from} step={sp.get("step")} />;
}
