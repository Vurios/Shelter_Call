import { CONFIG, DIFFICULTIES, CREW, ITEM_TYPES } from './config.js';
import { draw, seedValue } from './rng.js';
import { windows, windowData, timeline, HOUR } from './data.js';
export function addItem(state, type, count = 1) {
  for (let n = 0; n < count; n++)
    state.pantry.push({
      id: `${type}-${++state.serial}`,
      type,
      ...ITEM_TYPES[type],
    });
}
export function create(options) {
  const {
    seed,
    difficulty = 'Commander',
    mode = 'normal',
    crewIds = ['ria', 'dom', 'aiko', 'tunde'],
  } = options;
  if (
    typeof seed !== 'string' &&
    (typeof seed !== 'number' || !Number.isFinite(seed))
  )
    throw new Error('A string or finite number seed is required.');
  if (!Object.hasOwn(DIFFICULTIES, difficulty))
    throw new Error('Unknown difficulty.');
  if (!['normal', 'daily', 'live', 'historic', 'judge'].includes(mode))
    throw new Error('Unknown mode.');
  if (
    !Array.isArray(crewIds) ||
    crewIds.length !== 4 ||
    new Set(crewIds).size !== 4 ||
    crewIds.some((id) => !CREW.some((c) => c.id === id))
  )
    throw new Error('Choose four distinct known crew.');
  const state = {
    seed,
    difficulty,
    mode,
    rng: seedValue(seed),
    config: {
      ...CONFIG,
      dose: [...CONFIG.dose],
      duration: [...CONFIG.duration],
    },
    rules: { ...DIFFICULTIES[difficulty] },
  };
  state.windowId =
    options.windowId ??
    (mode === 'judge'
      ? '2024-05-11T02:10:00-WINDOW-001'
      : windows[Math.floor(draw(state) * windows.length)]);
  const w = windowData(state.windowId);
  state.now = Date.parse(w.start);
  // Four shift-end boundaries in the last two UTC mission days, including a partial first day.
  state.resupply =
    Math.floor(state.now / (24 * HOUR)) * (24 * HOUR) +
    (state.rules.days * 2 - 3 + Math.floor(draw(state) * 4)) * 12 * HOUR;
  Object.assign(state, {
    phase: 'scramble',
    shiftIndex: 0,
    crew: crewIds.map((id) => ({
      ...CREW.find((c) => c.id === id),
      dose: 0,
      hunger: 0,
      thirst: 0,
      fedFood: 0,
      fedWater: 0,
      status: 'waiting',
      assignment: 'shelter',
      work: 0,
    })),
    items: [],
    wall: [],
    pantry: [],
    serial: 0,
    power: state.config.startPower,
    science: 0,
    achievements: [],
    morale: state.config.moraleStart,
    plant: 0,
    broken: false,
    zeroPower: 0,
    medicAt: -state.config.medicInterval,
    calls: [],
    log: [],
    hazards: [],
    cursor: 0,
    shift: null,
    pendingEvent: null,
    interrupt: null,
    scrambleResult: null,
    flags: {
      eva: false,
      radioEver: false,
      wallEaten: false,
      doseEvac: false,
      powerEvac: false,
      snack: false,
      closeCall: false,
      ironWall: false,
      outguessed: 0,
      trusted: 0,
    },
    forecastResults: [],
    boltTask: 'shelter',
  });
  addItem(state, 'water', state.config.initialWater);
  addItem(state, 'food', state.config.initialFood);
  Object.keys(ITEM_TYPES)
    .filter((t) => !['water', 'food'].includes(t))
    .forEach((type) => addItem(state, type));
  state.items = state.pantry;
  state.pantry = [];
  const events = timeline(state.windowId);
  while (state.cursor < events.length && events[state.cursor].time <= state.now)
    state.cursor++;
  state.hazards = w.sepEvents
    .filter((s) => Date.parse(s.onset) <= state.now)
    .map((s) => ({
      id: s.id,
      time: Date.parse(s.onset),
      tier: s.tier,
      duration: state.config.duration[s.tier],
    }));
  return state;
}
