'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  ContactShadows,
  PerspectiveCamera,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { upgradePaint } from './paint';

// The hero's real-time 3D bike — a cinematic, scroll-driven scene.
// The bike is a conceptual brand visual (a purchased/licensed 3D model),
// never a purchasable SKU.
//
// `progress` is a shared ref (0..1) written by the GSAP ScrollTrigger in BikeHero.
// The camera moves through a sequence of framed "shots" as that value climbs.

const MODEL = '/models/cycle.glb';

// Camera keyframes: a deliberate path around the bike (centred at the origin).
// Each shot is { position, lookAt }. Progress 0..1 interpolates across them.
const SHOTS: { pos: [number, number, number]; tgt: [number, number, number] }[] = [
  { pos: [1.3, 0.1, 5.1], tgt: [0, -0.1, 0] }, // low front 3/4, close
  { pos: [4.9, 1.0, 1.6], tgt: [0, 0.05, 0] }, // orbit to side profile, higher
  { pos: [-3.4, -0.2, 4.2], tgt: [0, -0.15, 0] }, // dramatic rear 3/4, low
  { pos: [1.7, 1.0, 6.1], tgt: [0, 0.05, 0] }, // settle, pulled back for the CTA
];

function Bike({ onReady }: { onReady?: () => void }) {
  const { scene } = useGLTF(MODEL);
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);

  // This component only mounts once the GLB has loaded (Suspense resolved), so
  // this is the moment the hero is ready — tell the parent to drop the loader.
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const { object, scale } = useMemo(() => {
    const object = scene.clone(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    object.position.set(-center.x, -center.y, -center.z);

    const maxAniso = gl.capabilities.getMaxAnisotropy();
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const std = mesh.material as THREE.MeshStandardMaterial;
      if (!std) return;
      mesh.material = upgradePaint(std, maxAniso);
    });
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { object, scale: 3.3 / maxDim };
  }, [scene, gl]);

  // A very slow idle drift so the bike never looks frozen between camera moves.
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={group} scale={scale} rotation={[0.05, -0.5, 0]}>
      <primitive object={object} />
    </group>
  );
}

// Interpolate the camera along the SHOTS path by scroll progress and ease toward it.
function CameraRig({ progress }: { progress: MutableRefObject<number> }) {
  const pos = useMemo(() => new THREE.Vector3(...SHOTS[0].pos), []);
  const tgt = useMemo(() => new THREE.Vector3(...SHOTS[0].tgt), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpTgt = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, delta) => {
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const seg = p * (SHOTS.length - 1);
    const i = Math.min(SHOTS.length - 2, Math.floor(seg));
    const t = seg - i;
    // smoothstep for softer transitions between shots
    const e = t * t * (3 - 2 * t);
    tmpPos.set(...SHOTS[i].pos).lerp(tmpPos.clone().set(...SHOTS[i + 1].pos), e);
    tmpTgt.set(...SHOTS[i].tgt).lerp(tmpTgt.clone().set(...SHOTS[i + 1].tgt), e);

    pos.lerp(tmpPos, 1 - Math.pow(0.0015, delta)); // frame-rate-independent ease
    tgt.lerp(tmpTgt, 1 - Math.pow(0.0015, delta));
    camera.position.copy(pos);
    camera.lookAt(tgt);
  });
  return null;
}

useGLTF.preload(MODEL);

export default function BikeCanvas({
  progress,
  cinematic = true,
  active = true,
  onReady,
}: {
  progress: MutableRefObject<number>;
  cinematic?: boolean;
  active?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows
      frameloop={active ? 'always' : 'never'} // pause rendering when the hero is scrolled off-screen
      dpr={cinematic ? [1, 1.75] : [1, 1.4]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping, // filmic highlight roll-off
        toneMappingExposure: 1.08,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[1.3, 0.1, 5.1]} fov={34} />
      <CameraRig progress={progress} />

      {/* In-code studio lighting → real reflections, zero network downloads.
          Warm amber-gold studio to match the brand/logo; a deeper amber rim adds
          cinematic depth. The red paint reads as a rich warm red under this light. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0d0a06']} />
        <Lightformer form="rect" intensity={3} color="#ffcf7a" position={[5, 6, 4]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#d9942f" position={[-6, 3, -4]} scale={[8, 6, 1]} />
        <Lightformer form="circle" intensity={1.5} color="#fff4e0" position={[0, 8, 2]} scale={4} />
        {/* A long thin strip overhead — a bright moving streak across the clearcoat. */}
        <Lightformer form="rect" intensity={2.2} color="#ffead0" position={[0, 5, -6]} scale={[10, 0.6, 1]} rotation={[0, Math.PI, 0]} />
      </Environment>

      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 7, 5]} intensity={1.6} color="#ffd98f" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 3, -4]} intensity={1.2} color="#c88a3a" />

      <Bike onReady={onReady} />

      {/* Wet-asphalt reflective floor — the bike mirrors into it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, 0]}>
        <planeGeometry args={[40, 40]} />
        {cinematic ? (
          <MeshReflectorMaterial
            resolution={512}
            mixBlur={1}
            mixStrength={28}
            blur={[260, 90]}
            roughness={0.9}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color="#0d0a06"
            metalness={0.55}
          />
        ) : (
          <meshStandardMaterial color="#0d0a06" roughness={0.9} metalness={0.3} />
        )}
      </mesh>

      <ContactShadows position={[0, -1.7, 0]} opacity={0.55} scale={9} blur={2.6} far={4} color="#000000" />

      {cinematic && (
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.32} mipmapBlur />
          <Vignette offset={0.26} darkness={0.9} eskil={false} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
