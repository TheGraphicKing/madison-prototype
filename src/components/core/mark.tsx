import { cn } from "@/lib/utils";

/**
 * The only drawn marks in Madison. Strokes, never pictograms.
 * check and cross are for verification results only.
 */
export type MarkKind =
  | "chevron-down"
  | "chevron-up"
  | "chevron-right"
  | "chevron-left"
  | "check"
  | "cross"
  | "close"
  | "plus"
  | "minus"
  | "arrow-right";

const PATHS: Record<MarkKind, string> = {
  "chevron-down": "M3 5.5 L7 9.5 L11 5.5",
  "chevron-up": "M3 8.5 L7 4.5 L11 8.5",
  "chevron-right": "M5.5 3 L9.5 7 L5.5 11",
  "chevron-left": "M8.5 3 L4.5 7 L8.5 11",
  check: "M3 7.4 L5.8 10 L11 4.2",
  cross: "M4 4 L10 10 M10 4 L4 10",
  close: "M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5",
  plus: "M7 3 V11 M3 7 H11",
  minus: "M3 7 H11",
  "arrow-right": "M2.5 7 H11 M8 4 L11 7 L8 10",
};

export function Mark({
  kind,
  size = 14,
  strokeWidth = 1.25,
  className,
  title,
}: {
  kind: MarkKind;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn("inline-block shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[kind]} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A square mark: filled (done, state) or hollow (waiting). */
export function Square({
  size = 6,
  filled = true,
  color = "currentColor",
  className,
  style,
}: {
  size?: number;
  filled?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        background: filled ? color : "transparent",
        boxShadow: filled ? undefined : `inset 0 0 0 1px ${color}`,
        ...style,
      }}
    />
  );
}

/** A small dot. */
export function Dot({ size = 4, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{ width: size, height: size, background: color }}
    />
  );
}
