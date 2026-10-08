import { createRng } from '../../core/rng.js';
import { SCRAMBLE_CONFIG as C } from '../../core/config.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const STATIONS = ['greenhouse', 'solar', 'drill', 'lander', 'rover-bay', 'lab'];
const actor = (x, z) => ({ x, z, y: 0, vx: 0, vz: 0, vy: 0, heading: 0 });
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
  const spawn = (row) => {
    let x = row.x + (random() - 0.5) * 0.7;
    let z = row.z + (random() - 0.5) * 0.7;
    if (Math.hypot(x, z) < 2.8) {
      const angle = random() * Math.PI * 2;
      x = Math.cos(angle) * 3.4;
      z = Math.sin(angle) * 3.4;
    }
    for (const station of stations) {
      const d = Math.hypot(x - station.x, z - station.z);
      if (d < 2) {
        const angle = Math.atan2(z - station.z, x - station.x);
        x = station.x + Math.cos(angle) * 2.2;
        z = station.z + Math.sin(angle) * 2.2;
      }
    }
    return {
      ...structuredClone(row),
      ...actor(x, z),
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
  for (const item of state.items) {
    if (
      item.status === 'outside' &&
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
