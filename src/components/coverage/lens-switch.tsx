"use client";

import { cn } from "@/lib/utils";
import type { Plot } from "@/lib/coverage-field";
import { BAND_WORD, ownersInField, type DeadlineBand, type Lens } from "@/lib/lens";
import { Segmented } from "@/components/core/tabs";
import { categoryColours, STATE_VAR, STATE_WORD, useSceneTokens } from "@/components/scene";

/** State | Owner | Deadline, shared by Coverage and the Today mini field. */
export function LensSwitch({ lens, onChange, size = 32 }: { lens: Lens; onChange: (l: Lens) => void; size?: 28 | 32 }) {
  return (
    <span data-demo="D5-2">
      <Segmented<Lens>
        label="Colour the field by"
        size={size}
        value={lens}
        onChange={onChange}
        options={[
          { value: "state", label: "State" },
          { value: "owner", label: "Owner" },
          { value: "deadline", label: "Deadline" },
        ]}
      />
    </span>
  );
}

/** What the colours mean under the current lens. */
export function LensLegend({ lens, plots, className }: { lens: Lens; plots: Plot[]; className?: string }) {
  const tk = useSceneTokens();
  if (!tk) return null;
  const items =
    lens === "owner"
      ? ownersInField(plots).map((o, i) => ({ k: o.id, label: o.name, color: categoryColours(tk)[i % 8] }))
      : lens === "deadline"
        ? (["late", "soon", "later", "none"] as DeadlineBand[]).map((b) => ({ k: b, label: BAND_WORD[b], color: tk[b === "late" ? "--vizRisk" : b === "soon" ? "--vizWarn" : b === "later" ? "--vizOk" : "--vizMuted"] }))
        : (Object.keys(STATE_VAR) as (keyof typeof STATE_VAR)[]).map((s) => ({ k: s, label: STATE_WORD[s], color: tk[STATE_VAR[s]] }));
  return (
    <ul aria-label="Legend" className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink2", className)}>
      {items.map((i) => (
        <li key={i.k} className="flex items-center gap-1.5">
          <span className="block size-[10px] rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
