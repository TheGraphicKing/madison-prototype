"use client";

// Crisp HTML labels pinned to points in a scene. They are not scaled by distance, so text
// stays sharp and readable; long text wraps instead of being cut.
import { Html } from "@react-three/drei";
import type { CSSProperties, ReactNode } from "react";

export function Label({
  position,
  children,
  anchor = "bottom",
  interactive = false,
  width,
  z = [20, 0],
  style,
}: {
  position: [number, number, number];
  children: ReactNode;
  /** which edge of the label sits on the point */
  anchor?: "bottom" | "top" | "center" | "left";
  interactive?: boolean;
  width?: number;
  z?: [number, number];
  style?: CSSProperties;
}) {
  const t = anchor === "bottom" ? "translate(-50%, -100%)" : anchor === "top" ? "translate(-50%, 0)" : anchor === "left" ? "translate(0, -50%)" : "translate(-50%, -50%)";
  return (
    <Html position={position} zIndexRange={z} style={{ pointerEvents: interactive ? "auto" : "none" }}>
      <div style={{ transform: t, width, ...style }}>{children}</div>
    </Html>
  );
}
