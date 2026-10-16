"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import { crumbsFor, NAV_ITEMS } from "./crumbs";
import { PersonaSwitch } from "./persona-switch";
import { ColorButton } from "./color-button";
import { useStore } from "@/lib/store";

export function Header() {
  const pathname = usePathname();
  const { crumbs, title } = crumbsFor(pathname);
  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-6 border-b border-line bg-ground gutter-x max-md:h-14">
      <div className="flex min-w-0 flex-col justify-center gap-[3px]">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 max-md:hidden">
          <span className="t-label" aria-hidden>
            /
          </span>
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 ? (
                <span className="t-label" aria-hidden>
                  /
                </span>
              ) : null}
              {c.href ? (
                <Link href={c.href} className="t-label truncate hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className="t-label truncate">{c.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        <div className="truncate text-[15px] leading-5 font-medium text-ink max-md:hidden">{title}</div>
        <MobileBrand />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PersonaSwitch />
        <ColorButton />
        <MobileMenu />
      </div>
    </header>
  );
}

function MobileBrand() {
  return (
    <Link href="/" className="flex items-baseline gap-2 md:hidden">
      <span className="text-[18px] leading-6 font-medium tracking-[-0.02em]">Madison</span>
    </Link>
  );
}

/** Below 768 px the rail becomes a menu. */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const top = pathname.split("/").filter(Boolean)[0] ?? "";
  const reset = useStore((s) => s.reset);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-9 items-center rounded-[2px] px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line)]"
      >
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <div className="fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col border-t border-line bg-surface px-5 py-4">
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn("relative flex h-12 items-center border-b border-line pl-4 text-[16px]", n.match === top ? "text-ink" : "text-ink2")}
            >
              {n.match === top ? <span className="absolute top-3 bottom-3 left-0 w-[2px] bg-ink" /> : null}
              {n.label}
            </Link>
          ))}
          <button
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="mt-6 self-start text-[14px] text-ink3 underline underline-offset-4"
          >
            Reset demo
          </button>
        </div>
      ) : null}
    </div>
  );
}
