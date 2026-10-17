"use client";

import { Redirect } from "@/components/shell/redirect";
import { run } from "@/data";

/** The separate run page is gone: runs play in place on the change map. */
export function RunRoute({ id }: { id: string }) {
  const r = run(id);
  return <Redirect to={r ? `/rules/${r.change_id}/?replay=1` : "/rules/"} />;
}
