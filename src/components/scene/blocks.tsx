"use client";

// Shapes shared by every 3D view: instanced rounded blocks (obligations), rounded platforms
// and slabs (plots, steps, layers), thin sheets (sections). Matte materials only.
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const geoCache = new Map<string, THREE.BufferGeometry>();
/** A cached rounded box geometry. Size is in world units; radius is clamped to fit. */
export function roundedBox(w: number, h: number, d: number, r: number, segments = 3) {
  const key = `${w}|${h}|${d}|${r}|${segments}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2));
    geoCache.set(key, g);
  }
  return g;
}

export interface BlockItem {
  x: number;
  y: number;
  z: number;
  /** scale on top of the base geometry */
  sx?: number;
  sy?: number;
  sz?: number;
  color: string;
}

/**
 * Many rounded blocks in one draw call. Give it `items` for a still picture, or `animate` to
 * place each block every frame (moving obligations in a run).
 */
export function Blocks({
  count,
  items,
  size = [1, 1, 1],
  radius = 0.12,
  animate,
  onHover,
  onOut,
  onClick,
  roughness = 0.85,
  castShadow = true,
}: {
  count: number;
  items?: BlockItem[];
  size?: [number, number, number];
  radius?: number;
  /** return false to hide the block this frame */
  animate?: (i: number, o: THREE.Object3D, c: THREE.Color, t: number) => boolean | void;
  onHover?: (i: number, e: ThreeEvent<PointerEvent>) => void;
  onOut?: () => void;
  onClick?: (i: number, e: ThreeEvent<MouseEvent>) => void;
  roughness?: number;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => roundedBox(size[0], size[1], size[2], radius), [size, radius]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m || !items) return;
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(it.color));
    });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, o, c]);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || !animate) return;
    let n = 0;
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.rotation.set(0, 0, 0);
      c.set("#888");
      const show = animate(i, o, c, clock.elapsedTime);
      if (show === false) o.scale.set(0, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c);
      n++;
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, Math.max(1, count)]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false}
      onPointerMove={onHover ? (e) => (e.stopPropagation(), e.instanceId !== undefined && onHover(e.instanceId, e)) : undefined}
      onPointerOut={onOut}
      onClick={onClick ? (e) => (e.stopPropagation(), e.instanceId !== undefined && onClick(e.instanceId, e)) : undefined}
    >
      <meshStandardMaterial roughness={roughness} metalness={0} />
    </instancedMesh>
  );
}

/** A low rounded platform: a step, a plot base or a layer. */
export function Platform({
  position,
  size,
  radius = 0.18,
  color,
  opacity = 1,
  children,
  onClick,
  onOver,
  onOut,
  castShadow = true,
}: {
  position: [number, number, number];
  size: [number, number, number];
  radius?: number;
  color: string;
  opacity?: number;
  children?: ReactNode;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onOver?: (e: ThreeEvent<PointerEvent>) => void;
  onOut?: (e: ThreeEvent<PointerEvent>) => void;
  castShadow?: boolean;
}) {
  const geo = useMemo(() => roundedBox(size[0], size[1], size[2], radius, 4), [size, radius]);
  return (
    <group position={position}>
      <mesh
        geometry={geo}
        position={[0, size[1] / 2, 0]}
        castShadow={castShadow && opacity >= 1}
        receiveShadow
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
      >
        <meshStandardMaterial color={color} roughness={0.9} metalness={0} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
      </mesh>
      {/* children sit on the top face */}
      <group position={[0, size[1], 0]}>{children}</group>
    </group>
  );
}

/** A thin flat slab: the soft-coloured top of a plot or a paper sheet. */
export function Slab(props: Omit<Parameters<typeof Platform>[0], "radius"> & { radius?: number }) {
  return <Platform radius={props.radius ?? Math.min(props.size[1] / 2, 0.06)} {...props} />;
}

/** A translucent gate the blocks pass through: two posts and a soft pane. */
export function Gate({ position, width, height, color, paneColor, fill }: { position: [number, number, number]; width: number; height: number; color: string; paneColor: string; fill: number }) {
  const post = useMemo(() => roundedBox(0.14, height, 0.14, 0.06), [height]);
  const pane = useMemo(() => roundedBox(0.04, height * 0.92, width, 0.02), [height, width]);
  const bar = useMemo(() => roundedBox(0.06, 0.08, width, 0.03), [width]);
  return (
    <group position={position}>
      <mesh geometry={post} position={[0, height / 2, -width / 2]} castShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh geometry={post} position={[0, height / 2, width / 2]} castShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh geometry={pane} position={[0, height * 0.48, 0]}>
        <meshStandardMaterial color={paneColor} roughness={0.7} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {/* the gate fills from the floor up as obligations pass */}
      <mesh geometry={bar} position={[0, 0.06 + Math.max(0, Math.min(1, fill)) * (height - 0.16), 0]}>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}
