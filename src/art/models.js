import * as THREE from 'three';
import { CREW, ITEM_TYPES } from '../core/config.js';
import { PALETTE as P, CREW_STYLE } from './palette.js';
import { itemModel } from './items.js';

export const STATIONS = [
  'hatch',
  'greenhouse',
  'solar',
  'drill',
  'lander',
  'rover-bay',
  'lab',
];
export const MODEL_IDS = [
  ...CREW.map((crew) => `crew-${crew.id}`),
  'bolt',
  'kamote',
  ...STATIONS.map((station) => `station-${station}`),
  ...new Set(
    Object.keys(ITEM_TYPES)
      .filter((id) => id !== 'bolt')
      .map(itemModel),
  ),
  'rock',
  'crater',
];

/** Ground-pivot, untextured original geometry; reusable in the future scramble. */
export function createModel(id) {
  const root = new THREE.Group();
  root.name = id;
  const materials = new Map();
  const geometries = new Map();
  const material = (color) => {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.87,
          metalness: 0.05,
          flatShading: true,
        }),
      );
    return materials.get(color);
  };
  function part(
    name,
    geometry,
    color,
    position,
    scale = [1, 1, 1],
    parent = root,
  ) {
    // Explicit face normals preserve the faceted look in exported glTF.
    const key = `${geometry.type}:${JSON.stringify(geometry.parameters)}`;
    let flat = geometries.get(key);
    if (flat) geometry.dispose();
    else {
      flat = geometry.index ? geometry.toNonIndexed() : geometry;
      if (flat !== geometry) geometry.dispose();
      flat.computeVertexNormals();
      geometries.set(key, flat);
    }
    const mesh = new THREE.Mesh(flat, material(color));
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const box = (name, color, position, scale, parent) =>
    part(name, new THREE.BoxGeometry(), color, position, scale, parent);
  const ball = (name, color, position, scale, parent) =>
    part(
      name,
      new THREE.SphereGeometry(1, 12, 8),
      color,
      position,
      scale,
      parent,
    );
  const cylinder = (name, color, position, scale, parent) =>
    part(
      name,
      new THREE.CylinderGeometry(1, 1, 1, 12),
      color,
      position,
      scale,
      parent,
    );
  function face(y, z, width = 0.22) {
    ball('eye-left', P.ink, [-width, y, z], [0.052, 0.075, 0.03]);
    ball('eye-right', P.ink, [width, y, z], [0.052, 0.075, 0.03]);
    box('smile', P.ink, [0, y - 0.16, z], [0.16, 0.035, 0.025]);
  }
  function badge(crewId, color, position, scale = 0.14) {
    const group = new THREE.Group();
    group.name = `accent-${CREW_STYLE[crewId].accent}`;
    group.position.set(...position);
    root.add(group);
    if (crewId === 'ria') {
      const leaf = ball(
        'leaf',
        color,
        [0, 0, 0],
        [scale * 0.65, scale * 1.2, 0.04],
        group,
      );
      leaf.rotation.z = -0.55;
    } else if (crewId === 'dom' || crewId === 'iggy') {
      for (let i = 0; i < (crewId === 'dom' ? 2 : 1); i++) {
        for (const direction of [-1, 1]) {
          const stripe = box(
            'chevron',
            color,
            [direction * scale * 0.4, i * scale, 0],
            [scale * 0.85, 0.04, 0.03],
            group,
          );
          stripe.rotation.z = direction * -0.55;
        }
      }
    } else if (crewId === 'mara') {
      for (let i = 0; i < 3; i++)
        box(
          'signal',
          color,
          [(i - 1) * scale * 0.65, i * scale * 0.23, 0],
          [scale * 0.38, scale * (0.65 + i * 0.4), 0.04],
          group,
        );
    } else if (crewId === 'aiko') {
      ball(
        'heart-left',
        color,
        [-scale * 0.42, scale * 0.18, 0],
        [scale * 0.65, scale * 0.65, 0.04],
        group,
      );
      ball(
        'heart-right',
        color,
        [scale * 0.42, scale * 0.18, 0],
        [scale * 0.65, scale * 0.65, 0.04],
        group,
      );
      const point = box(
        'heart-point',
        color,
        [0, -scale * 0.35, 0],
        [scale, scale, 0.04],
        group,
      );
      point.rotation.z = Math.PI / 4;
    } else if (crewId === 'sol')
      part(
        'hexagon',
        new THREE.CylinderGeometry(scale, scale, 0.04, 6),
        color,
        [0, 0, 0],
        [1, 1, 1],
        group,
      ).rotation.x = Math.PI / 2;
    else {
      const tab = box(
        'tab',
        color,
        [0, 0, 0],
        [scale * 1.5, scale * 1.5, 0.04],
        group,
      );
      if (crewId === 'tunde') tab.rotation.z = Math.PI / 4;
      else
        for (const x of [-1, 1])
          for (const y of [-1, 1])
            box(
              'stitch',
              P.white,
              [x * scale * 0.5, y * scale * 0.5, 0.04],
              [0.035, 0.065, 0.025],
              group,
            );
    }
  }
  if (id.startsWith('crew-')) {
    const crewId = id.slice(5);
    const style = CREW_STYLE[crewId];
    if (!style) throw new Error(`Unknown crew: ${crewId}`);
    const color = P[style.color];
    for (const x of [-0.23, 0.23]) {
      box(
        x < 0 ? 'boot-left' : 'boot-right',
        P.ink,
        [x, 0.13, 0.06],
        [0.34, 0.26, 0.5],
      );
      box(
        x < 0 ? 'leg-left' : 'leg-right',
        color,
        [x, 0.49, 0],
        [0.31, 0.49, 0.3],
      );
      ball(
        x < 0 ? 'arm-left' : 'arm-right',
        color,
        [x * 2.4, 1.05, 0],
        [0.2, 0.46, 0.22],
      );
      ball(
        x < 0 ? 'glove-left' : 'glove-right',
        P.white,
        [x * 2.5, 0.76, 0.04],
        [0.19, 0.19, 0.21],
      );
    }
    box('backpack', P.ink, [0, 1.13, -0.34], [0.62, 0.66, 0.3]);
    ball('torso', color, [0, 1.04, 0], [0.5, 0.53, 0.32]);
    box('belt', P.ink, [0, 0.72, 0], [0.76, 0.12, 0.48]);
    cylinder('collar', P.ink, [0, 1.49, 0], [0.34, 0.1, 0.34]);
    ball('helmet', P.white, [0, 1.96, 0], [0.64, 0.62, 0.55]);
    ball('visor-rim', P.ink, [0, 1.94, 0.32], [0.53, 0.42, 0.3]);
    ball('visor', P.blue, [0, 1.94, 0.39], [0.47, 0.35, 0.27]);
    ball('visor-glint', P.white, [-0.29, 2.09, 0.59], [0.05, 0.13, 0.028]);
    face(1.98, 0.65, 0.16);
    badge(crewId, P.ink, [0, 1.13, 0.32]);
    badge(crewId, color, [0.48, 2.03, 0.37], 0.075);
  } else if (id === 'bolt') {
    for (const x of [-0.4, 0.4])
      box('tread', P.ink, [x, 0.19, 0], [0.26, 0.38, 0.72]);
    box('body', P.amber, [0, 0.69, 0], [0.85, 0.72, 0.55]);
    box('head', P.white, [0, 1.29, 0], [0.99, 0.49, 0.64]);
    box('face-screen', P.ink, [0, 1.3, 0.34], [0.79, 0.29, 0.025]);
    for (const x of [-0.22, 0.22])
      ball('lit-eye', P.blue, [x, 1.31, 0.38], [0.07, 0.075, 0.03]);
    box('antenna', P.ink, [0.32, 1.71, 0], [0.04, 0.38, 0.04]);
    ball('antenna-tip', P.coral, [0.32, 1.9, 0], [0.08, 0.08, 0.08]);
    for (const x of [-0.62, 0.62]) {
      box('arm', P.regolith, [x, 0.82, 0], [0.4, 0.12, 0.14]);
      box('claw', P.white, [x * 1.18, 0.74, 0.06], [0.12, 0.24, 0.23]);
    }
    box('power-cell', P.blue, [0, 0.78, 0.3], [0.35, 0.25, 0.04]);
  } else if (id === 'kamote') {
    cylinder('pot', P.copper, [0, 0.26, 0], [0.49, 0.52, 0.49]);
    cylinder('soil', P.ink, [0, 0.55, 0], [0.45, 0.04, 0.45]);
    cylinder('stem', P.leaf, [0, 0.9, 0], [0.04, 0.7, 0.04]);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const leaf = ball(
        'leaf',
        P.leaf,
        [Math.cos(angle) * 0.24, 0.86 + i * 0.12, Math.sin(angle) * 0.24],
        [0.33, 0.12, 0.19],
      );
      leaf.rotation.z = (i % 2 ? -1 : 1) * 0.45;
    }
    face(0.33, 0.47, 0.17);
  } else if (id.startsWith('station-')) {
    const station = id.slice(8);
    if (!STATIONS.includes(station))
      throw new Error(`Unknown station: ${station}`);
    box('foundation', P.ink, [0, 0.12, 0], [2.5, 0.24, 1.8]);
    if (station === 'solar') {
      for (const x of [-0.7, 0.7]) {
        cylinder('mast', P.white, [x, 0.65, 0], [0.07, 1.05, 0.07]);
        const panel = box(
          'solar-panel',
          P.blue,
          [x, 1.13, 0],
          [1.15, 0.09, 1.3],
        );
        panel.rotation.x = -0.35;
        for (let i = -1; i <= 1; i++)
          box(
            'cell-divider',
            P.ink,
            [x + i * 0.29, 1.18, 0],
            [0.025, 0.025, 1.26],
          ).rotation.x = -0.35;
      }
    } else if (station === 'drill') {
      for (const x of [-0.72, 0.72])
        box('support', P.amber, [x, 1.18, 0], [0.14, 2.05, 0.19]);
      box('crossbar', P.amber, [0, 2.14, 0], [1.6, 0.22, 0.4]);
      cylinder('auger', P.regolith, [0, 1.18, 0], [0.13, 1.8, 0.13]);
      for (let i = 0; i < 7; i++)
        cylinder(
          'auger-ring',
          P.blue,
          [0, 0.46 + i * 0.2, 0],
          [0.22, 0.08, 0.22],
        );
      box('control', P.ink, [0.68, 1.3, 0.17], [0.33, 0.36, 0.2]);
    } else if (station === 'lander') {
      cylinder('lander-body', P.white, [0, 1.04, 0], [0.71, 1.1, 0.71]);
      part(
        'roof',
        new THREE.ConeGeometry(0.71, 0.5, 8),
        P.regolith,
        [0, 1.81, 0],
      );
      for (const x of [-1, 1])
        for (const z of [-0.65, 0.65]) {
          const leg = box(
            'landing-leg',
            P.amber,
            [x * 0.78, 0.48, z],
            [0.09, 0.65, 0.09],
          );
          leg.rotation.z = -x * 0.4;
          box('footpad', P.ink, [x * 0.94, 0.25, z], [0.42, 0.09, 0.37]);
        }
      ball('window', P.blue, [0, 1.15, 0.7], [0.3, 0.25, 0.05]);
    } else if (station === 'rover-bay') {
      box('rover-body', P.white, [0, 0.75, 0], [1.6, 0.42, 1.05]);
      for (const x of [-0.6, 0.6])
        for (const z of [-0.6, 0.6])
          cylinder('wheel', P.ink, [x, 0.47, z], [0.26, 0.2, 0.26]).rotation.x =
            Math.PI / 2;
      box('seat', P.amber, [-0.42, 1.1, 0], [0.43, 0.48, 0.52]);
      box('cargo', P.copper, [0.4, 1.13, 0], [0.48, 0.48, 0.8]);
      cylinder('antenna', P.ink, [0.54, 1.69, -0.25], [0.035, 1.15, 0.035]);
    } else {
      const color = station === 'greenhouse' ? P.leaf : P.white;
      ball('habitat-shell', color, [0, 0.63, 0], [1.13, 0.96, 0.75]);
      box('door-rim', P.ink, [0, 0.75, 0.71], [0.65, 1.09, 0.19]);
      box('warm-door', P.amber, [0, 0.75, 0.82], [0.45, 0.87, 0.03]);
      for (const x of [-0.7, 0.7])
        ball(
          'window',
          station === 'greenhouse' ? P.blue : P.amber,
          [x, 0.94, 0.57],
          [0.2, 0.21, 0.06],
        );
      if (station === 'lab') {
        cylinder(
          'dish-mast',
          P.regolith,
          [0.65, 1.71, -0.2],
          [0.055, 0.75, 0.055],
        );
        const dish = ball(
          'dish',
          P.blue,
          [0.65, 2.11, -0.2],
          [0.42, 0.12, 0.42],
        );
        dish.rotation.z = 0.4;
      }
      if (station === 'hatch')
        box('step', P.regolith, [0, 0.3, 1], [0.88, 0.13, 0.44]);
      if (station === 'greenhouse')
        for (const x of [-0.5, 0.5])
          ball('garden-leaf', P.ink, [x, 1.29, 0.45], [0.13, 0.18, 0.04]);
    }
  } else if (id.startsWith('item-')) {
    const item = id.slice(5);
    if (!ITEM_TYPES[item]) throw new Error(`Unknown item: ${item}`);
    const colors = {
      water: P.blue,
      food: P.copper,
      radio: P.violet,
      dosimeter: P.regolith,
      seeds: P.leaf,
      repair: P.amber,
      med: P.white,
      battery: P.blue,
      guitar: P.copper,
      game: P.coral,
    };
    if (item === 'guitar') {
      ball('guitar-body', P.copper, [0, 0.4, 0], [0.38, 0.4, 0.13]);
      ball('upper-body', P.copper, [0, 0.7, 0], [0.27, 0.28, 0.12]);
      ball('sound-hole', P.ink, [0, 0.54, 0.12], [0.1, 0.1, 0.03]);
      box('neck', P.amber, [0, 1.08, 0], [0.11, 0.75, 0.1]);
      box('headstock', P.copper, [0, 1.5, 0], [0.21, 0.27, 0.12]);
      for (let i = -1; i <= 1; i++)
        box('string', P.white, [i * 0.03, 0.94, 0.08], [0.006, 1.05, 0.009]);
    } else {
      const width = item === 'water' ? 0.96 : 0.72;
      box('package', colors[item], [0, 0.36, 0], [width, 0.72, 0.44]);
      box('label', P.ink, [0, 0.4, 0.232], [width * 0.64, 0.37, 0.026]);
      if (item === 'water')
        ball('drop', P.blue, [0, 0.4, 0.26], [0.08, 0.13, 0.02]);
      if (item === 'food')
        for (const x of [-0.1, 0.1])
          box('food-bar', P.copper, [x, 0.4, 0.26], [0.08, 0.25, 0.02]);
      if (item === 'seeds') {
        const leaf = ball(
          'seed-leaf',
          P.leaf,
          [0, 0.4, 0.26],
          [0.13, 0.09, 0.02],
        );
        leaf.rotation.z = 0.5;
      }
      if (item === 'med') badge('aiko', P.coral, [0, 0.42, 0.26], 0.1);
      if (item === 'radio') {
        box('antenna', P.ink, [0.23, 0.97, 0], [0.035, 0.6, 0.035]);
        for (let i = 0; i < 3; i++)
          box(
            'speaker-line',
            P.violet,
            [0, 0.3 + i * 0.09, 0.26],
            [0.27, 0.025, 0.02],
          );
      }
      if (item === 'dosimeter')
        box('display', P.leaf, [0, 0.45, 0.26], [0.29, 0.17, 0.02]);
      if (item === 'repair') {
        box('handle', P.ink, [0, 0.79, 0], [0.3, 0.14, 0.11]);
        box('tool', P.amber, [0, 0.4, 0.26], [0.07, 0.24, 0.02]).rotation.z =
          0.55;
      }
      if (item === 'battery') {
        box('contact', P.ink, [0, 0.77, 0], [0.34, 0.1, 0.21]);
        box('charge', P.blue, [0, 0.4, 0.26], [0.24, 0.13, 0.02]);
      }
      if (item === 'game')
        for (const x of [-0.1, 0.1])
          for (const y of [0.31, 0.49])
            ball('pip', P.coral, [x, y, 0.26], [0.035, 0.035, 0.02]);
    }
  } else if (id === 'rock')
    part(
      'rock',
      new THREE.DodecahedronGeometry(0.65, 0),
      P.regolith,
      [0, 0.48, 0],
      [1, 0.76, 0.81],
    );
  else if (id === 'crater') {
    const rim = part(
      'rim',
      new THREE.TorusGeometry(0.76, 0.2, 5, 16),
      P.regolith,
      [0, 0.17, 0],
    );
    rim.rotation.x = Math.PI / 2;
    cylinder('floor', P.ink, [0, 0.025, 0], [0.77, 0.05, 0.77]);
  } else throw new Error(`Unknown model: ${id}`);
  // Root pivot stays on the terrain; geometry bounds never extend below it.
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  root.children.forEach((child) => {
    child.position.y -= bounds.min.y;
  });
  root.userData = {
    provenance: 'Original SHELTER CALL procedural art',
    units: 'GAME metres',
    groundPivot: true,
  };
  return root;
}
