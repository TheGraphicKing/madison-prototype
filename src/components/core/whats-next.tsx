"use client";

// The small card at the end of every story: two or three ways on, always including Today.
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PersonaId } from "@/data";
import { useStore } from "@/lib/store";
import { useNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

export type NextLink = { label: string; href: string; as?: PersonaId; highlight?: string; demo?: string };

export function WhatsNext({ title = "What's next", text, links, className }: { title?: string; text?: string; links: NextLink[]; className?: string }) {
  const router = useRouter();
  const setPersona = useStore((s) => s.setPersona);
  const all = links.some((l) => l.href === "/" && !l.as) ? links : [...links, { label: "Back to Today", href: "/" }];
  return (
    <section aria-label="What's next" className={cn("rounded-[14px] bg-ok-soft p-4", className)}>
      <h2 className="text-[13px] font-medium text-ok">{title}</h2>
      {text ? <p className="mt-1 text-[13.5px] leading-[21px] text-ink">{text}</p> : null}
      <ul className="mt-3 flex flex-wrap gap-2">
        {all.map((l) => (
          <li key={l.label}>
            {l.as ? (
              <button
                onClick={() => {
                  setPersona(l.as!);
                  useNav.getState().setHighlight(l.highlight ?? null);
                  router.push(l.href);
                }}
                data-demo={l.demo}
                className="inline-flex h-8 items-center rounded-[10px] bg-surface px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2"
              >
                {l.label}
              </button>
            ) : (
              <Link href={l.href} data-demo={l.demo} className={cn("inline-flex h-8 items-center rounded-[10px] px-3 text-[13px] font-medium", l.href === "/" ? "bg-ink text-surface hover:opacity-90" : "bg-surface shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2")}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
