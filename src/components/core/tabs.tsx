"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: React.ReactNode; count?: number; disabled?: boolean };

function useRoving<T extends string>(options: Option<T>[], value: T, onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const enabled = options.map((o, k) => (o.disabled ? -1 : k)).filter((k) => k >= 0);
    const pos = enabled.indexOf(i);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = enabled[(pos + 1) % enabled.length];
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(options[next].value);
    }
  };
  return { refs, onKeyDown, selectedIndex: options.findIndex((o) => o.value === value) };
}

/** Tabs: an underline style. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label: string;
}) {
  const { refs, onKeyDown } = useRoving(options, value, onChange);
  return (
    <div role="tablist" aria-label={label} className={cn("flex items-end gap-7 border-b border-line", className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative -mb-px flex h-10 items-center gap-2 border-b text-[14px] transition-colors duration-[120ms]",
              on ? "border-ink text-ink" : "border-transparent text-ink2 hover:text-ink",
              "disabled:opacity-40",
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className="t-data text-[11px] text-ink3">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control: hairline track, the selected item on --surface with an ink hairline. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
  size = 32,
  mono,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label: string;
  size?: 28 | 32;
  mono?: boolean;
}) {
  const { refs, onKeyDown } = useRoving(options, value, onChange);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex max-w-full items-stretch overflow-x-auto rounded-[10px] bg-surface2 p-[3px]", className)}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex items-center gap-2 rounded-[8px] px-3 whitespace-nowrap transition-[background-color,color,box-shadow] duration-[120ms]",
              size === 28 ? "h-6" : "h-7",
              mono ? "t-data text-[12px]" : "text-[13px]",
              on ? "bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-ink2 hover:text-ink",
              "disabled:opacity-40",
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className="t-data text-[11px] text-ink3">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
