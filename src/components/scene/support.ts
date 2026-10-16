"use client";

// Whether a scene renders in 3D: WebGL must exist and reduced motion must be off.
// Every 3D view has a 2D fallback built from the same data.
import { useEffect, useState } from "react";

export type SceneSupport = "pending" | "3d" | "2d";

let cached: boolean | null = null;
function hasWebGL() {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    cached = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    cached = false;
  }
  return cached;
}

export function useSceneSupport(): SceneSupport {
  const [s, setS] = useState<SceneSupport>("pending");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setS(hasWebGL() && !mq.matches ? "3d" : "2d");
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);
  return s;
}
