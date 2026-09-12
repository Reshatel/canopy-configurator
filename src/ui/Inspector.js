import * as THREE from 'three';
import { PART_INFO } from '../config.js';

const matrix = new THREE.Matrix4();

function describe(mesh, instanceId) {
  const info = PART_INFO[mesh.name];
  if (!info) return mesh.name;

  const placement = mesh.userData.placements?.[instanceId];
  const parts = [info.label];
  if (info.section) parts.push(info.section);

  if (placement && info.axis !== undefined) {
    const length = placement.scale[info.axis] * info.base;
    parts.push(`${(length * 1000).toFixed(0)} мм`);
  }
  return parts.join(' · ');
}

export class Inspector {
  constructor(viewer, canopy, label) {
    this.viewer = viewer;
    this.canopy = canopy;
    this.label = label;
    this.queued = null;
    this.frame = null;

    this.highlight = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0xff9f2e,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      })
    );
    this.highlight.matrixAutoUpdate = false;
    this.highlight.renderOrder = 10;
    this.highlight.visible = false;
    viewer.scene.add(this.highlight);

    const canvas = viewer.renderer.domElement;
    canvas.addEventListener('pointermove', (event) => this.schedule(event));
    canvas.addEventListener('pointerleave', () => this.clear());
    canvas.addEventListener('pointerdown', () => viewer.cancelFocus());
    canvas.addEventListener('dblclick', (event) => this.focus(event));
  }

  schedule(event) {
    this.queued = { x: event.clientX, y: event.clientY };
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.update(this.queued);
    });
  }

  update(point) {
    const hit = this.viewer.pick(point, this.canopy.parts.children);

    if (!hit || hit.instanceId === undefined) {
      this.clear();
      return;
    }

    hit.object.getMatrixAt(hit.instanceId, matrix);
    this.highlight.geometry = hit.object.geometry;
    this.highlight.matrix.copy(matrix);
    this.highlight.updateMatrixWorld(true);
    this.highlight.visible = true;

    this.label.textContent = describe(hit.object, hit.instanceId);
    this.label.style.transform = `translate(${point.x + 16}px, ${point.y + 16}px)`;
    this.label.hidden = false;
  }

  clear() {
    this.highlight.visible = false;
    this.label.hidden = true;
  }

  focus(event) {
    const hit = this.viewer.pick({ x: event.clientX, y: event.clientY }, this.canopy.parts.children);
    if (!hit) return;

    hit.object.getMatrixAt(hit.instanceId, matrix);
    const reach = Math.max(0.55, matrix.getMaxScaleOnAxis() * 0.55);
    this.viewer.focusOn(hit.point, reach);
  }
}
