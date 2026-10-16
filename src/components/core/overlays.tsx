"use client";

import { Dialog as D } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Mark } from "./mark";
import { MonoLabel } from "./labels";

/** Slide-over from the right, 520 px. One soft shadow; hairline edge; a flat scrim. */
export function SlideOver({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <D.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-40 bg-[rgb(20_20_20/0.12)] transition-opacity duration-[240ms] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <D.Popup
          className="fixed top-0 right-0 bottom-0 z-50 flex max-w-full flex-col border-l border-line bg-surface shadow-(--overlay-shadow) outline-none transition-transform duration-[320ms] ease-(--ease) data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full"
          style={{ width }}
        >
          <header className="flex items-start justify-between gap-6 border-b border-line px-6 py-5">
            <div className="flex min-w-0 flex-col gap-1.5">
              {subtitle ? typeof subtitle === "string" ? <MonoLabel>{subtitle}</MonoLabel> : subtitle : null}
              <D.Title className="t-section">{title}</D.Title>
            </div>
            <D.Close
              className="-mr-2 inline-flex size-8 items-center justify-center rounded-[10px] text-ink2 hover:bg-surface2 hover:text-ink"
              aria-label="Close"
            >
              <Mark kind="close" />
            </D.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer ? <footer className="border-t border-line px-6 py-4">{footer}</footer> : null}
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}

/** Centred dialog, for confirmations. */
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-40 bg-[rgb(20_20_20/0.14)] transition-opacity duration-[180ms] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <D.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-line bg-surface shadow-(--overlay-shadow) outline-none transition-[opacity,transform] duration-[180ms] ease-(--ease) data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[starting-style]:translate-y-[calc(-50%+6px)]",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-6 px-6 pt-5">
            <D.Title className="t-section">{title}</D.Title>
            <D.Close className="-mr-2 inline-flex size-8 items-center justify-center rounded-[10px] text-ink2 hover:bg-surface2" aria-label="Close">
              <Mark kind="close" />
            </D.Close>
          </div>
          <div className="px-6 py-4 text-ink2">{children}</div>
          {footer ? <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div> : null}
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}
