"use client";

import { useSearchParams } from "next/navigation";
import { Canvas } from "@/components/canvas/canvas";
import { run } from "@/data";

export function RunRoute({ id }: { id: string }) {
  const sp = useSearchParams();
  const r = run(id);
  const mode = sp.get("mode") === "live" ? "live" : "replay";
  const from = sp.get("from") ?? (r ? `/rules/${r.change_id}/` : "/");
  return <Canvas runId={id} mode={mode} from={from} />;
}
