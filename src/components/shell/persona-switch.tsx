"use client";

import { PERSONA_IDS, type PersonaId, userById } from "@/data";
import { useStore } from "@/lib/store";
import { MenuButton } from "./menu";
import { Initials } from "@/components/core/tags";
import { Mark } from "@/components/core/mark";
import { MonoLabel } from "@/components/core/labels";

/** "Viewing as": changes greetings, task lists, and who can act at person checkpoints. */
export function PersonaSwitch() {
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const toast = useStore((s) => s.toast);
  const u = userById(persona)!;
  return (
    <MenuButton<PersonaId>
      label={`Viewing as ${u.name}`}
      value={persona}
      options={[...PERSONA_IDS]}
      width={300}
      heading={<MonoLabel variant="plain">Viewing as</MonoLabel>}
      onPick={(id) => {
        if (id !== persona) {
          setPersona(id);
          toast(`Now viewing as ${userById(id)!.name}`);
        }
      }}
      button={
        <>
          <span className="t-label max-lg:hidden">Viewing as</span>
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
  );
}
