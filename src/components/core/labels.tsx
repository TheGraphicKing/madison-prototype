import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Square } from "./mark";
import type { CoverageState } from "@/data/types";
import { STATE_COLOR, STATE_LABEL } from "./status";

/**
 * Labels, v2. Section and block labels are small sentence-case sans in ink3; there is no
 * slash prefix and no capitals. "mono" keeps the small capital mono style for table headers,
 * ids and tiny metadata only. "mode" is a soft pill ("Live", "Replay").
 */
export function MonoLabel({
  children,
  variant = "slash",
  className,
  as: Tag = "span",
  tone,
}: {
  children: React.ReactNode;
  variant?: "slash" | "mode" | "plain" | "mono";
  className?: string;
  as?: React.ElementType;
  tone?: "ink" | "ink2" | "ink3" | "accent";
}) {
  const color = tone ? { color: `var(--${tone})` } : undefined;
  if (variant === "mode") {
    return (
      <Tag className={cn("inline-flex h-6 items-center gap-1.5 rounded-full bg-surface2 px-2.5 text-[12px] font-medium whitespace-nowrap text-ink", className)} style={color}>
        {children}
      </Tag>
    );
  }
  if (variant === "mono") {
    return (
      <Tag className={cn("t-label", className)} style={color}>
        {children}
      </Tag>
    );
  }
  return (
    <Tag className={cn("text-[12.5px] leading-[18px] font-medium text-ink3", className)} style={color}>
      {children}
    </Tag>
  );
}

/** A metadata list: "/ A · B · C". */
export function MetaList({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <MonoLabel className={className}>
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 ? <span aria-hidden>&nbsp;·&nbsp;</span> : null}
          {it}
        </span>
      ))}
    </MonoLabel>
  );
}

/** The big number with its label underneath. */
export function Count({
  value,
  label,
  state,
  animate = true,
  size = "big",
  className,
  startValue,
}: {
  value: number;
  label?: string;
  state?: CoverageState;
  animate?: boolean;
  size?: "big" | "medium";
  className?: string;
  startValue?: number;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <span className={cn(size === "big" ? "t-count" : "text-[28px] leading-[32px] tracking-[-0.02em] tabular")}>
        {animate ? (
          <NumberTicker value={value} startValue={startValue ?? Math.round(value * 0.92)} />
        ) : (
          new Intl.NumberFormat("en-US").format(value)
        )}
      </span>
      <span className="flex items-center gap-2 t-small text-ink2">
        {state ? <Square size={6} color={STATE_COLOR[state]} /> : null}
        {label ?? (state ? STATE_LABEL[state] : "")}
      </span>
    </div>
  );
}
