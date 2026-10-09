import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createModel } from '../../art/models.js';
import { createCrew, poseCrew } from '../../art/crew.js';
import { optimizeCrew } from '../../art/rig.js';
import { itemModel } from '../../art/items.js';

/** A fixed-camera cutaway. Only the public, equipment-gated view enters this module. */
export function createRoom(
  host,
  { quality = 'auto', reducedMotion = false, onLoss } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: quality !== 'low',
    alpha: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, quality === 'low' ? 1 : 1.5),
  );
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101d2a');
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 80);
  camera.position.set(9, 8, 17);
  camera.lookAt(0, 1, 0);
  scene.add(new THREE.HemisphereLight('#fff2d5', '#344b5b', 2));
  const sun = new THREE.DirectionalLight('#ffcf8e', 3.2);
  sun.position.set(-4, 8, 6);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {
    left: -8,
    right: 8,
    top: 6,
    bottom: -6,
    near: 0.1,
    far: 25,
  });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#67bbe0', 1.1);
  fill.position.set(6, 4, -5);
  scene.add(fill);
  let world,
    actors = [],
    raf,
    disposed = false,
    previous = 0,
    time = 0,
    frames = 0,
    slow = 0;
  const materials = new Map();
  const mat = (color, roughness = 0.82) => {
    const key = `${color}:${roughness}`;
    if (!materials.has(key))
      materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
    return materials.get(key);
  };
  function shape(parent, geometry, color, at, scale = [1, 1, 1]) {
    const m = new THREE.Mesh(geometry, mat(color));
    m.position.set(...at);
    m.scale.set(...scale);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (p, color, at, size) =>
    shape(p, new THREE.BoxGeometry(), color, at, size);
  function prop(parent, id, at, scale, turn = 0) {
    const object = createModel(id);
    object.position.add(new THREE.Vector3(...at));
    object.scale.multiplyScalar(scale);
    object.rotation.y = turn;
    parent.add(object);
    return object;
  }
  function release(root) {
    const geometry = new Set(),
      mats = new Set();
    root?.traverse((n) => {
      if (n.geometry) geometry.add(n.geometry);
      if (n.material) mats.add(n.material);
    });
    geometry.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  }
  function batch(root) {
    root.updateMatrixWorld(true);
    const groups = new Map(),
      original = new Set(),
      allMaterials = new Set();
    root.traverse((n) => {
      if (!n.isMesh) return;
      allMaterials.add(n.material);
      const key = `${n.material.color.getHex()}:${n.material.roughness}:${n.material.metalness}`;
      if (!groups.has(key))
        groups.set(key, { material: n.material, geometries: [] });
      const geometry = n.geometry.index
        ? n.geometry.toNonIndexed()
        : n.geometry.clone();
      geometry.applyMatrix4(n.matrixWorld);
      groups.get(key).geometries.push(geometry);
      original.add(n.geometry);
    });
    root.clear();
    original.forEach((g) => g.dispose());
    for (const { material, geometries } of groups.values()) {
      allMaterials.delete(material);
      const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
      geometries.forEach((g) => g.dispose());
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    allMaterials.forEach((material) => material.dispose());
  }
  function update(view, slots) {
    if (disposed) return;
    const previousPositions = new Map(
      actors.map((actor) => [actor.id, actor.object.position.clone()]),
    );
    if (world) {
      scene.remove(world);
      release(world);
      materials.clear();
    }
    world = new THREE.Group();
    scene.add(world);
    actors = [];
    const room = new THREE.Group();
    world.add(room);
    box(room, '#526975', [0, -0.38, 2], [15, 0.14, 8]);
    // Low shell, open front and offset airlock give the expedition its own composition.
    box(room, '#344b5b', [0, -0.25, 0], [13.8, 0.5, 8.2]);
    box(room, '#bd8965', [0, 0.015, 0.3], [12.7, 0.12, 6.8]);
    box(room, '#526975', [0, 2.05, -3.6], [13.3, 4.2, 0.25]);
    for (const x of [-6.5, -3.5, 0, 3.5, 6.5])
      box(room, '#8297a4', [x, 2.1, -3.34], [0.13, 4.2, 0.23]);
    box(room, '#edb96f', [0, 4.15, -3.35], [13.4, 0.18, 0.35]);
    for (const x of [-5.9, 5.9]) {
      box(room, '#243d50', [x, 0.55, 1], [0.2, 1.1, 5]);
      box(room, '#edb96f', [x, 1.15, 1], [0.26, 0.13, 5]);
    }
    for (const x of [-4, -2, 0, 2, 4])
      box(room, '#936e59', [x, 0.083, 0.3], [0.025, 0.012, 6.3]);
    for (const z of [-1.8, 0.3, 2.4])
      box(room, '#936e59', [0, 0.084, z], [12, 0.012, 0.025]);
    // Porthole: lunar terrain, with an artistic Earth marker, not a live observation.
    const rim = shape(
      room,
      new THREE.TorusGeometry(1.02, 0.12, 6, 32),
      '#edb96f',
      [1, 2.92, -3.11],
      [1.5, 0.8, 1],
    );
    rim.rotation.x = 0;
    shape(
      room,
      new THREE.CircleGeometry(0.99, 32),
      '#101d2a',
      [1, 2.92, -3.12],
      [1.5, 0.8, 1],
    );
    shape(
      room,
      new THREE.SphereGeometry(0.18, 12, 8),
      '#67bbe0',
      [1.5, 3.12, -3.02],
    );
    for (const x of [-0.05, 0.5, 1.2, 1.8])
      shape(
        room,
        new THREE.ConeGeometry(0.45, 0.5, 5),
        '#8297a4',
        [x, 2.5, -3],
        [1, 1, 0.3],
      );
    // Airlock rim and stepped walkway.
    box(room, '#101d2a', [-5.05, 1.4, -2.9], [2, 2.8, 0.6]);
    box(room, '#8297a4', [-5.05, 1.4, -2.53], [1.6, 2.5, 0.16]);
    box(room, '#243d50', [-5.05, 1.45, -2.4], [1.25, 2.05, 0.12]);
    box(room, '#edb96f', [-5.05, 1.45, -2.31], [1.1, 0.1, 0.1]);
    box(room, '#8297a4', [-5.05, 0.18, -1.95], [2.2, 0.3, 1]);
    // Eight physical pockets exactly match saved journal slots; gaps stay empty.
    slots.forEach((id, i) => {
      const x = -2.9 + (i % 4) * 1.07,
        y = 0.24 + Math.floor(i / 4) * 0.85;
      box(room, '#101d2a', [x, y + 0.35, -2.9], [1, 0.8, 0.08]);
      box(room, '#526975', [x, y, -2.43], [1, 0.06, 1]);
      for (const side of [-0.49, 0.49])
        box(room, '#526975', [x + side, y + 0.35, -2.43], [0.035, 0.75, 1]);
      box(room, '#edb96f', [x, y, -1.93], [1, 0.065, 0.075]);
      const item = view.wall.find((item) => item.id === id);
      if (item) prop(room, itemModel(item.type), [x, y + 0.05, -2.12], 0.57);
    });
    box(room, '#243d50', [4.55, 0.6, -2.3], [2.2, 1.2, 1.3]);
    box(room, '#edb96f', [4.55, 1.25, -2.3], [2.4, 0.15, 1.5]);
    if (view.radio) prop(room, 'item-radio', [4.15, 1.34, -2.2], 0.8);
    if (view.dosimeter) prop(room, 'item-dosimeter', [5.1, 1.34, -2.25], 0.65);
    for (let n = 0; n < 3; n++)
      box(
        room,
        view.power > n * 2 ? '#86cda1' : '#8297a4',
        [5.25, 0.55 + n * 0.17, -1.63],
        [0.35, 0.08, 0.025],
      );
    if (view.wall.concat(view.pantry).some((i) => i.type === 'seeds')) {
      const plant = prop(
        room,
        'kamote',
        [4.8, 0.1, 0.1],
        0.72 + Math.min(view.plant, 12) * 0.02,
      );
      if (view.broken || view.power <= 0) plant.rotation.z = -0.15;
    }
    // Shelf stock is grouped for readability; count and exact contents remain in DOM.
    [...new Map(view.pantry.map((item) => [item.type, item])).values()]
      .slice(0, 6)
      .forEach((item, i) =>
        prop(
          room,
          itemModel(item.type),
          [-5.25 + (i % 2) * 0.72, 0.1 + Math.floor(i / 2) * 0.45, 2.1],
          0.48,
        ),
      );
    if (view.boltTask != null)
      prop(
        room,
        'bolt',
        [
          -4.1,
          view.boltTask === 'shelter' ? 0.1 : -0.3,
          view.boltTask === 'shelter' ? 0.7 : 4.1,
        ],
        0.64,
        0.3,
      );
    batch(room);
    view.crew.forEach((crew, i) => {
      if (crew.status === 'medevac') return;
      const actor = optimizeCrew(createCrew(crew.id));
      const outside = crew.assignment !== 'shelter';
      const x = -2.9 + i * 1.85;
      actor.position.set(
        x,
        outside ? -0.3 : 0.1,
        outside ? 4.25 : 0.2 + (i % 2) * 0.7,
      );
      actor.rotation.y = -0.12 + i * 0.07;
      actor.scale.setScalar(1.2);
      world.add(actor);
      actors.push({
        id: crew.id,
        object: actor,
        target: actor.position.clone(),
        pose:
          crew.status === 'rad-sick' || crew.hunger || crew.thirst
            ? 'tired'
            : view.morale < 3
              ? 'concern'
              : crew.assignment === 'rest'
                ? 'rest'
                : crew.assignment === 'shelter'
                  ? 'idle'
                  : 'work',
        phase: i * 1.4,
      });
      if (!reducedMotion && previousPositions.has(crew.id))
        actor.position.copy(previousPositions.get(crew.id));
      poseCrew(actor, { pose: actors.at(-1).pose, reduced: reducedMotion });
    });
    host.dataset.crewCount = actors.length;
    draw();
  }
  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height,
      half = Math.max(4.8, 8.1 / aspect);
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    draw();
  }
  function draw() {
    if (!disposed) {
      renderer.render(scene, camera);
      host.dataset.drawCalls = renderer.info.render.calls;
      host.dataset.triangles = renderer.info.render.triangles;
      host.dataset.geometries = renderer.info.memory.geometries;
    }
  }
  function frame(now) {
    if (disposed) return;
    const delta = previous ? Math.min(0.1, (now - previous) / 1000) : 0;
    previous = now;
    if (!document.hidden) {
      time += delta;
      if (!reducedMotion)
        actors.forEach((actor) => {
          const moving =
            actor.object.position.distanceToSquared(actor.target) > 0.002;
          actor.object.position.lerp(actor.target, 1 - Math.exp(-delta * 5));
          poseCrew(actor.object, {
            time,
            pose: actor.pose,
            phase: actor.phase,
            moving,
          });
        });
      draw();
      if (quality === 'auto' && frames++ < 120 && delta > 0.028) slow++;
      if (frames === 120 && slow > 50) {
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
        host.dataset.quality = 'low';
        resize();
      }
    }
    raf = requestAnimationFrame(frame);
  }
  function loss(event) {
    event.preventDefault();
    onLoss?.();
  }
  canvas.addEventListener('webglcontextlost', loss);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  host.dataset.quality = quality;
  if (!reducedMotion) raf = requestAnimationFrame(frame);
  return {
    update,
    metrics: () => ({
      ...renderer.info.render,
      geometries: renderer.info.memory.geometries,
      pixelRatio: renderer.getPixelRatio(),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', loss);
      release(world);
      materials.forEach((m) => m.dispose());
      sun.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
