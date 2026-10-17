"use client";

import { PERSONA_IDS, type PersonaId, userById } from "@/data";
import { useStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { switchPersona } from "@/lib/nav";
import { MenuButton } from "./menu";
import { Initials } from "@/components/core/tags";
import { Mark } from "@/components/core/mark";
import { MonoLabel } from "@/components/core/labels";

/** "Viewing as": changes greetings, task lists, and who can act at person checkpoints. */
export function PersonaSwitch() {
  const persona = useStore((s) => s.persona);
  const pathname = usePathname();
  const router = useRouter();
  const toast = useStore((s) => s.toast);
  const u = userById(persona)!;
  return (
    <span data-demo="D3-5" className="inline-flex">
    <MenuButton<PersonaId>
      label={`Viewing as ${u.name}`}
      value={persona}
      options={[...PERSONA_IDS]}
      width={300}
      heading={<MonoLabel>Viewing as</MonoLabel>}
      onPick={(id) => {
        if (id !== persona) {
          switchPersona(id, pathname, (h) => router.push(h));
          toast(`Now viewing as ${userById(id)!.name}`);
        }
      }}
      button={
        <>
          <span className="text-[12.5px] text-ink3 max-lg:hidden">Viewing as</span>
          <Initials initials={u.initials} size={20} />
          <span className="max-sm:hidden">{u.name}</span>
          <Mark kind="chevron-down" size={12} className="text-ink3" />
        </>
      }
      renderOption={(id, sel) => {
        const p = userById(id)!;
        return (
          <>
            <Initials initials={p.initials} size={28} filled={sel} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-medium text-ink">{p.name}</span>
              <span className="text-[12px] leading-[17px] text-ink2">{p.role}</span>
            </span>
            {sel ? <Mark kind="check" /> : null}
          </>
        );
      }}
    />
    </span>
  );
}
