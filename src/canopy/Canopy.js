import * as THREE from 'three';
import { buildLayout } from './layout.js';
import { CLADDING_PARTS } from '../config.js';

const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class Canopy {
  constructor(library) {
    this.library = library;
    this.root = new THREE.Group();
    this.root.name = 'canopy';
    this.parts = new THREE.Group();
    this.cladding = true;
    this.stats = null;

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.95, metalness: 0 })
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0.01;
    this.floor.receiveShadow = true;

    this.root.add(this.floor);
    this.root.add(this.parts);
  }

  update(params) {
    const { placements, stats } = buildLayout(params);
    const grouped = new Map();

    for (const placement of placements) {
      const key = `${placement.part}|${placement.material ?? ''}`;
      let bucket = grouped.get(key);
      if (!bucket) grouped.set(key, (bucket = []));
      bucket.push(placement);
    }

    this.clear();

    for (const bucket of grouped.values()) {
      const { part, material } = bucket[0];
      const mesh = this.library.createInstanced(part, bucket.length, material);
      bucket.forEach((placement, index) => {
        position.fromArray(placement.position);
        quaternion.setFromEuler(euler.set(placement.tilt, placement.rotationY, 0));
        scale.fromArray(placement.scale);
        mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.userData.placements = bucket;
      mesh.visible = this.cladding || !CLADDING_PARTS.includes(mesh.name);
      this.parts.add(mesh);
    }

    this.floor.scale.set(params.width, params.depth, 1);
    this.stats = stats;
    return stats;
  }

  setCladdingVisible(visible) {
    this.cladding = visible;
    for (const mesh of this.parts.children) {
      mesh.visible = visible || !CLADDING_PARTS.includes(mesh.name);
    }
  }

  clear() {
    for (const child of [...this.parts.children]) {
      this.parts.remove(child);
      child.dispose();
    }
  }
}
