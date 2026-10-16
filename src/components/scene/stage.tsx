"use client";

// The stage every 3D view shares: canvas, perspective camera (fov 35), a three-point light rig
// with soft shadows, a Lightformer environment (no HDR files), a matte ground with contact
// shadows, and subtle ambient occlusion. Matte, soft, no bloom, no glow.
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import type { ReactNode } from "react";
import type { Tokens } from "./tokens";

export function Stage({
  tk,
  children,
  label,
  camera = [9, 8, 10],
  extent = 10,
  ground = true,
  ao = true,
  onMissed,
  className,
}: {
  tk: Tokens;
  children: ReactNode;
  /** accessible name of the scene */
  label: string;
  camera?: [number, number, number];
  /** half-size of the area the key light's shadow must cover */
  extent?: number;
  ground?: boolean;
  ao?: boolean;
  onMissed?: () => void;
  className?: string;
}) {
  return (
    <div className={className ?? "relative h-full w-full"} style={{ background: tk["--ground"] }}>
      <Canvas
        shadows="soft"
        flat
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        aria-label={label}
        role="img"
        onPointerMissed={onMissed}
        camera={{ fov: 35, position: camera, near: 0.1, far: 400 }}
      >
        <color attach="background" args={[tk["--ground"]]} />
        <LightRig tk={tk} extent={extent} />
        {ground ? <Ground tk={tk} size={extent * 5} /> : null}
        {/* drei drops the first Html it mounts in a scene; this empty one takes that slot */}
        <Html position={[0, -1000, 0]} style={{ display: "none" }}>
          <span />
        </Html>
        {children}
        {ao ? (
          <EffectComposer multisampling={4}>
            <N8AO aoRadius={0.6} distanceFalloff={0.8} intensity={1.6} halfRes color={tk["--ink"]} />
          </EffectComposer>
        ) : null}
      </Canvas>
    </div>
  );
}

/** Key light with soft shadows, a cool fill and a rim from behind, plus a soft environment. */
export function LightRig({ tk, extent = 10 }: { tk: Tokens; extent?: number }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={[tk["--surface"], tk["--surface3"], 0.35]} />
      <directionalLight
        position={[extent * 0.6, extent * 1.1, extent * 0.5]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={5}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={0.5}
        shadow-camera-far={extent * 4}
      />
      <directionalLight position={[-extent * 0.7, extent * 0.4, extent * 0.2]} intensity={0.35} />
      <directionalLight position={[-extent * 0.2, extent * 0.5, -extent]} intensity={0.55} />
      <Environment resolution={64} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={1.4} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[-8, 3, 2]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[8, 3, -2]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      </Environment>
    </>
  );
}

/** A matte ground that takes the key light's shadow, with contact shadows under the objects. */
export function Ground({ tk, size = 40, y = 0 }: { tk: Tokens; size?: number; y?: number }) {
  return (
    <>
      <ContactShadows position={[0, y, 0]} opacity={0.22} scale={size * 1.2} blur={2.4} far={2.5} resolution={1024} color={tk["--ink"]} frames={Infinity} />
    </>
  );
}
