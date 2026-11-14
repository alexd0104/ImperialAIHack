"use client";

import { Float, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { BundleSlot } from "@/lib/contracts";
import { slotToScene } from "@/lib/house/layout";

// R3F layer of a Room (H4). Library SVG Objects are textured planes; a GLB drops in
// through the same `object.kind` switch. Orthographic camera, 1 unit = 1 stage pixel.
// Taps are handled by DOM buttons above the canvas (room-scene.tsx), not by raycasting.

export type ObjectLook = { opacity: number; scale: number };

type Props = {
  slots: BundleSlot[];
  looks: Record<string, ObjectLook>;
  reducedMotion: boolean;
};

/** Rasterises the SVG at 2× so the plane stays crisp when the opened Object scales up. */
function useSvgTexture(url: string): { texture: THREE.Texture; aspect: number } | null {
  const [result, setResult] = useState<{ texture: THREE.Texture; aspect: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 256;
      const h = img.naturalHeight || 256;
      const canvas = document.createElement("canvas");
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      setResult({ texture, aspect: h / w });
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return result;
}

function useEased(target: ObjectLook, reducedMotion: boolean) {
  const current = useRef({ ...target });
  useFrame((_, delta) => {
    // Critically damped ease ≈ 0.9 s to settle; reduced motion keeps the fade, drops the scale.
    const k = 1 - Math.exp(-delta * 6);
    current.current.opacity += (target.opacity - current.current.opacity) * k;
    const scaleTarget = reducedMotion ? 1 : target.scale;
    current.current.scale += (scaleTarget - current.current.scale) * k;
  });
  return current;
}

function SvgObject({
  slot,
  look,
  reducedMotion,
}: {
  slot: BundleSlot;
  look: ObjectLook;
  reducedMotion: boolean;
}) {
  const loaded = useSvgTexture(slot.story?.object.url ?? "");
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const eased = useEased(look, reducedMotion);
  useFrame(() => {
    group.current?.scale.setScalar(eased.current.scale);
    if (material.current) material.current.opacity = eased.current.opacity;
  });
  if (!loaded) return null;
  const width = slot.scale * 1194;
  const height = width * loaded.aspect;
  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={material} map={loaded.texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function GlbObject({
  slot,
  look,
  reducedMotion,
}: {
  slot: BundleSlot;
  look: ObjectLook;
  reducedMotion: boolean;
}) {
  const { scene } = useGLTF(slot.story?.object.url ?? "");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const fit = (slot.scale * 1194) / Math.max(size.x, 0.0001);
    clone.scale.setScalar(fit);
    clone.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(fit));
    return clone;
  }, [scene, slot.scale]);
  const group = useRef<THREE.Group>(null);
  const eased = useEased(look, reducedMotion);
  useFrame(() => {
    group.current?.scale.setScalar(eased.current.scale);
    model.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat) {
        mat.transparent = true;
        mat.opacity = eased.current.opacity;
      }
    });
  });
  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

export default function RoomCanvas({ slots, looks, reducedMotion }: Props) {
  return (
    <Canvas
      orthographic
      // offsetSize: measure the untransformed stage size, so 1 unit = 1 stage pixel even
      // though HouseStage scales the whole screen with a CSS transform.
      resize={{ offsetSize: true }}
      camera={{ position: [0, 0, 1000], zoom: 1, near: 0.1, far: 5000 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[200, 400, 600]} intensity={0.6} />
      {slots.map((slot) => {
        const story = slot.story;
        if (!story) return null;
        const [x, y] = slotToScene(slot);
        const look = looks[slot.id] ?? { opacity: 1, scale: 1 };
        const object =
          story.object.kind === "glb" ? (
            <Suspense fallback={null}>
              <GlbObject slot={slot} look={look} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <SvgObject slot={slot} look={look} reducedMotion={reducedMotion} />
          );
        // Lower on screen = nearer, so overlapping Objects stack naturally.
        return (
          <group key={slot.id} position={[x, y, slot.y * 100]}>
            {reducedMotion ? (
              object
            ) : (
              <Float
                speed={1.2}
                rotationIntensity={0}
                floatIntensity={6}
                floatingRange={[-0.6, 0.6]}
              >
                {object}
              </Float>
            )}
          </group>
        );
      })}
    </Canvas>
  );
}
