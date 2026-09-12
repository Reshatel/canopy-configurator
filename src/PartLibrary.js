import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EDGE_COLORS } from './config.js';

const MAP_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];

export class PartLibrary {
  constructor(parts) {
    this.parts = parts;
    this.tinted = new Map();
  }

  static async load(url, anisotropy = 1) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const parts = new Map();

    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((node) => {
      if (!node.isMesh) return;

      for (const slot of MAP_SLOTS) {
        const texture = node.material[slot];
        if (!texture || texture.anisotropy === anisotropy) continue;
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
      }
      const source = node.geometry.clone();
      source.applyMatrix4(node.matrixWorld);
      source.computeBoundingBox();
      source.computeBoundingSphere();
      parts.set(node.name, { geometry: source, material: node.material });
    });

    return new PartLibrary(parts);
  }

  get(name) {
    const part = this.parts.get(name);
    if (!part) throw new Error(`Part "${name}" is missing in the source model`);
    return part;
  }

  tint(source, id) {
    const preset = EDGE_COLORS[id];
    if (!preset) return source;

    const key = `${source.uuid}:${id}`;
    let material = this.tinted.get(key);
    if (!material) {
      material = source.clone();
      material.color.setRGB(preset.value, preset.value, preset.value, THREE.LinearSRGBColorSpace);
      material.roughness = preset.roughness;
      material.metalness = 0.85;
      this.tinted.set(key, material);
    }
    return material;
  }

  createInstanced(name, count, tintId) {
    const part = this.get(name);
    const geometry = part.geometry;
    const material = tintId ? this.tint(part.material, tintId) : part.material;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  }

  dispose() {
    for (const { geometry, material } of this.parts.values()) {
      geometry.dispose();
      material.dispose();
    }
    for (const material of this.tinted.values()) material.dispose();
    this.parts.clear();
    this.tinted.clear();
  }
}
