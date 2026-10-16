import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Square } from "./mark";
import type { CoverageState } from "@/data/types";
import { STATE_COLOR, STATE_LABEL } from "./status";

/**
 * The mono label vocabulary.
 * slash: "/ LABEL" for a section or node subtitle, or "/ A · B · C" for real metadata.
 * mode:  "[ LIVE ]", once per page.
 */
export function MonoLabel({
  children,
  variant = "slash",
  className,
  as: Tag = "span",
  tone,
}: {
  children: React.ReactNode;
  variant?: "slash" | "mode" | "plain";
  className?: string;
  as?: React.ElementType;
  tone?: "ink" | "ink2" | "ink3" | "accent";
}) {
  const color = tone ? { color: `var(--${tone})` } : undefined;
  if (variant === "mode") {
    return (
      <Tag className={cn("t-label whitespace-nowrap", className)} style={color}>
        [&nbsp;&nbsp;{children}&nbsp;&nbsp;]
      </Tag>
    );
  }
  return (
    <Tag className={cn("t-label", className)} style={color}>
      {variant === "slash" ? <span aria-hidden>/&nbsp;</span> : null}
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
