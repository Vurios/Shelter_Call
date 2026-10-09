import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Merge static surfaces per joint/material, preserving the six articulated joints. */
export function optimizeCrew(source) {
  source.updateMatrixWorld(true);
  const root = new THREE.Group();
  root.name = source.name;
  const originals = new Set();
  const originalMaterials = new Set(),
    finishes = new Map();
  for (const name of [
    'torso',
    'head',
    'arm-left',
    'arm-right',
    'leg-left',
    'leg-right',
  ]) {
    const joint = source.getObjectByName(name);
    if (!joint) continue;
    const target = new THREE.Group();
    target.name = name;
    joint.matrixWorld.decompose(
      target.position,
      target.quaternion,
      target.scale,
    );
    root.add(target);
    const inverse = joint.matrixWorld.clone().invert();
    const groups = new Map();
    joint.traverse((node) => {
      if (!node.isMesh) return;
      originals.add(node.geometry);
      const mat = node.material;
      originalMaterials.add(mat);
      const key = `${mat.roughness}:${mat.metalness}:${mat.opacity}`;
      if (!finishes.has(key))
        finishes.set(
          key,
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: mat.roughness,
            metalness: mat.metalness,
            opacity: mat.opacity,
            transparent: mat.transparent,
          }),
        );
      if (!groups.has(key)) groups.set(key, []);
      const geometry = node.geometry.index
        ? node.geometry.toNonIndexed()
        : node.geometry.clone();
      geometry.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld),
      );
      const colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = mat.color.r;
        colors[i + 1] = mat.color.g;
        colors[i + 2] = mat.color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      groups.get(key).push(geometry);
    });
    for (const [key, geometries] of groups) {
      const merged = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, finishes.get(key));
      mesh.castShadow = mesh.receiveShadow = true;
      target.add(mesh);
    }
  }
  originals.forEach((g) => g.dispose());
  originalMaterials.forEach((material) => material.dispose());
  return root;
}
