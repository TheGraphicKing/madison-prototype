"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { Square } from "@/components/core/mark";

/** Toasts in plain words, top centre under the header, so they never cover the work. Polite live region. */
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="no-print pointer-events-none fixed top-[12px] left-1/2 z-[60] flex w-[min(560px,calc(100vw-40px))] -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex max-w-[min(560px,calc(100vw-40px))] items-center gap-3 rounded-[10px] bg-ink px-4 py-2.5 text-[13px] leading-5 text-surface shadow-(--overlay-shadow)"
          >
            <Square size={6} color="var(--highlight)" />
            <span className="flex-1">{t.text}</span>
            {t.href ? (
              <Link href={t.href} className="underline underline-offset-4" onClick={() => dismiss(t.id)}>
                Open
              </Link>
            ) : null}
            <button onClick={() => dismiss(t.id)} className="text-surface/70 hover:text-surface" aria-label="Dismiss">
              Dismiss
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
