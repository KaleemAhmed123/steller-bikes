'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Environment, Lightformer, Float, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SVGLoader } from 'three-stdlib';
import * as THREE from 'three';

// The second 3D moment: the Stellar logo mark, traced from the real logo and
// extruded into a glossy blue emblem that slowly turns. In-code + one tiny SVG,
// so it costs almost nothing to load (no 2.3 MB model), has a transparent
// background, and sits in a short band — the "different, modern" element.

const MARK = '/brand/stellar-mark.svg';

function ExtrudedMark() {
  const data = useLoader(SVGLoader, MARK);
  const spin = useRef<THREE.Group>(null);

  const { geoms, groupScale } = useMemo(() => {
    const geoms: THREE.ExtrudeGeometry[] = [];
    const box = new THREE.Box3();
    for (const path of data.paths) {
      for (const shape of SVGLoader.createShapes(path as never)) {
        const g = new THREE.ExtrudeGeometry(shape, {
          depth: 64,
          bevelEnabled: true,
          bevelThickness: 12,
          bevelSize: 7,
          bevelSegments: 3,
        });
        g.computeBoundingBox();
        if (g.boundingBox) box.union(g.boundingBox);
        geoms.push(g);
      }
    }
    const c = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(c);
    box.getSize(size);
    geoms.forEach((g) => g.translate(-c.x, -c.y, -c.z)); // centre at origin
    return { geoms, groupScale: 2.7 / Math.max(size.x, size.y) };
  }, [data]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f2a52e', // --rc-hero brand gold
        metalness: 0.62,
        roughness: 0.3,
        emissive: new THREE.Color('#5c2a00'),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Slow turntable; the bevel + depth keep it reading as a solid form edge-on.
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.35;
  });

  // SVG space is Y-down → flip Y on the group (DoubleSide keeps lighting correct).
  return (
    <Float speed={1.3} rotationIntensity={0.15} floatIntensity={0.6} floatingRange={[-0.1, 0.1]}>
      <group ref={spin}>
        <group scale={[groupScale, -groupScale, groupScale]}>
          {geoms.map((g, i) => (
            <mesh key={i} geometry={g} material={material} castShadow />
          ))}
        </group>
      </group>
    </Float>
  );
}

export default function LogoCanvas() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 6.2]} fov={32} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffcf7a" position={[5, 5, 4]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#d9942f" position={[-5, 3, -3]} scale={[7, 6, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 4, 3]} scale={[4, 0.6, 1]} />
      </Environment>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 6]} intensity={1.6} color="#ffd98f" />
      <directionalLight position={[-5, 2, -3]} intensity={1.1} color="#c88a3a" />
      <ExtrudedMark />
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
