import { createRng } from '../../core/rng.js';
import { SCRAMBLE_CONFIG as C } from '../../core/config.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const STATIONS = ['greenhouse', 'solar', 'drill', 'lander', 'rover-bay', 'lab'];
const actor = (x, z) => ({ x, z, y: 0, vx: 0, vz: 0, vy: 0, heading: 0 });
// GAME layout: each crew member waits by their workplace; gear sits where it is used.
const HOME = {
  Botanist: 'greenhouse',
  Engineer: 'solar',
  Medic: 'lander',
  Geologist: 'drill',
  'Comms Officer': 'lab',
  'Rover Pilot': 'rover-bay',
  Chef: 'greenhouse',
  Rookie: 'lab',
};
const GEAR = {
  radio: 'lab',
  dosimeter: 'lab',
  electron: 'lab',
  seeds: 'greenhouse',
  battery: 'solar',
  repair: 'rover-bay',
  bolt: 'rover-bay',
  med: 'lander',
  guitar: 'lander',
  game: 'lander',
};
// Food and water wait on pallets between the modules and the hatch.
const PALLETS = {
  food: ['greenhouse', 'lander', 'rover-bay', 'porch-a'],
  water: ['drill', 'solar', 'lab', 'porch-b'],
};
/** Render-agnostic GAME motion; no browser, network, clock or unseeded RNG. */
export function createScramble(setup) {
  const random = createRng(`${setup.layoutSeed}:outpost`);
  const rotation = random() * Math.PI * 2;
  const stations = STATIONS.map((id, i) => {
    const angle = rotation + (i / STATIONS.length) * Math.PI * 2;
    const radius = C.stationRadius + (random() - 0.5) * C.stationOffset;
    return {
      id,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      angle,
    };
  });
  const place = createRng(`${setup.layoutSeed}:caches`);
  const anchor = (id) => stations.find((station) => station.id === id);
  const caches = [...PALLETS.food, ...PALLETS.water].map((id, i) => {
    const porch = id.startsWith('porch');
    const angle = porch
      ? rotation + (id === 'porch-a' ? 0.5 : 3.6)
      : anchor(id).angle + (place() - 0.5) * 0.3;
    const radius = porch ? 3.7 : C.stationRadius - 3;
    return {
      id: `${id}-${i < PALLETS.food.length ? 'food' : 'water'}`,
      type: i < PALLETS.food.length ? 'food' : 'water',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      angle,
      count: 0,
    };
  });
  const near = (station, inward, side) => {
    const ux = Math.cos(station.angle),
      uz = Math.sin(station.angle);
    return {
      x: station.x - ux * inward - uz * side,
      z: station.z - uz * inward + ux * side,
    };
  };
  const crowd = new Map();
  const spawn = (row) => {
    let at;
    if (row.trait) {
      const station = anchor(HOME[row.trait] ?? 'lab');
      const n = crowd.get(station.id) ?? 0;
      crowd.set(station.id, n + 1);
      at = near(station, 2.1, n % 2 ? -1.3 : 1.3);
    } else if (PALLETS[row.type]) {
      const pallets = caches.filter((cache) => cache.type === row.type);
      const cache = pallets.reduce((a, b) => (b.count < a.count ? b : a));
      const k = cache.count++;
      const layer = Math.floor(k / 6),
        cell = k % 6,
        gap = row.type === 'water' ? 0.62 : 0.5;
      const across = ((cell % 3) - 1) * gap,
        along = (Math.floor(cell / 3) - 0.5) * gap;
      const c = Math.cos(cache.angle),
        n = Math.sin(cache.angle);
      at = {
        x: cache.x + c * along - n * across,
        z: cache.z + n * along + c * across,
        lift: 0.12 + layer * (row.type === 'water' ? 0.42 : 0.3),
        angle: -cache.angle,
      };
    } else {
      const station = anchor(GEAR[row.type] ?? 'lander');
      const n = crowd.get(`gear-${station.id}`) ?? 0;
      crowd.set(`gear-${station.id}`, n + 1);
      at = near(station, 2.4, (n - 1) * 0.75);
      at.angle = -station.angle;
    }
    return {
      ...structuredClone(row),
      ...actor(at.x, at.z),
      lift: at.lift ?? 0,
      angle: at.angle ?? 0,
      status: 'outside',
      pickupAt: 0,
    };
  };
  const scatter = (count, outer) =>
    Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const radius = outer ? 12.5 + random() * 9 : 3 + random() * 14;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.2 + random() * 0.65,
        angle,
      };
    });
  return {
    setup: structuredClone(setup),
    stations,
    rocks: scatter(C.rocks, true),
    craters: scatter(C.craters, false),
    player: actor(0, 2.5),
    items: setup.itemSpawns.map(spawn),
    crew: setup.crewSpawns.map(spawn),
    caches: caches.filter((cache) => cache.count),
    carried: [],
    savedItems: [],
    savedCrew: [],
    target: null,
    elapsed: 0,
    remaining: setup.seconds,
    accumulator: 0,
    phase: 'ready',
    events: [],
    result: null,
  };
}
export function startScramble(state) {
  if (state.phase === 'ready') state.phase = 'playing';
}
export function setTarget(state, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const length = Math.hypot(x, z);
  const scale = Math.min(1, C.mapRadius / (length || 1));
  state.target = { x: x * scale, z: z * scale };
}
export function usedSlots(state) {
  return state.carried.reduce(
    (n, id) => n + state.items.find((i) => i.id === id).slots,
    0,
  );
}
export function dropCarried(state, id) {
  if (state.phase !== 'playing' || !state.carried.includes(id)) return;
  const item = state.items.find((i) => i.id === id);
  Object.assign(item, {
    x: state.player.x + 0.5,
    z: state.player.z + 0.5,
    lift: 0,
    status: 'outside',
    pickupAt: state.elapsed + C.dropCooldown,
  });
  state.carried = state.carried.filter((value) => value !== id);
  state.events.push({ kind: 'drop', text: `${item.name} put down.` });
}
export function finishScramble(state, early = false) {
  if (state.phase !== 'playing') return state.result;
  if (
    early &&
    (distance(state.player, { x: 0, z: 0 }) > C.hatchRadius ||
      state.player.y > C.groundReach)
  )
    return null;
  state.phase = 'finished';
  state.result = {
    itemsSaved: [...state.savedItems],
    crewSaved: [...state.savedCrew],
    crewExposed: state.crew
      .filter((c) => c.status !== 'saved')
      .map((c) => c.id),
    timeLeft: early ? state.remaining : 0,
  };
  state.events.push({
    kind: early ? 'hatch' : 'storm',
    text: early
      ? 'Hatch closed. Your saved crew are inside.'
      : 'Particles arrived. Crew outside are exposed, and will join the shelter.',
  });
  return state.result;
}
function hop(body, dx, dz, speed, dt, state, isPlayer) {
  const moving = Math.hypot(dx, dz) > 0.01;
  const mix =
    1 -
    Math.exp(
      -(moving ? C.acceleration : body.y > 0 ? C.airDrag : C.groundDrag) * dt,
    );
  body.vx += (dx * speed - body.vx) * mix;
  body.vz += (dz * speed - body.vz) * mix;
  if (moving && body.y === 0) {
    body.vy = C.jumpVelocity;
    if (isPlayer) state.events.push({ kind: 'hop' });
  }
  body.x += body.vx * dt;
  body.z += body.vz * dt;
  if (Math.hypot(body.vx, body.vz) > 0.05)
    body.heading = Math.atan2(body.vx, body.vz);
  if (body.y > 0 || body.vy > 0) {
    body.vy -= C.gravity * dt;
    body.y = Math.max(0, body.y + body.vy * dt);
    if (body.y === 0) {
      body.vy = 0;
      if (isPlayer) state.events.push({ kind: 'land', x: body.x, z: body.z });
    }
  }
  const radius = Math.hypot(body.x, body.z);
  if (radius > C.mapRadius) {
    body.x *= C.mapRadius / radius;
    body.z *= C.mapRadius / radius;
    body.vx *= 0.5;
    body.vz *= 0.5;
  }
}
function physics(state, dt, input) {
  const p = state.player;
  let dx = input.x || 0,
    dz = input.z || 0;
  const keyboard = Math.hypot(dx, dz);
  if (keyboard) {
    state.target = null;
    dx /= Math.max(1, keyboard);
    dz /= Math.max(1, keyboard);
  } else if (state.target) {
    const d = distance(p, state.target);
    if (d > C.targetRadius) {
      dx = (state.target.x - p.x) / d;
      dz = (state.target.z - p.z) / d;
      const approach = Math.min(1, d / 1.5);
      dx *= approach;
      dz *= approach;
    } else state.target = null;
  }
  const party = state.crew.filter((c) => c.status === 'following');
  hop(
    p,
    dx,
    dz,
    C.speed / (1 + party.length * C.followerSlowdown),
    dt,
    state,
    true,
  );
  const atHatch = distance(p, { x: 0, z: 0 }) <= C.hatchRadius;
  // Top of a pallet stack comes off first.
  const reachable = state.items
    .filter((item) => item.status === 'outside')
    .sort((a, b) => b.lift - a.lift);
  for (const item of reachable) {
    if (
      item.pickupAt <= state.elapsed &&
      distance(p, item) <= C.pickupRadius &&
      usedSlots(state) + item.slots <= C.carrySlots
    ) {
      item.status = 'carried';
      state.carried.push(item.id);
      state.events.push({
        kind: 'pickup',
        type: item.type,
        text: `${item.name} picked up. ${usedSlots(state)} of 4 slots.`,
      });
    }
  }
  let leader = p;
  for (const crew of state.crew) {
    if (crew.status === 'outside' && distance(p, crew) <= C.pickupRadius) {
      crew.status = 'following';
      state.events.push({
        kind: 'tag',
        crewId: crew.id,
        text: `${crew.name} is following you.`,
      });
    }
    if (crew.status === 'following') {
      const target = atHatch ? { x: 0, z: 0 } : leader;
      const d = distance(crew, target);
      const gap = atHatch ? 0.3 : C.followerSpacing;
      hop(
        crew,
        d > gap ? (target.x - crew.x) / d : 0,
        d > gap ? (target.z - crew.z) / d : 0,
        C.speed * crew.hopMultiplier,
        dt,
        state,
        false,
      );
      leader = crew;
      if (
        distance(crew, { x: 0, z: 0 }) <= C.hatchRadius &&
        crew.y <= C.groundReach
      ) {
        crew.status = 'saved';
        state.savedCrew.push(crew.id);
        state.events.push({
          kind: 'saveCrew',
          crewId: crew.id,
          text: `${crew.name} is safely inside!`,
        });
      }
    }
  }
  if (atHatch && p.y <= C.groundReach && state.carried.length) {
    const items = state.carried.map((id) =>
      state.items.find((i) => i.id === id),
    );
    for (const item of items) item.status = 'saved';
    state.savedItems.push(...state.carried);
    state.carried = [];
    state.events.push({
      kind: 'deposit',
      types: items.map((i) => i.type),
      text: `${items.length} supplies stashed in the shelter.`,
    });
  }
}
export function updateScramble(state, seconds, input = {}) {
  if (state.phase !== 'playing' || !Number.isFinite(seconds) || seconds < 0)
    return;
  const elapsed = Math.min(seconds, state.remaining);
  state.elapsed += elapsed;
  state.remaining = Math.max(0, state.remaining - elapsed);
  // Timer uses actual elapsed time; bounded fixed steps avoid a catch-up spiral.
  state.accumulator += Math.min(elapsed, C.catchupSeconds);
  while (state.accumulator >= C.fixedStep) {
    physics(state, C.fixedStep, input);
    state.accumulator -= C.fixedStep;
  }
  if (state.remaining === 0) finishScramble(state);
}
