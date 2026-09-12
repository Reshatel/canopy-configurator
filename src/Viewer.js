import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const VIEW_AZIMUTH = new THREE.Vector3(0.66, 0, 1).normalize();
const VIEW_ELEVATION = THREE.MathUtils.degToRad(9);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b1e23);
    this.scene.fog = new THREE.Fog(0x1b1e23, 45, 170);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
    this.camera.position.set(9, 6, 12);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.zoomToCursor = true;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.8;
    this.controls.minDistance = 0.18;
    this.controls.maxDistance = 70;
    this.minCameraHeight = 0.06;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.focusPoint = null;
    this.focusDistance = 1;

    this.setupEnvironment();
    this.setupLights();
    this.setupGround();

    this.onResize = this.onResize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  setupEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
    this.scene.environmentIntensity = 0.9;
    pmrem.dispose();
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xbfd4e6, 0x40372c, 0.35));

    this.sun = new THREE.DirectionalLight(0xfff0dc, 2.1);
    this.sun.position.set(7, 12, 9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0xaec3d6, 0.35);
    this.fill.position.set(-9, 6, -7);
    this.scene.add(this.fill);
  }

  setupGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(160, 128),
      new THREE.MeshStandardMaterial({ color: 0x55564f, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  frame(object) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const target = new THREE.Vector3(center.x, box.min.y + size.y * 0.42, center.z);

    const direction = new THREE.Vector3()
      .copy(VIEW_AZIMUTH)
      .multiplyScalar(Math.cos(VIEW_ELEVATION));
    direction.y = Math.sin(VIEW_ELEVATION);
    direction.normalize();

    const right = new THREE.Vector3().crossVectors(direction, WORLD_UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, direction).normalize();
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360);
    const tanH = tanV * this.freeAspect();

    const corner = new THREE.Vector3();
    let distance = 0;
    for (let i = 0; i < 8; i++) {
      corner
        .set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z
        )
        .sub(target);
      const required =
        Math.max(Math.abs(corner.dot(right)) / tanH, Math.abs(corner.dot(up)) / tanV) +
        corner.dot(direction);
      distance = Math.max(distance, required);
    }
    distance *= 1.05;

    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(direction, distance);
    this.camera.near = Math.max(distance / 200, 0.05);
    this.camera.far = distance * 12;
    this.camera.updateProjectionMatrix();
    this.controls.maxDistance = Math.max(40, distance * 5);
    this.focusPoint = null;
    this.shiftFromPanel(distance);
    this.clampGroundLevel();
    this.controls.update();

    this.updateShadowFrustum(box);
  }

  shiftFromPanel(distance) {
    const offsetPixels = this.panelOffset();
    if (offsetPixels === 0) return;

    this.camera.lookAt(this.controls.target);
    this.camera.updateMatrixWorld(true);

    const height = this.renderer.domElement.clientHeight || 1;
    const worldPerPixel = (2 * distance * Math.tan((this.camera.fov * Math.PI) / 360)) / height;
    const shift = new THREE.Vector3()
      .setFromMatrixColumn(this.camera.matrixWorld, 0)
      .multiplyScalar(-offsetPixels * worldPerPixel);

    this.camera.position.add(shift);
    this.controls.target.add(shift);
  }

  panelOffset() {
    const panel = document.getElementById('panel');
    if (!panel || window.innerWidth < 900) return 0;
    const box = panel.getBoundingClientRect();
    return (box.right + 24) / 2;
  }

  freeAspect() {
    const width = this.renderer.domElement.clientWidth || 1;
    const height = this.renderer.domElement.clientHeight || 1;
    return Math.max(width - this.panelOffset() * 2, width * 0.45) / height;
  }

  updateShadowFrustum(box) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const extent = Math.max(size.x, size.z) * 0.9 + size.y;

    this.sun.target.position.set(center.x, 0, center.z);
    this.sun.position.set(center.x + extent * 0.8, extent * 1.6, center.z + extent);

    const camera = this.sun.shadow.camera;
    camera.left = -extent;
    camera.right = extent;
    camera.top = extent;
    camera.bottom = -extent;
    camera.near = 0.5;
    camera.far = extent * 6;
    camera.updateProjectionMatrix();
  }

  refreshShadows(object) {
    const box = new THREE.Box3().setFromObject(object);
    if (!box.isEmpty()) this.updateShadowFrustum(box);
  }

  onResize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.renderer.setAnimationLoop(this.tick);
  }

  tick() {
    this.stepFocus();
    this.clampGroundLevel();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  pick(point, targets) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((point.x - rect.left) / rect.width) * 2 - 1,
      -((point.y - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(targets, false)[0] ?? null;
  }

  focusOn(point, distance) {
    this.focusPoint = point.clone();
    this.focusDistance = Math.max(this.controls.minDistance * 1.6, distance);
  }

  stepFocus() {
    if (!this.focusPoint) return;

    this.controls.target.lerp(this.focusPoint, 0.16);

    const direction = this.camera.position.clone().sub(this.controls.target);
    const wanted = this.controls.target
      .clone()
      .addScaledVector(direction.normalize(), this.focusDistance);
    this.camera.position.lerp(wanted, 0.16);

    if (this.controls.target.distanceTo(this.focusPoint) < 0.004) this.focusPoint = null;
  }

  cancelFocus() {
    this.focusPoint = null;
  }

  clampGroundLevel() {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const cosine = (this.minCameraHeight - this.controls.target.y) / distance;
    this.controls.maxPolarAngle = Math.acos(THREE.MathUtils.clamp(cosine, -1, 1));
  }
}
