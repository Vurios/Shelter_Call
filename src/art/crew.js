import * as THREE from 'three';
import { PALETTE as P, CREW_STYLE } from './palette.js';

// Original expedition crew. Identity changes shape, equipment and face, not only color.
export const CREW_FORM = {
  ria: { width: 0.94, height: 1.01, hair: 'bun', tool: 'leaf' },
  dom: { width: 1.16, height: 0.96, hair: 'crop', tool: 'wrench' },
  aiko: { width: 0.92, height: 0.96, hair: 'bob', tool: 'pouch' },
  tunde: { width: 1.02, height: 1.09, hair: 'curls', tool: 'hammer' },
  mara: { width: 0.96, height: 1.04, hair: 'sweep', tool: 'headset' },
  iggy: { width: 1.01, height: 0.98, hair: 'crest', tool: 'goggles' },
  sol: { width: 1.2, height: 0.94, hair: 'cap', tool: 'spoon' },
  pip: { width: 0.88, height: 0.91, hair: 'tuft', tool: 'notebook' },
};

export function createCrew(id) {
  const style = CREW_STYLE[id],
    form = CREW_FORM[id];
  if (!style) throw new Error(`Unknown crew: ${id}`);
  const root = new THREE.Group();
  root.name = `crew-${id}`;
  const mats = new Map();
  const material = (color, finish = 'cloth') => {
    const key = `${color}:${finish}`;
    if (!mats.has(key))
      mats.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness:
            finish === 'glass' ? 0.24 : finish === 'metal' ? 0.48 : 0.88,
          metalness: finish === 'metal' ? 0.32 : 0.02,
        }),
      );
    return mats.get(key);
  };
  function mesh(parent, name, geometry, color, pos, scale = [1, 1, 1], finish) {
    const m = new THREE.Mesh(geometry, material(color, finish));
    m.name = name;
    m.position.set(...pos);
    m.scale.set(...scale);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const ball = (p, n, c, at, s) =>
    mesh(p, n, new THREE.SphereGeometry(1, 10, 7), c, at, s);
  const box = (p, n, c, at, s) => mesh(p, n, new THREE.BoxGeometry(), c, at, s);
  const ring = (p, n, c, at, r, t, rotation = 0) => {
    const m = mesh(p, n, new THREE.TorusGeometry(r, t, 5, 16), c, at);
    m.rotation.x = rotation;
    return m;
  };
  function joint(name, pos) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    root.add(g);
    return g;
  }
  const suit = P[style.color];
  const body = joint('torso', [0, 1.05, 0]);
  // Lathed pressure torso gives shoulder, waist and seat a deliberate continuous profile.
  const outline = [
    [0, -0.42],
    [0.28, -0.42],
    [0.37, -0.3],
    [0.43, 0.08],
    [0.44, 0.24],
    [0.31, 0.43],
    [0, 0.43],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(
    body,
    'pressure-suit',
    new THREE.LatheGeometry(outline, 12),
    P.paper,
    [0, 0, 0],
    [form.width, 1, 0.73],
  );
  ball(
    body,
    'shoulder-yoke',
    suit,
    [0, 0.27, 0],
    [0.48 * form.width, 0.22, 0.32],
  );
  box(body, 'chest-panel', P.white, [0, 0.12, 0.3], [0.43, 0.32, 0.08]);
  box(body, 'panel-inset', P.ink, [-0.08, 0.16, 0.35], [0.13, 0.09, 0.025]);
  for (let n = 0; n < 3; n++)
    box(
      body,
      'panel-key',
      n === 0 ? P.blue : P.amber,
      [0.08 + n * 0.05, 0.15, 0.36],
      [0.025, 0.045, 0.018],
    );
  box(
    body,
    'waist-webbing',
    P.ink,
    [0, -0.24, 0.02],
    [0.73 * form.width, 0.12, 0.51],
  );
  box(body, 'belt-buckle', P.amber, [0, -0.24, 0.3], [0.15, 0.1, 0.035]);
  box(body, 'life-pack', P.regolith, [0, 0.06, -0.34], [0.58, 0.65, 0.27]);
  for (const x of [-0.17, 0.17]) {
    ball(body, 'air-cell', P.white, [x, 0.1, -0.49], [0.11, 0.26, 0.11]);
    box(body, 'air-cell-band', suit, [x, 0.06, -0.57], [0.17, 0.09, 0.04]);
  }
  ring(body, 'neck-lock', P.ink, [0, 0.48, 0], 0.27, 0.07, Math.PI / 2);
  for (const side of [-1, 1]) {
    const label = side < 0 ? 'left' : 'right';
    const leg = joint(`leg-${label}`, [side * 0.23, 0.72, 0]);
    ball(leg, 'leg-pressure', P.paper, [0, -0.17, 0], [0.2, 0.32, 0.21]);
    box(leg, 'knee-pad', suit, [0, -0.27, 0.16], [0.25, 0.19, 0.09]);
    ball(leg, 'boot', P.ink, [0, -0.58, 0.1], [0.22, 0.14, 0.34]);
    box(leg, 'sole', P.regolith, [0, -0.67, 0.09], [0.42, 0.1, 0.56]);
    for (let k = 0; k < 3; k++)
      box(
        leg,
        'boot-rib',
        P.paper,
        [0, -0.54, 0.3 + k * 0.025],
        [0.25, 0.025, 0.015],
      );
    const arm = joint(`arm-${label}`, [side * 0.46 * form.width, 1.4, 0]);
    ball(arm, 'shoulder', suit, [side * 0.04, -0.05, 0], [0.2, 0.22, 0.23]);
    ball(arm, 'sleeve', P.paper, [side * 0.07, -0.28, 0], [0.16, 0.29, 0.17]);
    ring(
      arm,
      'wrist-lock',
      P.ink,
      [side * 0.08, -0.47, 0],
      0.13,
      0.035,
      Math.PI / 2,
    );
    ball(arm, 'glove', suit, [side * 0.07, -0.59, 0.04], [0.15, 0.15, 0.17]);
    ball(arm, 'thumb', suit, [side * -0.02, -0.55, 0.15], [0.08, 0.09, 0.08]);
  }
  const head = joint('head', [0, 1.97, 0]);
  ball(head, 'helmet-shell', P.white, [0, 0, 0], [0.55, 0.57, 0.49]);
  ball(head, 'visor-gasket', P.ink, [0, -0.01, 0.29], [0.47, 0.44, 0.29]);
  ball(head, 'face', style.skin, [0, -0.03, 0.42], [0.37, 0.35, 0.21]);
  ball(head, 'nose', style.skin, [0, -0.035, 0.635], [0.065, 0.065, 0.052]);
  for (const x of [-0.135, 0.135]) {
    ball(head, 'eye-white', P.paper, [x, 0.04, 0.606], [0.055, 0.065, 0.025]);
    ball(head, 'eye', P.ink, [x + 0.005, 0.04, 0.63], [0.027, 0.041, 0.015]);
    box(
      head,
      'brow',
      style.hair,
      [x, 0.145, 0.6],
      [0.12, 0.035, 0.024],
    ).rotation.z = x < 0 ? 0.12 : -0.12;
  }
  const smile = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.09, -0.17, 0.61),
    new THREE.Vector3(0, -0.23, 0.635),
    new THREE.Vector3(0.09, -0.17, 0.61),
  );
  mesh(
    head,
    'mouth',
    new THREE.TubeGeometry(smile, 8, 0.016, 4, false),
    P.ink,
    [0, 0, 0],
  );
  // Small, separate locks and visors retain their real material distinction.
  for (const x of [-0.5, 0.5])
    ball(head, 'helmet-hinge', suit, [x, -0.03, 0.12], [0.09, 0.12, 0.14]);
  box(head, 'helmet-crown', suit, [0, 0.53, 0.02], [0.18, 0.045, 0.35]);
  ball(
    head,
    'visor-highlight',
    P.white,
    [-0.35, 0.19, 0.49],
    [0.024, 0.12, 0.018],
  );
  const hair = style.hair;
  if (form.hair === 'curls') {
    for (let i = 0; i < 5; i++)
      ball(
        head,
        'curl',
        hair,
        [(i - 2) * 0.13, 0.26 + Math.sin(i) * 0.025, 0.48],
        [0.095, 0.09, 0.08],
      );
  } else {
    const tuft = ball(
      head,
      'hairline',
      hair,
      [0, 0.25, 0.47],
      [0.33, 0.13, 0.11],
    );
    tuft.rotation.z =
      form.hair === 'sweep' ? -0.25 : form.hair === 'tuft' ? 0.2 : 0;
  }
  if (form.hair === 'bun')
    ball(head, 'hair-bun', hair, [0.24, 0.4, 0.13], [0.16, 0.16, 0.15]);
  if (form.hair === 'bob')
    for (const x of [-0.31, 0.31])
      ball(head, 'bob-lock', hair, [x, 0.07, 0.43], [0.075, 0.23, 0.09]);
  if (form.hair === 'crest')
    for (let i = 0; i < 3; i++)
      ball(
        head,
        'swept-lock',
        hair,
        [-0.17 + i * 0.13, 0.31 + i * 0.025, 0.49],
        [0.12, 0.12, 0.07],
      );
  if (id === 'sol')
    for (const x of [-0.05, 0.05])
      ball(head, 'moustache', hair, [x, -0.12, 0.64], [0.065, 0.032, 0.018]);
  if (id === 'dom' || id === 'mara') {
    for (const x of [-0.14, 0.14])
      ring(head, 'spectacle', P.ink, [x, 0.04, 0.654], 0.084, 0.014);
    box(head, 'glasses-bridge', P.ink, [0, 0.04, 0.65], [0.09, 0.018, 0.02]);
  }
  if (id === 'mara') {
    box(head, 'comms-boom', P.ink, [0.33, -0.13, 0.47], [0.035, 0.035, 0.37]);
    ball(head, 'microphone', P.ink, [0.26, -0.15, 0.64], [0.07, 0.045, 0.035]);
  }
  const toolColor = id === 'aiko' ? P.coral : suit;
  box(
    body,
    'utility-pouch',
    toolColor,
    [0.34 * form.width, -0.19, 0.16],
    [0.19, 0.25, 0.18],
  );
  if (['dom', 'tunde', 'sol'].includes(id)) {
    const shaft = box(
      body,
      form.tool,
      P.regolith,
      [-0.37, -0.17, 0.23],
      [0.055, 0.37, 0.055],
    );
    shaft.rotation.z = -0.2;
    ball(
      body,
      'tool-head',
      P.amber,
      [-0.4, 0.02, 0.23],
      [id === 'sol' ? 0.07 : 0.12, 0.06, 0.05],
    );
  }
  if (id === 'ria')
    ball(body, 'seed-vial', P.leaf, [-0.29, -0.12, 0.32], [0.065, 0.14, 0.06]);
  if (id === 'pip')
    box(
      body,
      'field-notes',
      P.blue,
      [-0.3, -0.14, 0.3],
      [0.19, 0.24, 0.055],
    ).rotation.z = 0.1;
  if (id === 'iggy')
    box(head, 'goggle-strap', P.coral, [0, 0.32, 0.35], [0.58, 0.075, 0.13]);
  root.scale.y = form.height;
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  root.position.y -= bounds.min.y;
  return root;
}

const rigs = new WeakMap();
/** Cosmetic only. No engine state, clock reads or RNG consumption. */
export function poseCrew(
  root,
  {
    time = 0,
    pose = 'idle',
    moving = false,
    airborne = 0,
    reduced = false,
    phase = 0,
  } = {},
) {
  if (!rigs.has(root))
    rigs.set(
      root,
      Object.fromEntries(
        ['head', 'torso', 'arm-left', 'arm-right', 'leg-left', 'leg-right'].map(
          (n) => [n, root.getObjectByName(n)],
        ),
      ),
    );
  const r = rigs.get(root),
    wave = reduced ? 0 : Math.sin(time * 2 + phase),
    stride = reduced ? 0 : Math.sin(time * 7 + phase);
  const work = pose === 'work',
    rest = pose === 'rest' || pose === 'tired',
    concern = pose === 'concern',
    celebrate = pose === 'celebrate';
  if (r.head) {
    r.head.rotation.x = rest ? 0.14 : concern ? 0.1 : wave * 0.018;
    r.head.rotation.z = concern ? -0.1 : 0;
  }
  if (r.torso) r.torso.rotation.x = rest ? 0.08 : 0;
  for (const [side, sign] of [
    ['left', -1],
    ['right', 1],
  ]) {
    const arm = r[`arm-${side}`],
      leg = r[`leg-${side}`];
    if (arm) {
      arm.rotation.x = moving
        ? stride * 0.28 * sign
        : work
          ? -0.65 + wave * 0.12
          : 0;
      arm.rotation.z = celebrate
        ? sign * -1.9
        : sign * (airborne ? 0.24 : 0.045);
    }
    if (leg)
      leg.rotation.x = moving
        ? stride * -0.22 * sign
        : airborne
          ? 0.12 * sign
          : 0;
  }
}
