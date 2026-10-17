"use client";

// One camera rig for every scene: smooth orbit and dolly, polar angle held between 20° and 70°,
// a gentle idle drift that stops on interaction, and a guided mode that eases to whatever is
// active. "Overview" frames the whole scene again.
import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

export interface Frame {
  center: [number, number, number];
  size: [number, number, number];
}

const DEG = Math.PI / 180;

/** Look at a frame from a given angle, far enough that its bounding sphere (or, for "box", its box) fills the view. */
function fit(c: CameraControls, f: Frame, azimuth: number, polar: number, aspect: number, margin: number, smooth: boolean, mode: "sphere" | "box" = "sphere") {
  const r = 0.5 * Math.hypot(f.size[0], f.size[1], f.size[2]);
  const v = 35 * DEG;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  // a box seen from above at this angle: its width must fit the horizontal view, its foreshortened depth the vertical
  const boxDist = () => {
    const halfW = f.size[0] / 2;
    const halfV = (f.size[2] * Math.cos(polar) + f.size[1] * Math.sin(polar)) / 2;
    const near = (f.size[2] * Math.sin(polar)) / 2;
    return Math.max(halfW / Math.tan(h / 2), halfV / Math.tan(v / 2)) + near;
  };
  const dist = (mode === "box" ? boxDist() : r / Math.sin(Math.min(v, h) / 2)) * (1 + margin);
  const [x, y, z] = f.center;
  const px = x + dist * Math.sin(polar) * Math.sin(azimuth);
  const py = y + dist * Math.cos(polar);
  const pz = z + dist * Math.sin(polar) * Math.cos(azimuth);
  void c.setLookAt(px, py, pz, x, y, z, smooth);
}

export function CameraRig({
  overview,
  focus,
  resetKey = 0,
  azimuth = 38,
  polar = 52,
  drift = true,
  padding = 0.05,
  allowZoom = true,
  zoom,
  fitMode = "sphere",
}: {
  overview: Frame;
  /** the active item; null frames the overview */
  focus?: Frame | null;
  /** change it to return to the overview */
  resetKey?: number;
  azimuth?: number;
  polar?: number;
  drift?: boolean;
  /** extra distance as a fraction, 0.05 = 5% more room */
  padding?: number;
  /** false: no dolly at all (the Today mini field) */
  allowZoom?: boolean;
  /** a signal from the +/- buttons */
  zoom?: ZoomSignal;
  /** "box" fits a wide, shallow scene to the canvas's shape */
  fitMode?: "sphere" | "box";
}) {
  const ref = useRef<CameraControls>(null);
  const touched = useRef(false);
  const base = useRef(azimuth * DEG);
  const first = useRef(true);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const f = focus ?? overview;
    const smooth = !first.current;
    first.current = false;
    // guided: keep the current angle when following an item, the home angle for the overview
    const az = focus && touched.current ? c.azimuthAngle : base.current;
    const pol = focus && touched.current ? c.polarAngle : polar * DEG;
    fit(c, f, az, pol, size.width / Math.max(1, size.height), padding, smooth, fitMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.center.join(), focus?.size.join(), overview.center.join(), overview.size.join(), size.width, size.height]);

  useEffect(() => {
    const c = ref.current;
    if (!c || resetKey === 0) return;
    touched.current = false;
    base.current = azimuth * DEG;
    fit(c, overview, base.current, polar * DEG, size.width / Math.max(1, size.height), padding, true, fitMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // the wheel scrolls the page; Ctrl or Cmd plus the wheel (and a trackpad pinch) zooms
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      const c = ref.current;
      if (!c || !allowZoom || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      touched.current = true;
      void c.dolly(-e.deltaY * 0.01 * Math.max(1, c.distance / 10), true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, allowZoom]);
  useEffect(() => {
    const c = ref.current;
    if (!c || !zoom || zoom.n === 0) return;
    touched.current = true;
    void c.dolly(zoom.dir * c.distance * 0.18, true);
  }, [zoom]);

  useFrame(({ clock }) => {
    const c = ref.current;
    if (!c || !drift || touched.current || focus) return;
    c.azimuthAngle = base.current + Math.sin(clock.elapsedTime * 0.12) * 0.06;
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      draggingSmoothTime={0.18}
      minPolarAngle={20 * DEG}
      maxPolarAngle={70 * DEG}
      minDistance={2}
      maxDistance={120}
      dollyToCursor
      mouseButtons={{ left: 1, middle: allowZoom ? 8 : 0, right: 2, wheel: 0 }}
      touches={{ one: 32, two: allowZoom ? 1024 : 64, three: 0 }}
      onStart={() => {
        touched.current = true;
        if (ref.current) base.current = ref.current.azimuthAngle;
      }}
    />
  );
}

/** The HTML "Overview" button that sits on a scene. */
export function OverviewButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={"inline-flex h-8 items-center rounded-[10px] bg-surface px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2 " + (className ?? "")}>
      Overview
    </button>
  );
}

export interface ZoomSignal {
  n: number;
  dir: 1 | -1;
}

/** State for the +/- buttons of one scene. */
export function useZoom() {
  const [zoom, set] = useState<ZoomSignal>({ n: 0, dir: 1 });
  return { zoom, zoomIn: () => set((z) => ({ n: z.n + 1, dir: 1 })), zoomOut: () => set((z) => ({ n: z.n + 1, dir: -1 })) };
}

/** The +/- buttons that sit next to Overview on every scene. */
export function ZoomButtons({ onIn, onOut }: { onIn: () => void; onOut: () => void }) {
  const b = "inline-grid size-8 place-items-center rounded-[10px] bg-surface text-[16px] leading-none shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface2";
  return (
    <span className="inline-flex gap-1">
      <button onClick={onOut} aria-label="Zoom out" title="Zoom out (or Ctrl and the mouse wheel)" className={b}>
        −
      </button>
      <button onClick={onIn} aria-label="Zoom in" title="Zoom in (or Ctrl and the mouse wheel)" className={b}>
        +
      </button>
    </span>
  );
}
