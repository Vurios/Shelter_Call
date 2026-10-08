import { addItem } from './state.js';
import { draw } from './rng.js';
import { ITEM_TYPES } from './config.js';
import { HOUR } from './data.js';
import { integrate } from './dose.js';
export const inventory = (state) => state.wall.concat(state.pantry);
export const has = (state, type) =>
  inventory(state).some((i) => i.type === type);
export function remove(state, id) {
  const location = state.wall.some((i) => i.id === id) ? 'wall' : 'pantry';
  const index = state[location].findIndex((i) => i.id === id);
  if (index < 0) throw new Error('Unknown inventory item.');
  const [item] = state[location].splice(index, 1);
  if (location === 'wall' && ['water', 'food'].includes(item.type)) {
    state.flags.wallEaten = true;
    state.wallConsumed = (state.wallConsumed ?? 0) + 1;
  }
  return item;
}
export function feed(state, crew, type) {
  const item =
    state.pantry.find((i) => i.type === type) ??
    state.wall.find((i) => i.type === type);
  if (!item) return false;
  remove(state, item.id);
  if (
    type === 'food' &&
    state.crew.some((c) => c.trait === 'Chef' && c.status !== 'medevac')
  )
    crew.fedFood += state.config.chefFood - 1;
  return true;
}
export function produce(state, crew, work) {
  if (work <= 0) return;
  const multiplier =
    crew.status === 'rad-sick' || crew.hunger || crew.thirst ? 0.5 : 1;
  const amount =
    work *
    multiplier *
    (state.morale < state.config.moraleWeak ? state.config.moraleOutput : 1);
  crew.workByTask ??= {};
  crew.work = crew.workByTask[crew.assignment] ?? 0;
  switch (crew.assignment) {
    case 'greenhouse':
      if (has(state, 'seeds') && !state.broken && state.power > 0) {
        crew.work += amount;
        while (crew.work >= 2) {
          crew.work -= 2;
          addItem(
            state,
            'food',
            state.config.greenhouse * (crew.trait === 'Botanist' ? 2 : 1),
          );
          state.plant++;
        }
      }
      break;
    case 'solar':
      state.power +=
        state.config.solar * amount * (crew.trait === 'Engineer' ? 2 : 1);
      if (crew.trait === 'Engineer') state.broken = false;
      break;
    case 'drill':
      crew.work += amount;
      while (crew.work >= 1) {
        crew.work--;
        addItem(state, 'water', state.config.drill);
      }
      break;
    case 'science':
      state.science +=
        state.config.science * amount * (crew.trait === 'Geologist' ? 2 : 1);
      break;
    case 'salvage': {
      crew.work += amount;
      while (crew.work >= 1) {
        crew.work--;
        const types =
          crew.trait === 'Rover Pilot'
            ? ['water', 'food', 'battery', 'repair']
            : Object.keys(ITEM_TYPES).filter((t) => t !== 'bolt');
        addItem(state, types[Math.floor(draw(state) * types.length)]);
      }
      break;
    }
  }
  crew.workByTask[crew.assignment] = crew.work;
}
export function upkeep(state, end) {
  const alive = state.crew.filter((c) => c.status !== 'medevac');
  if (
    alive.some((c) => c.trait === 'Medic') &&
    state.shiftIndex - state.medicAt >= state.config.medicInterval
  ) {
    const patient = alive
      .filter((c) => c.status === 'rad-sick')
      .sort((a, b) => b.dose - a.dose)[0];
    if (patient) {
      patient.dose = Math.max(0, patient.dose - state.config.medicReduction);
      patient.status =
        patient.dose >= state.config.sick * state.rules.tolerance
          ? 'rad-sick'
          : 'healthy';
      state.medicAt = state.shiftIndex;
    }
  }
  if (end % (24 * HOUR) === 0) {
    for (const crew of alive)
      for (const type of ['food', 'water']) {
        const fed = type === 'food' ? 'fedFood' : 'fedWater';
        const miss = type === 'food' ? 'hunger' : 'thirst';
        while (crew[fed] < state.config[type] && feed(state, crew, type))
          crew[fed] += 1;
        if (crew[fed] >= state.config[type]) {
          crew[fed] -= state.config[type];
          crew[miss] = 0;
        } else crew[miss]++;
        if (crew[miss] >= state.rules.grace) crew.status = 'medevac';
      }
    state.power = Math.max(
      0,
      state.power +
        state.config.solarDaily -
        state.config.lifePower -
        (has(state, 'seeds') ? state.config.seedPower : 0) -
        (has(state, 'radio') ? state.config.radioPower : 0),
    );
  }
  if (has(state, 'bolt') && state.boltTask !== 'shelter') {
    if (state.power >= state.config.boltPower) {
      state.power -= state.config.boltPower;
      state.boltCrew ??= { trait: 'Robot', status: 'healthy', work: 0 };
      state.boltCrew.assignment = state.boltTask;
      const start = state.shift?.start ?? end - 12 * HOUR;
      produce(
        state,
        state.boltCrew,
        ((end - start) / (12 * HOUR)) *
          (integrate(state, start, end) > 0 ? state.config.boltOutput : 1),
      );
    }
  }
  state.power = Math.min(state.config.powerMax, state.power);
  state.zeroPower = state.power <= 0 ? state.zeroPower + 1 : 0;
  if (state.zeroPower >= state.config.powerGrace) {
    state.flags.powerEvac = true;
    state.phase = 'ending';
  }
  if (state.crew.some((c) => c.status === 'medevac') || end >= state.resupply)
    state.phase = 'ending';
}
