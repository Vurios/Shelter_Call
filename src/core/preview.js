import { act } from './api.js';
import { TASKS } from './config.js';
import { HOUR } from './data.js';
import { shield } from './dose.js';
import { has, inventory } from './rules.js';

const outputs = () => ({
  food: 0,
  water: 0,
  power: 0,
  science: 0,
  randomItems: 0,
});
const change = (before, after) => ({ before, after, delta: after - before });
function resources(state) {
  const items = inventory(state);
  return {
    food: items.filter((item) => item.type === 'food').length,
    water: items.filter((item) => item.type === 'water').length,
    power: state.power,
    science: state.science,
    morale: state.morale,
    shield: shield(state),
    wallItems: state.wall.length,
    items: items.length,
  };
}

function taskPreview(state, crew, fraction) {
  const task = crew.assignment;
  const available = crew.status !== 'medevac';
  const earnedWork = crew.workByTask?.[task] ?? 0;
  const workNeeded =
    task === 'greenhouse' ? 2 : ['drill', 'salvage'].includes(task) ? 1 : null;
  const conditions = [];
  const estimate = outputs();
  let amount = available ? fraction : 0;
  if (!available) conditions.push('crewUnavailable');
  if (crew.status === 'rad-sick' || crew.hunger || crew.thirst) {
    amount *= 0.5;
    conditions.push('crewSlowed');
  }
  if (state.morale < state.config.moraleWeak) {
    amount *= state.config.moraleOutput;
    conditions.push('lowMorale');
  }
  if (task === 'greenhouse') {
    if (!has(state, 'seeds')) conditions.push('needsSeeds');
    if (state.broken) conditions.push('needsRepair');
    if (state.power <= 0) conditions.push('needsPower');
    if (!has(state, 'seeds') || state.broken || state.power <= 0) amount = 0;
    if (amount > 0)
      estimate.food =
        Math.floor((earnedWork + amount) / 2) *
        Math.ceil(
          state.config.greenhouse * (crew.trait === 'Botanist' ? 2 : 1),
        );
  }
  if (task === 'solar')
    estimate.power =
      state.config.solar * amount * (crew.trait === 'Engineer' ? 2 : 1);
  if (task === 'science')
    estimate.science =
      state.config.science * amount * (crew.trait === 'Geologist' ? 2 : 1);
  if (task === 'drill' && amount > 0)
    estimate.water =
      Math.floor(earnedWork + amount) * Math.ceil(state.config.drill);
  if (task === 'salvage') {
    if (amount > 0) estimate.randomItems = Math.floor(earnedWork + amount);
    conditions.push('randomFind');
  }
  return {
    id: crew.id,
    task,
    available,
    outside: available && task !== 'shelter',
    earnedWork,
    workNeeded,
    earnedByTask: Object.fromEntries(
      TASKS.map((key) => [key, crew.workByTask?.[key] ?? 0]),
    ),
    estimate,
    conditions,
  };
}

/**
 * GAME planning estimates only. Uses elapsed time and visible current conditions;
 * never advances time, reads the event timeline, integrates dose or draws RNG.
 * Estimates exclude upkeep and future changes to health, power, traits or tasks.
 */
export function getPlanPreview(state) {
  const end =
    state.shift?.end ?? (Math.floor(state.now / (12 * HOUR)) + 1) * 12 * HOUR;
  const hoursRemaining =
    state.phase === 'shelter' ? Math.max(0, (end - state.now) / HOUR) : 0;
  const crew = state.crew.map((person) =>
    taskPreview(state, person, hoursRemaining / 12),
  );
  const estimate = outputs();
  for (const person of crew)
    for (const key of Object.keys(estimate))
      estimate[key] += person.estimate[key];
  // BOLT works once at upkeep. Its radiation slowdown is deliberately a range,
  // never selected from hidden hazards, even when a dosimeter has been rescued.
  let bolt = null;
  if (has(state, 'bolt')) {
    const robot = {
      id: 'bolt',
      trait: 'Robot',
      status: 'healthy',
      workByTask: state.boltCrew?.workByTask,
      assignment: state.boltTask,
    };
    const duration =
      state.phase === 'shelter'
        ? (end - (state.shift?.start ?? state.now)) / (12 * HOUR)
        : 0;
    bolt = {
      task: state.boltTask,
      powerCost: state.boltTask === 'shelter' ? 0 : state.config.boltPower,
      slower: taskPreview(state, robot, duration * state.config.boltOutput),
      normal: taskPreview(state, robot, duration),
      conditions: ['powerAtShiftEnd', 'stormMaySlowRobot'],
    };
  }
  return {
    source: 'GAME',
    hoursRemaining,
    current: resources(state),
    crew,
    bolt,
    estimate,
    conditions: [
      'currentConditionsOnly',
      'beforeUpkeep',
      'interruptsMayChangeWork',
    ],
  };
}

function immediate(state, action) {
  const next = structuredClone(state);
  try {
    // Only the fixed move/consume/use action allowlist below reaches act here.
    // These immediate actions never call resolveShift or draw random numbers.
    act(next, action);
  } catch (error) {
    return {
      action,
      available: false,
      reason: error.message,
      changes: null,
      crew: null,
    };
  }
  const before = resources(state);
  const after = resources(next);
  const changes = Object.fromEntries(
    Object.keys(before).map((key) => [key, change(before[key], after[key])]),
  );
  let crew = null;
  const person = state.crew.find((entry) => entry.id === action.crewId);
  if (person) {
    const updated = next.crew.find((entry) => entry.id === person.id);
    crew = {
      id: person.id,
      fedFood: change(person.fedFood, updated.fedFood),
      fedWater: change(person.fedWater, updated.fedWater),
      dose: has(state, 'dosimeter') ? change(person.dose, updated.dose) : null,
    };
  }
  return {
    action,
    available: true,
    reason: null,
    changes,
    crew,
    repaired: state.broken && !next.broken,
  };
}

/** Only the already-present event is previewed. chooseEvent draws no RNG. */
export function getEventPreviews(state) {
  if (!state.pendingEvent) return [];
  return state.pendingEvent.choices.map((label, choice) => ({
    label,
    ...immediate(state, {
      type: 'chooseEvent',
      eventId: state.pendingEvent.id,
      choice,
    }),
  }));
}

/** Detached, exact immediate GAME consequences. Exact dose stays equipment-gated. */
export function getItemPreview(state, itemId, recipient) {
  const item = inventory(state).find((entry) => entry.id === itemId);
  if (!item) return null;
  const location = state.wall.some((entry) => entry.id === itemId)
    ? 'wall'
    : 'pantry';
  const move = immediate(state, {
    type: 'moveItem',
    itemId,
    to: location === 'wall' ? 'pantry' : 'wall',
  });
  let use = null;
  const type = ['food', 'water'].includes(item.type)
    ? 'consume'
    : ['repair', 'med', 'battery', 'guitar', 'game'].includes(item.type)
      ? 'useItem'
      : null;
  if (type) {
    // Never reveal the hidden highest-dose patient chosen by automatic med use.
    const crewId =
      recipient ??
      (type === 'consume'
        ? state.crew.find((person) => person.status !== 'medevac')?.id
        : undefined);
    use = immediate(state, {
      type,
      itemId,
      ...(crewId === undefined ? {} : { crewId }),
    });
  }
  return { source: 'GAME', itemId, location, move, use };
}
