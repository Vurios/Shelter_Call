import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createModel } from '../../art/models.js';
import { createCrew, poseCrew } from '../../art/crew.js';
import { optimizeCrew } from '../../art/rig.js';
import { itemModel, itemIcon } from '../../art/items.js';
import { t } from '../../i18n/index.js';
import { TASK_LABELS, escape } from '../../ui/shelter/view.js';

// Layout of the regolith-covered habitat module (GAME art direction, not a real design).
const SHELL = { radius: 4.35, half: 6.6, lip: 1.25 };
const POD = { x: -0.4, z: -1.2 };
// Wall slots wrap the crew pod: tall at the back, low at the front so faces stay visible.
const POCKETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
].map(([col, row]) => ({
  x: POD.x + col * 1.75,
  z: POD.z + row * 1.45,
  height: row < 0 ? 1.15 : row === 0 ? 0.8 : 0.42,
  row,
}));
// Center seats fill first so a small group still sits together.
const SEATS = [
  [-0.28, -0.45],
  [0.3, -0.45],
  [-0.85, -0.25],
  [0.87, -0.25],
];
const OUTSIDE = [
  [-7.7, 0.4],
  [-8.3, 2.3],
  [-9.4, 0.9],
  [-9.0, 3.6],
];
const GROUND = -0.6,
  DECK = 0.06,
  SEAT_DROP = 0.55;
const DOOR_IN = new THREE.Vector3(-5.7, DECK, -0.9);
const DOOR_OUT = new THREE.Vector3(-7.4, GROUND, -0.6);
const CAMERA_OFFSET = new THREE.Vector3(6, 7.2, 18);
const FRAME = {
  room: {
    focus: new THREE.Vector3(-1.8, 1.4, -0.6),
    halfWidth: 8.9,
    minHalf: 3.6,
  },
  pod: {
    focus: new THREE.Vector3(-0.2, 1.1, -0.9),
    halfWidth: 3.9,
    minHalf: 3.3,
  },
};
const NEEDS = (crew) =>
  [
    crew.hunger ? 'food' : null,
    crew.thirst ? 'water' : null,
    crew.status === 'rad-sick' ? 'med' : null,
  ].filter(Boolean);

/** A fixed-camera cutaway. Only the public, equipment-gated view enters this module. */
export function createRoom(
  host,
  { quality = 'auto', reducedMotion = false, onLoss, onPick } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: quality !== 'low',
    alpha: true,
  });
  // Direct sRGB output; no post-processing pass, so no duplicate conversion.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, quality === 'low' ? 1 : 1.5),
  );
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const tags = document.createElement('div');
  tags.className = 'room-tags';
  tags.setAttribute('aria-hidden', 'true');
  host.append(tags);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 90);
  const hemi = new THREE.HemisphereLight('#ffe9c7', '#2c3f4f', 1.5);
  scene.add(hemi);
  // One shadowing key; the lamp and exterior fill are cheap unshadowed lights.
  const key = new THREE.DirectionalLight('#ffd9a0', 2.6);
  key.position.set(-3, 9, 7);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {
    left: -11,
    right: 9,
    top: 7,
    bottom: -6,
    near: 0.5,
    far: 30,
  });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.035;
  scene.add(key);
  const lamp = new THREE.PointLight('#ffc477', 14, 11, 1.6);
  lamp.position.set(POD.x, 3.4, POD.z + 0.6);
  scene.add(lamp);
  const outside = new THREE.DirectionalLight('#9fc6e6', 0.9);
  outside.position.set(-12, 4, 4);
  scene.add(outside);
  let world,
    actors = [],
    raf,
    disposed = false,
    previous = 0,
    time = 0,
    frames = 0,
    slow = 0,
    plant,
    bolt,
    screen,
    emergency,
    lampStrip,
    selectedRing;
  const tagItems = new Map();
  const materials = new Map();
  const mat = (color, roughness = 0.82, extra = {}) => {
    const k = `${color}:${roughness}:${JSON.stringify(extra)}`;
    if (!materials.has(k))
      materials.set(
        k,
        new THREE.MeshStandardMaterial({ color, roughness, ...extra }),
      );
    return materials.get(k);
  };
  function shape(parent, geometry, color, at, scale = [1, 1, 1], finish) {
    const m = new THREE.Mesh(geometry, finish ?? mat(color));
    m.position.set(...at);
    m.scale.set(...scale);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const unitBox = new THREE.BoxGeometry();
  const box = (p, color, at, size, finish) =>
    shape(p, unitBox.clone(), color, at, size, finish);
  const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const pickables = [];
  function pick(parent, kind, id, at, size) {
    const m = new THREE.Mesh(unitBox.clone(), pickMaterial);
    m.position.set(...at);
    m.scale.set(...size);
    m.userData.pick = { kind, id };
    parent.add(m);
    pickables.push(m);
    return m;
  }
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
      if (n.material && n.material !== pickMaterial) mats.add(n.material);
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
      const k = n.material.uuid;
      if (!groups.has(k))
        groups.set(k, { material: n.material, geometries: [] });
      const geometry = n.geometry.index
        ? n.geometry.toNonIndexed()
        : n.geometry.clone();
      for (const name of Object.keys(geometry.attributes))
        if (!['position', 'normal', 'uv'].includes(name))
          geometry.deleteAttribute(name);
      geometry.applyMatrix4(n.matrixWorld);
      groups.get(k).geometries.push(geometry);
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
  function shell(room) {
    const { radius: R, half } = SHELL;
    const arc = Math.PI - SHELL.lip;
    // Cylinder laid along X; the open front is the cutaway.
    const inner = new THREE.CylinderGeometry(
      R,
      R,
      half * 2,
      32,
      1,
      true,
      SHELL.lip,
      arc,
    );
    inner.rotateZ(Math.PI / 2);
    shape(
      room,
      inner,
      '#5d7482',
      [0, 0, 0],
      [1, 1, 1],
      mat('#5d7482', 0.9, { side: THREE.DoubleSide }),
    );
    const cover = new THREE.CylinderGeometry(
      R + 0.55,
      R + 0.55,
      half * 2 + 0.6,
      32,
      1,
      true,
      SHELL.lip + 0.05,
      arc - 0.05,
    );
    cover.rotateZ(Math.PI / 2);
    shape(
      room,
      cover,
      '#77838a',
      [0, 0, 0],
      [1, 1, 1],
      mat('#77838a', 1, { side: THREE.DoubleSide }),
    );
    // Ribs and the thick cut edge show wall depth.
    for (const x of [-half, -3.3, 0, 3.3, half]) {
      const rib = new THREE.TorusGeometry(R - 0.06, 0.11, 6, 28, arc);
      rib.rotateY(Math.PI / 2);
      shape(room, rib, '#93a8b4', [x, 0, 0]);
    }
    const edge = new THREE.TorusGeometry(R + 0.27, 0.3, 4, 28, arc);
    edge.rotateY(Math.PI / 2);
    for (const x of [-half - 0.3, half + 0.3])
      shape(room, edge.clone(), '#465c69', [x, 0, 0]);
    // End caps (half discs) with depth.
    for (const side of [-1, 1]) {
      const cap = new THREE.CircleGeometry(R + 0.55, 28, 0, arc);
      cap.rotateY(Math.PI / 2);
      shape(
        room,
        cap,
        '#3f5562',
        [side * (half + 0.01), 0, 0],
        [1, 1, 1],
        mat('#3f5562', 0.9, { side: THREE.DoubleSide }),
      );
    }
    // A few rocks on the regolith cover; soil shielding is shown simply, not engineered.
    const rock = new THREE.DodecahedronGeometry(0.5);
    for (const [x, a, k] of [
      [-5.2, 1.45, 0.8],
      [-2.1, 1.7, 0.5],
      [1.2, 1.5, 0.7],
      [4.3, 1.8, 0.55],
      [5.6, 1.4, 0.4],
    ]) {
      const r = R + 0.55;
      shape(
        room,
        rock.clone(),
        '#6f7a81',
        [x, Math.sin(a) * r, Math.cos(a) * r],
        [k * 1.4, k * 0.6, k],
      );
    }
    // Deck, grating and a warm trim at the cut.
    box(room, '#2b3d4a', [0, -0.3, -0.9], [half * 2, 0.6, 7.2]);
    box(room, '#b98a68', [0, 0.02, -1.1], [half * 2 - 0.2, 0.08, 6.4]);
    for (let x = -half + 1; x < half; x += 1.1)
      box(room, '#9a7258', [x, 0.07, -1.1], [0.03, 0.01, 6.2]);
    box(room, '#edb96f', [0, 0.08, 2.15], [half * 2, 0.1, 0.12]);
    box(room, '#edb96f', [0, -0.1, 2.3], [half * 2, 0.18, 0.08]);
    // Back-wall panels and a porthole showing an artistic Earth marker.
    for (const x of [-4.9, -1.7, 1.6, 4.6])
      box(room, '#4b6271', [x, 2.6, -4.05], [2.4, 1.5, 0.1]);
    const port = new THREE.TorusGeometry(0.62, 0.11, 6, 24);
    shape(room, port, '#edb96f', [1.6, 3.05, -3.85], [1.2, 1, 1]);
    shape(
      room,
      new THREE.CircleGeometry(0.6, 24),
      '#0b1520',
      [1.6, 3.05, -3.88],
      [1.2, 1, 1],
    );
    shape(
      room,
      new THREE.SphereGeometry(0.12, 12, 8),
      '#67bbe0',
      [1.85, 3.25, -3.8],
    );
    shape(
      room,
      new THREE.ConeGeometry(0.35, 0.3, 5),
      '#8297a4',
      [1.4, 2.7, -3.82],
      [1.3, 1, 0.2],
    );
    // Airlock: round hatch in the left cap, boots by the door and a suit rack.
    const hatch = new THREE.CylinderGeometry(1.05, 1.05, 0.2, 24);
    hatch.rotateZ(Math.PI / 2);
    shape(room, hatch, '#8297a4', [-half + 0.1, 1.3, -1.6]);
    const hatchRim = new THREE.TorusGeometry(1.05, 0.12, 6, 24);
    hatchRim.rotateY(Math.PI / 2);
    shape(room, hatchRim, '#edb96f', [-half + 0.2, 1.3, -1.6]);
    shape(
      room,
      new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16).rotateZ(Math.PI / 2),
      '#243d50',
      [-half + 0.22, 1.3, -1.6],
    );
    box(room, '#243d50', [-4.6, 1.5, -3.65], [1.5, 2.6, 0.5]);
    for (const x of [-5.05, -4.6, -4.15])
      box(room, '#edb96f', [x, 2.55, -3.35], [0.08, 0.08, 0.3]);
    // Ceiling lamp housing.
    box(room, '#243d50', [POD.x, 3.95, -1.6], [5.5, 0.12, 0.45]);
  }
  function stations(room, view) {
    // Radio desk. An empty cradle explains a missing radio without hiding the desk.
    box(room, '#3a5260', [4.3, 0.55, -3.1], [2.6, 1.1, 1.3]);
    box(room, '#edb96f', [4.3, 1.14, -3.05], [2.8, 0.1, 1.45]);
    if (view.radio) prop(room, 'item-radio', [3.8, 1.2, -3.0], 0.75, -0.2);
    else box(room, '#1b2a36', [3.8, 1.25, -3.0], [0.75, 0.08, 0.5]);
    if (view.dosimeter) prop(room, 'item-dosimeter', [4.85, 1.2, -2.95], 0.62);
    else box(room, '#1b2a36', [4.85, 1.24, -2.95], [0.4, 0.06, 0.32]);
    box(room, '#1b2a36', [4.6, 2.2, -3.62], [1.7, 1.0, 0.1]);
    // Pantry rack: grouped shelf stock; counts stay in the DOM inspector.
    box(room, '#3a5260', [5.85, 1.25, -0.6], [0.9, 2.5, 2.4]);
    for (const y of [0.35, 1.05, 1.75])
      box(room, '#edb96f', [5.6, y, -0.6], [0.5, 0.06, 2.3]);
    if (view.wall.concat(view.pantry).some((i) => i.type === 'seeds'))
      box(room, '#3a5260', [4.9, 0.3, 0.9], [1.2, 0.6, 0.9]);
    // Small personal details: a mug and a crayon drawing by the pod.
    shape(
      room,
      new THREE.CylinderGeometry(0.09, 0.08, 0.16, 10),
      '#ec9384',
      [4.95, 1.27, -3.45],
    );
    box(room, '#fff2d5', [-1.9, 2.4, -4.0], [0.7, 0.5, 0.04]);
    box(room, '#86cda1', [-2.0, 2.33, -3.97], [0.28, 0.12, 0.02]);
    box(room, '#edb96f', [-1.75, 2.5, -3.97], [0.14, 0.14, 0.02]);
  }
  function pockets(room, view, slots) {
    const puff = new THREE.SphereGeometry(1, 12, 8);
    slots.forEach((id, i) => {
      const p = POCKETS[i];
      const item = view.wall.find((row) => row.id === id);
      // Every pocket keeps a low rack so an emptied slot still reads as a slot.
      box(room, '#22394a', [p.x, 0.12, p.z], [1.5, 0.12, 0.95]);
      for (const dx of [-0.72, 0.72])
        box(
          room,
          '#93a8b4',
          [p.x + dx, p.height / 2 + 0.1, p.z],
          [0.06, p.height, 0.06],
        );
      if (item) {
        // Filled: a plump stowage bag with straps, topped by its supply.
        const water = item.type === 'water';
        const cloth = water ? '#9cc7d8' : '#d3bf98';
        box(
          room,
          cloth,
          [p.x, p.height / 2 + 0.12, p.z],
          [1.36, p.height - 0.08, 0.85],
        );
        shape(
          room,
          puff.clone(),
          cloth,
          [p.x, p.height + 0.04, p.z],
          [0.68, 0.12, 0.42],
        );
        for (const dx of [-0.35, 0.35])
          box(
            room,
            '#5f4b3a',
            [p.x + dx, p.height / 2 + 0.12, p.z + 0.43],
            [0.08, p.height - 0.06, 0.02],
          );
        prop(
          room,
          itemModel(item.type),
          [p.x, p.height + 0.1, p.z + 0.05],
          p.row < 0 ? 0.6 : 0.52,
          0.15 * (i % 3) - 0.15,
        );
      } else {
        // Empty: the rack is bare and striped where shielding mass used to be.
        for (const dx of [-0.45, 0, 0.45])
          box(room, '#ec9384', [p.x + dx, 0.19, p.z], [0.18, 0.02, 0.85]);
        box(room, '#93a8b4', [p.x, p.height + 0.1, p.z], [1.5, 0.05, 0.05]);
      }
    });
  }
  function pantryStock(room, view) {
    const groups = new Map();
    for (const item of view.pantry)
      groups.set(item.type, (groups.get(item.type) ?? 0) + 1);
    [...groups].slice(0, 6).forEach(([type, count], g) => {
      const shelf = Math.floor(g / 2),
        lane = g % 2;
      for (let n = 0; n < Math.min(count, 3); n++)
        prop(
          room,
          itemModel(type),
          [5.6, 0.38 + shelf * 0.7, -1.35 + lane * 1.1 + n * 0.32],
          0.34,
          -Math.PI / 2,
        );
    });
  }
  function update(view, slots, selected) {
    if (disposed) return;
    const previousPositions = new Map(
      actors.map((actor) => [actor.id, actor.object.position.clone()]),
    );
    if (world) {
      scene.remove(world);
      release(world);
      materials.clear();
    }
    pickables.length = 0;
    world = new THREE.Group();
    scene.add(world);
    actors = [];
    const room = new THREE.Group();
    world.add(room);
    const ground = box(room, '#56636c', [-4, -0.62, 0], [34, 0.04, 20]);
    ground.receiveShadow = true;
    for (const [x, z, s] of [
      [-11, 3, 0.9],
      [-12.5, -1, 0.6],
      [8.5, 2.5, 0.7],
      [-7.2, 3.4, 0.45],
    ])
      shape(
        room,
        new THREE.DodecahedronGeometry(0.6),
        '#6f7c84',
        [x, -0.4, z],
        [s * 1.4, s * 0.8, s],
      );
    shell(room);
    stations(room, view);
    pockets(room, view, slots);
    pantryStock(room, view);
    // Shield ring on the floor: arc length follows the known GAME shield value.
    const share = Math.max(0, Math.min(1, view.shield / 0.9));
    const ringBase = new THREE.RingGeometry(2.55, 2.68, 48);
    ringBase.rotateX(-Math.PI / 2);
    shape(room, ringBase, '#243d50', [POD.x, 0.085, POD.z]);
    batch(room);
    if (share > 0) {
      const ring = new THREE.RingGeometry(
        2.53,
        2.7,
        48,
        1,
        Math.PI / 2,
        share * Math.PI * 2,
      );
      ring.rotateX(-Math.PI / 2);
      const glow = new THREE.Mesh(
        ring,
        new THREE.MeshBasicMaterial({ color: '#edb96f' }),
      );
      glow.position.set(POD.x, 0.09, POD.z);
      world.add(glow);
    }
    // Pick proxies were batched away above; recreate them outside the merged room.
    pickables.length = 0;
    POCKETS.forEach((p, i) =>
      pick(
        world,
        'wall',
        String(i),
        [p.x, p.height / 2 + 0.3, p.z],
        [1.5, p.height + 0.7, 1],
      ),
    );
    pick(world, 'pantry', 'pantry', [5.8, 1.25, -0.6], [1.2, 2.6, 2.6]);
    pick(world, 'radio', 'radio', [4.3, 1.3, -3.0], [2.8, 1.6, 1.6]);
    // Animated or state-driven pieces stay separate from the merged room.
    lampStrip = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.06, 0.3),
      new THREE.MeshStandardMaterial({ color: '#3b3020', emissive: '#ffc477' }),
    );
    lampStrip.position.set(POD.x, 3.87, -1.6);
    world.add(lampStrip);
    emergency = new THREE.Mesh(
      new THREE.BoxGeometry(SHELL.half * 2 - 0.4, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: '#3a2420', emissive: '#ec9384' }),
    );
    emergency.position.set(0, 0.16, -3.95);
    world.add(emergency);
    screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.8),
      new THREE.MeshStandardMaterial({ color: '#0b1520', emissive: '#86cda1' }),
    );
    screen.position.set(4.6, 2.2, -3.56);
    world.add(screen);
    const powered = view.power > 0;
    const low = view.power <= 2;
    lampStrip.material.emissiveIntensity = powered ? (low ? 0.35 : 1.2) : 0.05;
    lamp.intensity = powered ? (low ? 6 : 14) : 1.5;
    hemi.intensity = low ? 1.15 : 1.5;
    emergency.material.emissiveIntensity = low ? 1.1 : 0;
    screen.material.emissiveIntensity = view.radio && powered ? 0.75 : 0;
    // Kamote reacts to known plant, power and repair state only.
    plant = null;
    if (view.wall.concat(view.pantry).some((i) => i.type === 'seeds')) {
      plant = prop(
        world,
        'kamote',
        [4.9, 0.6, 0.9],
        0.66 + Math.min(view.plant, 12) * 0.025,
      );
      plant.userData.droop = view.broken || !powered ? -0.18 : 0;
      const grow = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.05, 0.25),
        new THREE.MeshStandardMaterial({
          color: '#2f3a2c',
          emissive: '#c6f0b5',
        }),
      );
      grow.material.emissiveIntensity = powered && !view.broken ? 0.9 : 0;
      grow.position.set(4.9, 2.6, 0.9);
      world.add(grow);
    }
    bolt = null;
    if (view.boltTask != null) {
      const home = view.boltTask === 'shelter';
      bolt = prop(
        world,
        'bolt',
        home ? [-4.5, 0.08, -0.4] : [-10.4, -0.6, 2.4],
        0.62,
        home ? 0.6 : 1.2,
      );
      bolt.userData = { home, base: bolt.position.y };
      pick(
        world,
        'crew',
        'bolt',
        home ? [-4.5, 0.6, -0.4] : [-10.4, 0, 2.4],
        [1, 1.4, 1],
      );
    }
    let inside = 0,
      away = 0;
    view.crew.forEach((crew, i) => {
      if (crew.status === 'medevac') return;
      const actor = optimizeCrew(createCrew(crew.id));
      const out = crew.assignment !== 'shelter';
      const tired = crew.status === 'rad-sick' || crew.hunger || crew.thirst;
      let spot;
      if (out) {
        const [x, z] = OUTSIDE[away++ % OUTSIDE.length];
        spot = new THREE.Vector3(x, GROUND, z);
      } else {
        const [dx, dz] = SEATS[inside++ % SEATS.length];
        spot = new THREE.Vector3(POD.x + dx * 1.9, DECK, POD.z + dz + 0.25);
      }
      const scale = out ? 0.85 : 0.95;
      actor.scale.setScalar(scale);
      const from = previousPositions.get(crew.id);
      // Crew walk through the airlock instead of passing through walls.
      const path =
        from && !reducedMotion && from.distanceTo(spot) > 0.3
          ? from.x < -SHELL.half === out
            ? [spot]
            : out
              ? [DOOR_IN, DOOR_OUT, spot]
              : [DOOR_OUT, DOOR_IN, spot]
          : [];
      actor.position.copy(path.length ? from : spot);
      if (!path.length && !out) actor.position.y = spot.y - SEAT_DROP * scale;
      actor.rotation.y = out ? 1.1 : -(spot.x - POD.x) * 0.15;
      world.add(actor);
      pick(
        world,
        'crew',
        crew.id,
        [spot.x, spot.y + 0.9, spot.z],
        [0.9, 1.9, 0.9],
      );
      actors.push({
        id: crew.id,
        object: actor,
        spot,
        path: path.map((p) => p.clone()),
        scale,
        out,
        pose: out
          ? 'work'
          : tired
            ? 'tired'
            : view.morale < 3
              ? 'concern'
              : 'idle',
        phase: i * 1.4,
        relief: 0,
      });
      poseCrew(actor, {
        pose: actors.at(-1).pose,
        seated: !out && !path.length,
        reduced: reducedMotion,
      });
      tagFor(crew, out);
    });
    for (const [id, el] of tagItems)
      if (!view.crew.some((c) => c.id === id && c.status !== 'medevac')) {
        el.remove();
        tagItems.delete(id);
      }
    selectedRing = null;
    const chosen = actors.find((a) => a.id === selected);
    if (chosen) {
      const ring = new THREE.RingGeometry(0.42, 0.52, 28);
      ring.rotateX(-Math.PI / 2);
      selectedRing = new THREE.Mesh(
        ring,
        new THREE.MeshBasicMaterial({ color: '#fff2d5' }),
      );
      selectedRing.userData.actor = chosen;
      world.add(selectedRing);
    }
    host.dataset.crewCount = actors.length;
    host.dataset.outside = away;
    host.dataset.gaps = slots.filter(
      (id) => !view.wall.some((i) => i.id === id),
    ).length;
    host.dataset.lighting = !powered ? 'off' : low ? 'low' : 'normal';
    draw();
  }
  function tagFor(crew, out) {
    let el = tagItems.get(crew.id);
    if (!el) {
      el = document.createElement('span');
      el.className = 'room-tag';
      tags.append(el);
      tagItems.set(crew.id, el);
    }
    const needs = NEEDS(crew);
    el.classList.toggle('room-tag-out', out);
    el.innerHTML = `<b>${escape(crew.name)}</b>${out ? `<img src="/assets/icons/${crew.assignment}.svg" alt="">${t(TASK_LABELS[crew.assignment])}` : ''}${needs.map((n) => `<img class="room-need" src="/assets/icons/${itemIcon(n)}.svg" alt="">`).join('')}`;
  }
  const projected = new THREE.Vector3(),
    TAG_LIFT = new THREE.Vector3();
  function placeTags() {
    const width = host.clientWidth,
      height = host.clientHeight;
    for (const actor of actors) {
      const el = tagItems.get(actor.id);
      if (!el) continue;
      projected
        .copy(actor.object.position)
        .add(
          TAG_LIFT.set(
            0,
            actor.scale * (actor.out ? 3.05 : 2.85) -
              (actor.out || actor.path.length ? 0 : SEAT_DROP * actor.scale),
            0,
          ),
        )
        .project(camera);
      const x = ((projected.x + 1) * width) / 2,
        y = ((1 - projected.y) * height) / 2;
      el.hidden = x < 0 || x > width || y < 0 || y > height;
      el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
    }
  }
  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    // Narrow stages crop to the pod; wide stages include the outside work area.
    const pod = aspect < 1.25;
    const frame = pod ? FRAME.pod : FRAME.room;
    const half = Math.max(frame.minHalf, frame.halfWidth / aspect);
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.position.copy(frame.focus).add(CAMERA_OFFSET);
    camera.lookAt(frame.focus);
    camera.updateProjectionMatrix();
    host.dataset.framing = pod ? 'pod' : 'room';
    tags.dataset.framing = host.dataset.framing;
    draw();
  }
  function draw() {
    if (disposed) return;
    if (selectedRing) {
      const p = selectedRing.userData.actor.object.position;
      selectedRing.position.set(
        p.x,
        selectedRing.userData.actor.spot.y + 0.03,
        p.z,
      );
    }
    renderer.render(scene, camera);
    placeTags();
    host.dataset.drawCalls = renderer.info.render.calls;
    host.dataset.triangles = renderer.info.render.triangles;
    host.dataset.geometries = renderer.info.memory.geometries;
  }
  function frame(now) {
    if (disposed) return;
    const delta = previous ? Math.min(0.1, (now - previous) / 1000) : 0;
    previous = now;
    if (!document.hidden) {
      time += delta;
      actors.forEach((actor) => {
        const position = actor.object.position;
        const next = actor.path[0];
        if (next) {
          // Walk at a steady pace; feet stay on the deck or regolith.
          const flat = new THREE.Vector3(
            next.x - position.x,
            0,
            next.z - position.z,
          );
          const distance = flat.length();
          const step = Math.min(distance, delta * 3.2);
          if (distance > 0.001) {
            flat.normalize();
            position.addScaledVector(flat, step);
            actor.object.rotation.y = Math.atan2(flat.x, flat.z);
          }
          position.y = position.x < -SHELL.half - 0.2 ? GROUND : DECK;
          if (distance - step < 0.02) {
            actor.path.shift();
            if (!actor.path.length) {
              actor.object.rotation.y = actor.out
                ? 1.1
                : -(actor.spot.x - POD.x) * 0.15;
              if (!actor.out) actor.relief = time + 1.2;
            }
          }
        }
        const moving = actor.path.length > 0;
        const relief = actor.relief > time;
        const seated = !moving && !relief && !actor.out;
        if (!moving)
          position.y = actor.spot.y - (seated ? SEAT_DROP * actor.scale : 0);
        poseCrew(actor.object, {
          time,
          pose: relief ? 'celebrate' : actor.pose,
          phase: actor.phase,
          moving,
          seated,
        });
      });
      if (plant)
        plant.rotation.z = plant.userData.droop + Math.sin(time * 0.9) * 0.03;
      if (bolt?.userData.home === false)
        bolt.position.y =
          bolt.userData.base + Math.abs(Math.sin(time * 3)) * 0.06;
      if (screen && screen.material.emissiveIntensity > 0)
        screen.material.emissiveIntensity = 0.65 + Math.sin(time * 1.5) * 0.1;
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
  const raycaster = new THREE.Raycaster();
  function hitAt(event) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        1 - ((event.clientY - r.top) / r.height) * 2,
      ),
      camera,
    );
    return raycaster.intersectObjects(pickables, false)[0]?.object.userData
      .pick;
  }
  function click(event) {
    const target = hitAt(event);
    if (target) onPick?.(target);
  }
  function hover(event) {
    canvas.style.cursor = hitAt(event) ? 'pointer' : '';
  }
  function loss(event) {
    event.preventDefault();
    onLoss?.();
  }
  canvas.addEventListener('click', click);
  canvas.addEventListener('pointermove', hover);
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
      canvas.removeEventListener('click', click);
      canvas.removeEventListener('pointermove', hover);
      canvas.removeEventListener('webglcontextlost', loss);
      release(world);
      materials.forEach((m) => m.dispose());
      unitBox.dispose();
      pickMaterial.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      tags.remove();
    },
  };
}
