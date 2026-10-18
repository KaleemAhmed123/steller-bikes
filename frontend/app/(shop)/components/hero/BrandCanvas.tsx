'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, ContactShadows, PerspectiveCamera, Float } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { upgradePaint } from './paint';

// The second 3D moment: the same brand bike (already preloaded for the hero),
// turntable-rotating on a dark stage — a "see it from every angle" brand beat.
// Lighter than the hero (one bloom pass, no reflective floor).

const MODEL = '/models/bicycle.glb';

function TurntableBike() {
  const { scene } = useGLTF(MODEL);
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);

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
      const std = mesh.material as THREE.MeshStandardMaterial;
      if (!std) return;
      mesh.material = upgradePaint(std, maxAniso); // same polish as the hero
    });
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { object, scale: 3.1 / maxDim };
  }, [scene, gl]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.45;
  });

  return (
    <Float speed={1.4} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.08, 0.08]}>
      <group ref={group} scale={scale} rotation={[0.04, 0, 0]}>
        <primitive object={object} />
      </group>
    </Float>
  );
}

useGLTF.preload(MODEL);

export default function BrandCanvas() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[0.4, 0.5, 5.6]} fov={34} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffe6b0" position={[5, 5, 4]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#6b8cff" position={[-5, 3, -3]} scale={[7, 6, 1]} />
      </Environment>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 5]} intensity={1.5} color="#ffe6b0" />
      <TurntableBike />
      <ContactShadows position={[0, -1.6, 0]} opacity={0.5} scale={8} blur={2.5} far={4} color="#000000" />
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.6} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
