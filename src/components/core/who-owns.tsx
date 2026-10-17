"use client";

// The standard "Who owns this" block: process area, business line, the accountable owner,
// the policy and control owners, then who reviews and who approves.
import { areaForChange, areaForRegulation, businessLine, ownersOf, userById } from "@/data";
import { cn } from "@/lib/utils";
import { Initials } from "./tags";

type Props = { dutyId?: string; changeId?: string; regulation?: string; className?: string; compact?: boolean };

export function WhoOwns({ dutyId, changeId, regulation, className, compact }: Props) {
  const o = dutyId ? ownersOf(dutyId) : undefined;
  const area = o?.area ?? (changeId ? areaForChange(changeId) : regulation ? areaForRegulation(regulation) : undefined);
  const line = o?.line ?? (area ? businessLine(area.business_line) : undefined);
  const owner = userById(o?.accountable ?? area?.owner_id ?? "");
  const extra = [
    o?.policyOwner && o.policyOwner !== owner?.id ? `Policy: ${userById(o.policyOwner)?.name}` : null,
    o?.controlOwners.length ? `Controls: ${o.controlOwners.filter((c) => c !== owner?.id).map((c) => userById(c)?.name).filter(Boolean).join(", ") || owner?.name}` : null,
  ].filter(Boolean);
  return (
    <section aria-label="Who owns this" className={cn("rounded-[12px] bg-surface2 px-3.5 py-3", className)}>
      <div className="text-[12px] font-medium text-ink3">Who owns this</div>
      {area ? (
        <p className="mt-1 text-[13px] text-ink2">
          {area.name}
          {line ? ` · ${line.name}` : ""}
        </p>
      ) : null}
      {owner ? (
        <div className="mt-2 flex items-center gap-2.5">
          <Initials initials={owner.initials} size={28} />
          <span className="min-w-0">
            <span className="block text-[14px] leading-5 font-medium">{owner.name}</span>
            <span className="block text-[12.5px] text-ink2">{owner.role}</span>
          </span>
        </div>
      ) : (
        <p className="mt-1 text-[13.5px] text-ink2">{changeId || dutyId ? "No business owner: the rule does not apply." : "Owned by compliance until a process area is named."}</p>
      )}
      {!compact && extra.length ? <p className="mt-2 text-[12.5px] text-ink2">{extra.join(" · ")}</p> : null}
      <p className="mt-2 text-[12.5px] text-ink2">
        Reviewed by {userById("u-elena")?.name} · Approved by {userById("u-anthony")?.name}
      </p>
    </section>
  );
}
