import { cn } from "@/lib/utils";

/**
 * Corner-bracket frame: four L-shaped strokes at the corners, as in the TextQL schematic.
 * Wraps schematic nodes and hero panels. The children sit on whatever fill the parent gives.
 */
export function Bracket({
  children,
  arm = 10,
  color = "var(--lineStrong)",
  weight = 1,
  inset = 0,
  className,
  style,
  as: Tag = "div",
  ...rest
}: {
  children?: React.ReactNode;
  arm?: number;
  color?: string;
  weight?: number;
  inset?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  const corner = (pos: React.CSSProperties, bt: string, bl: string): React.CSSProperties => ({
    position: "absolute",
    width: arm,
    height: arm,
    pointerEvents: "none",
    [bt]: `${weight}px solid ${color}`,
    [bl]: `${weight}px solid ${color}`,
    ...pos,
  });
  return (
    <Tag className={cn("relative", className)} style={style} {...rest}>
      <span aria-hidden style={corner({ top: inset, left: inset }, "borderTop", "borderLeft")} />
      <span aria-hidden style={corner({ top: inset, right: inset }, "borderTop", "borderRight")} />
      <span aria-hidden style={corner({ bottom: inset, left: inset }, "borderBottom", "borderLeft")} />
      <span aria-hidden style={corner({ bottom: inset, right: inset }, "borderBottom", "borderRight")} />
      {children}
    </Tag>
  );
}

/** A 6 px square on a node edge where connectors meet. */
export function Port({
  side = "right",
  offset = "50%",
  filled = true,
  color = "var(--ink)",
  size = 6,
  className,
}: {
  side?: "left" | "right" | "top" | "bottom";
  offset?: string | number;
  filled?: boolean;
  color?: string;
  size?: number;
  className?: string;
}) {
  const half = size / 2;
  const pos: React.CSSProperties =
    side === "left"
      ? { left: -half, top: offset, marginTop: -half }
      : side === "right"
        ? { right: -half, top: offset, marginTop: -half }
        : side === "top"
          ? { top: -half, left: offset, marginLeft: -half }
          : { bottom: -half, left: offset, marginLeft: -half };
  return (
    <span
      aria-hidden
      className={cn("absolute z-[1]", className)}
      style={{
        width: size,
        height: size,
        background: filled ? color : "var(--surface)",
        boxShadow: `inset 0 0 0 1px ${color}`,
        ...pos,
      }}
    />
  );
}
