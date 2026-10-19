import * as THREE from 'three';

// Upgrade the model's baked MeshStandardMaterial to a physical material with a
// thin clearcoat — a lacquered-paint sheen + sharper reflections the single
// baked map can't give on its own.
//
// Built by hand (not `.copy(std)`): MeshPhysicalMaterial.copy() reads clearcoat
// fields (e.g. clearcoatNormalScale) a plain standard material doesn't have and
// throws "reading 'x'", which crashes the canvas into the fallback.
//
// ponytail: one material for the whole fused mesh (tyres get the sheen too);
// true per-part PBR needs a multi-part model, not this single-mesh asset.
export function upgradePaint(
  std: THREE.MeshStandardMaterial,
  maxAnisotropy: number,
): THREE.MeshPhysicalMaterial {
  const phys = new THREE.MeshPhysicalMaterial();
  phys.side = std.side; // keep double-sided panels (some exports flag them) — no missing faces
  phys.color.copy(std.color);
  phys.emissive.copy(std.emissive);
  phys.map = std.map;
  if (std.normalMap) phys.normalMap = std.normalMap;
  if (std.aoMap) phys.aoMap = std.aoMap;
  if (std.emissiveMap) phys.emissiveMap = std.emissiveMap;
  phys.metalness = 0.5;
  phys.roughness = 0.32;
  phys.envMapIntensity = 1.75;
  phys.clearcoat = 0.7;
  phys.clearcoatRoughness = 0.2;
  if (phys.map) {
    phys.map.anisotropy = maxAnisotropy; // crisper texture at grazing angles
    phys.map.needsUpdate = true;
  }
  phys.needsUpdate = true;
  return phys;
}
