import { itemModel } from '../../art/items.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRng } from '../../core/rng.js';
import { PALETTE as P } from '../../art/palette.js';
import { t } from '../../i18n/index.js';

/** Bake rigid parts by material. Shipped GLBs and their named source parts stay intact. */
function mergeRigid(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const originals = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    const material = node.material;
    const key = `${material.color.getHexString()}:${material.roughness}:${material.metalness}:${material.opacity}`;
    if (!groups.has(key)) groups.set(key, { material, geometry: [] });
    const source = node.geometry.clone();
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.applyMatrix4(node.matrixWorld);
    groups.get(key).geometry.push(geometry);
    originals.add(node.geometry);
  });
  const result = new THREE.Group();
  for (const { material, geometry } of groups.values()) {
    const merged = mergeGeometries(geometry);
    geometry.forEach((value) => value.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    result.add(mesh);
  }
  originals.forEach((geometry) => geometry.dispose());
  return result;
}

/** Original local GLBs, one sun and one renderer. No runtime CDN or textures. */
export async function create3DRenderer(host, state) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scramble-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    t('Lunar outpost. Tap a point to hop there.'),
  );
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!context) throw new Error('WebGL unavailable');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(P.ink, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-16, 16, 16, -16, 0.1, 100);
  const cameraFocus = new THREE.Vector3();
  let width = 1,
    height = 1,
    view = 32,
    visualTime = 0;
  const assets = new Map();
  let observer;
  const labels = [];
  const labelsHost = document.createElement('div');
  labelsHost.className = 'scene-labels';
  labelsHost.setAttribute('aria-hidden', 'true');
  host.append(labelsHost);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(23, 72),
    new THREE.MeshStandardMaterial({ color: P.regolith, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -0.025;
  scene.add(ground);
  scene.add(new THREE.HemisphereLight(P.white, P.ink, 1.4));
  const sun = new THREE.DirectionalLight(P.amber, 2.8);
  sun.position.set(-18, 6, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(
    host.clientWidth < 640 ? 512 : 1024,
    host.clientWidth < 640 ? 512 : 1024,
  );
  Object.assign(sun.shadow.camera, {
    left: -23,
    right: 23,
    top: 23,
    bottom: -23,
    near: 0.1,
    far: 65,
  });
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const random = createRng(`${state.setup.layoutSeed}:sky`);
  const stars = new Float32Array(240);
  for (let i = 0; i < 80; i++)
    stars.set(
      [(random() - 0.5) * 90, 18 + random() * 18, (random() - 0.5) * 90],
      i * 3,
    );
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  scene.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: P.white,
        size: 0.065,
        sizeAttenuation: true,
      }),
    ),
  );
  function addLabel(text, body, offset = 2.2, player = false) {
    const element = document.createElement('span');
    element.className = player ? 'map-label player-label' : 'map-label';
    element.textContent = t(text);
    labelsHost.append(element);
    labels.push({ element, body, offset });
  }
  const loader = new GLTFLoader();
  const ids = [
    ...new Set([
      'station-hatch',
      'kamote',
      'rock',
      'crater',
      'crew-pip',
      ...state.stations.map((s) => `station-${s.id}`),
      ...state.crew.map((c) => `crew-${c.id}`),
      ...state.items.map((i) => itemModel(i.type)),
    ]),
  ];
  const loaded = await Promise.allSettled(
    ids.map(async (id) => {
      const gltf = await loader.loadAsync(
        `${import.meta.env.BASE_URL}assets/models/${id}.glb`,
      );
      const rigid = mergeRigid(gltf.scene);
      rigid.updateMatrixWorld(true);
      assets.set(id, rigid);
    }),
  );
  if (loaded.some((result) => result.status === 'rejected')) {
    dispose();
    throw new Error('Model loading failed');
  }
  function model(id, x, z, scale = 1) {
    const object = assets.get(id).clone(true);
    object.position.set(x, 0, z);
    object.scale.setScalar(scale);
    object.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    scene.add(object);
    return object;
  }
  const hatch = model('station-hatch', 0, 0, 0.85);
  addLabel('HATCH', { x: 0, z: 0, y: 0 }, 2.6);
  model('kamote', -1.8, -0.5, 0.5);
  for (const s of state.stations) {
    model(`station-${s.id}`, s.x, s.z, 0.85).rotation.y = -s.angle;
    addLabel(
      s.id === 'rover-bay' ? 'Rover' : s.id[0].toUpperCase() + s.id.slice(1),
      s,
      2.6,
    );
  }
  const matrix = new THREE.Matrix4(),
    placement = new THREE.Matrix4();
  const position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    rotation = new THREE.Quaternion();
  const batches = [];
  function instance(id, rows, size = 1, pickups = false) {
    const objects = [];
    assets.get(id).traverse((node) => {
      if (!node.isMesh) return;
      const mesh = new THREE.InstancedMesh(
        node.geometry,
        node.material,
        rows.length,
      );
      mesh.castShadow = id !== 'crater';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      scene.add(mesh);
      objects.push({ mesh, local: node.matrixWorld.clone() });
    });
    const batch = { rows, objects, size, pickups, signature: null };
    batches.push(batch);
    return batch;
  }
  instance('rock', state.rocks);
  instance('crater', state.craters, 1.8);
  for (const type of new Set(state.items.map((i) => i.type)))
    instance(
      itemModel(type),
      state.items.filter((i) => i.type === type),
      0.65,
      true,
    );
  const actors = [
    {
      body: state.player,
      object: model('crew-pip', 0, 2.5, 0.85),
      player: true,
    },
    ...state.crew.map((c) => ({
      body: c,
      object: model(`crew-${c.id}`, c.x, c.z, 0.85),
    })),
  ];
  const shadowGeometry = new THREE.CircleGeometry(0.52, 20);
  for (const a of actors) {
    const shadow = new THREE.Mesh(
      shadowGeometry,
      new THREE.MeshBasicMaterial({
        color: P.ink,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    scene.add(shadow);
    a.shadow = shadow;
    addLabel(
      a.player ? 'YOU' : a.body.name,
      a.body,
      a.player ? 2.3 : 2.1,
      a.player,
    );
  }
  labels.sort(
    (a, b) =>
      Number(a.body.status === undefined && a.body !== state.player) -
      Number(b.body.status === undefined && b.body !== state.player),
  );
  const targetMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.42, 24),
    new THREE.MeshBasicMaterial({ color: P.paper, side: THREE.DoubleSide }),
  );
  targetMarker.rotation.x = -Math.PI / 2;
  targetMarker.position.y = 0.03;
  scene.add(targetMarker);
  const dustPool = Array.from({ length: 80 }, () => ({
    until: 0,
    x: 0,
    z: 0,
    dx: 0,
    dz: 0,
  }));
  const dustPositions = new Float32Array(240);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(dustPositions, 3),
  );
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: P.paper,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(dust);
  const stormPositions = new Float32Array(600);
  for (let i = 0; i < 200; i++)
    stormPositions.set(
      [(random() - 0.5) * 35, random() * 8, (random() - 0.5) * 35],
      i * 3,
    );
  const stormGeometry = new THREE.BufferGeometry();
  stormGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(stormPositions, 3),
  );
  const storm = new THREE.Points(
    stormGeometry,
    new THREE.PointsMaterial({
      color: P.paper,
      size: 0.07,
      transparent: true,
      opacity: 0.65,
    }),
  );
  scene.add(storm);
  storm.visible = false;
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height);
    const horizontal = view / 2,
      vertical = horizontal / aspect;
    camera.left = -horizontal;
    camera.right = horizontal;
    camera.top = vertical;
    camera.bottom = -vertical;
    camera.updateProjectionMatrix();
  }
  observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const vector = new THREE.Vector3();
  function render(s, delta, { reducedMotion = false } = {}) {
    visualTime += delta;
    const focus = new THREE.Vector3(s.player.x * 0.35, 0, s.player.z * 0.35);
    cameraFocus.lerp(focus, reducedMotion ? 1 : 1 - Math.exp(-delta * 3));
    camera.position.copy(cameraFocus).add(vector.set(22, 18, 22));
    camera.lookAt(cameraFocus);
    camera.updateMatrixWorld();
    for (const batch of batches) {
      const signature = batch.rows
        .map((row) => `${row.status}:${row.x}:${row.z}`)
        .join('|');
      if (signature === batch.signature) continue;
      batch.signature = signature;
      batch.rows.forEach((row, i) => {
        const visible = !batch.pickups || row.status === 'outside';
        position.set(row.x, 0, row.z);
        rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, row.angle || 0);
        scale.setScalar(visible ? batch.size * (row.scale || 1) : 0);
        placement.compose(position, rotation, scale);
        for (const { mesh, local } of batch.objects) {
          matrix.multiplyMatrices(placement, local);
          mesh.setMatrixAt(i, matrix);
        }
      });
      for (const { mesh } of batch.objects)
        mesh.instanceMatrix.needsUpdate = true;
    }
    for (const a of actors) {
      const b = a.body;
      a.object.visible = b.status !== 'saved';
      a.shadow.visible = a.object.visible;
      a.object.position.set(b.x, reducedMotion ? b.y * 0.15 : b.y, b.z);
      a.object.rotation.y = b.heading;
      a.shadow.position.set(b.x, 0.012, b.z);
      a.shadow.scale.setScalar(1 + b.y * 0.45);
      a.shadow.material.opacity = 0.35 / (1 + b.y);
    }
    const occupied = [];
    for (const label of labels) {
      const b = label.body;
      vector
        .set(
          b.x,
          (reducedMotion ? (b.y || 0) * 0.15 : b.y || 0) + label.offset,
          b.z,
        )
        .project(camera);
      const x = ((vector.x + 1) * width) / 2,
        y = ((1 - vector.y) * height) / 2;
      const size = label.element.textContent.length * 6.5 + 12;
      const offset = [0, -20, 20, -40].find((dy) => {
        const box = {
          left: x - size / 2,
          right: x + size / 2,
          top: y + dy - 18,
          bottom: y + dy,
        };
        if (
          box.left < 0 ||
          box.right > width ||
          box.top < 0 ||
          box.bottom > height
        )
          return false;
        if (
          occupied.some(
            (other) =>
              box.left < other.right + 3 &&
              box.right > other.left - 3 &&
              box.top < other.bottom + 3 &&
              box.bottom > other.top - 3,
          )
        )
          return false;
        occupied.push(box);
        return true;
      });
      label.element.hidden = b.status === 'saved' || offset === undefined;
      label.element.style.transform = `translate(${x}px,${y + (offset || 0)}px) translate(-50%,-100%)`;
    }
    targetMarker.visible = Boolean(s.target);
    if (s.target) targetMarker.position.set(s.target.x, 0.03, s.target.z);
    dustPool.forEach((p, i) => {
      const progress = (visualTime - (p.until - 0.5)) / 0.5;
      dustPositions.set(
        p.until > visualTime && !reducedMotion
          ? [
              p.x + p.dx * progress,
              0.15 + Math.sin(progress * Math.PI) * 0.3,
              p.z + p.dz * progress,
            ]
          : [0, -20, 0],
        i * 3,
      );
    });
    dustGeometry.attributes.position.needsUpdate = true;
    storm.visible =
      s.phase === 'finished' && s.result.timeLeft === 0 && !reducedMotion;
    storm.rotation.y = visualTime * 0.06;
    hatch.rotation.y = 0;
    renderer.render(scene, camera);
  }
  function effects(events) {
    for (const event of events)
      if (event.kind === 'land')
        for (let i = 0; i < 8; i++) {
          const p = dustPool.find((p) => p.until <= visualTime);
          if (!p) break;
          const angle = random() * Math.PI * 2;
          Object.assign(p, {
            until: visualTime + 0.5,
            x: event.x,
            z: event.z,
            dx: Math.cos(angle) * 0.7,
            dz: Math.sin(angle) * 0.7,
          });
        }
  }
  function dispose() {
    observer?.disconnect();
    const geometry = new Set(),
      materials = new Set();
    for (const root of [scene, ...assets.values()])
      root.traverse((node) => {
        if (node.isInstancedMesh) node.dispose();
        if (node.geometry) geometry.add(node.geometry);
        if (node.material)
          for (const material of Array.isArray(node.material)
            ? node.material
            : [node.material])
            materials.add(material);
      });
    geometry.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    sun.shadow.map?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    labelsHost.remove();
    assets.clear();
  }
  const raycaster = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    hit = new THREE.Vector3();
  return {
    canvas,
    render,
    effects,
    point(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((clientX - r.left) / r.width) * 2 - 1,
          1 - ((clientY - r.top) / r.height) * 2,
        ),
        camera,
      );
      raycaster.ray.intersectPlane(plane, hit);
      return { x: hit.x, z: hit.z };
    },
    direction(x, z) {
      return { x: (x + z) / Math.SQRT2, z: (z - x) / Math.SQRT2 };
    },
    zoom(factor) {
      view = Math.max(18, Math.min(38, view * factor));
      resize();
    },
    metrics() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        pixelRatio: renderer.getPixelRatio(),
      };
    },
    dispose,
  };
}
