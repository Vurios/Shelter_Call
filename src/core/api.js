import { MOCK_RUN } from './mock-run.js';
import { createRng } from './rng.js';

/**
 * Prompt 1 mock adapter for DESIGN §12.1. Every result is GAME fixture data.
 * No real radiation, production, crew traits, balance, or NASA joins run here.
 * Mutators update the supplied state and return it; views are detached copies.
 * @typedef {'Cadet'|'Commander'|'Flight Director'} Difficulty
 * @typedef {'normal'|'daily'|'live'|'historic'|'judge'} Mode
 * @typedef {{seed: string|number, difficulty?: Difficulty, windowId?: string, crewIds?: string[], mode?: Mode}} RunOptions
 * @typedef {{id:string, name:string, trait:string, dose:number, hunger:number, thirst:number, status:string, assignment:string}} Crew
 * @typedef {{id:string, type:string, name:string, slots:number, mass:number}} Item
 * @typedef {{itemsSaved:string[], crewSaved:string[], crewExposed:string[], timeLeft:number}} ScrambleResult
 * @typedef {{type:'assignCrew', crewId:string, task:string}|{type:'moveItem', itemId:string, to:'wall'|'pantry'}|{type:'consume'|'useItem', itemId:string}|{type:'recallAll'|'keepWorking'|'endShift'}} Action
 * @typedef {{source:'REAL', donkiId:string, utc:string, text:string}|{source:'GAME', utc?:string, text:string}} EventLog
 * @typedef {{seed:string|number, difficulty:Difficulty, mode:Mode, windowId:string, phase:string, shiftIndex:number, crew:Crew[], items:Item[], wall:Item[], pantry:Item[], power:number, science:number, calls:Object[], log:EventLog[], scrambleResult:ScrambleResult|null}} RunState
 */

const copy = (value) => structuredClone(value);
const utcAt = (state) =>
  new Date(
    Date.parse(MOCK_RUN.start) + state.shiftIndex * 12 * 3600000,
  ).toISOString();
const hasRadio = (state) =>
  [...state.wall, ...state.pantry].some((item) => item.type === 'radio');

/** @param {RunOptions} options @returns {RunState} */
export function createRun({
  seed,
  difficulty = 'Commander',
  windowId = MOCK_RUN.id,
  crewIds = MOCK_RUN.crew.map((crew) => crew.id),
  mode = 'normal',
}) {
  if (seed === undefined) throw new Error('A seed is required.');
  if (windowId !== MOCK_RUN.id)
    throw new Error('Only the mock window exists in prompt 1.');
  if (!['Cadet', 'Commander', 'Flight Director'].includes(difficulty))
    throw new Error('Unknown difficulty.');
  if (!['normal', 'daily', 'live', 'historic', 'judge'].includes(mode))
    throw new Error('Unknown mode.');
  if (
    crewIds.length !== 4 ||
    new Set(crewIds).size !== 4 ||
    crewIds.some((id) => !MOCK_RUN.crew.some((crew) => crew.id === id))
  )
    throw new Error('Choose the four mock crew members.');
  return {
    seed,
    difficulty,
    mode,
    windowId,
    phase: 'scramble',
    shiftIndex: 0,
    crew: crewIds.map((id) => ({
      ...copy(MOCK_RUN.crew.find((crew) => crew.id === id)),
      dose: 0,
      hunger: 0,
      thirst: 0,
      status: 'waiting',
      assignment: 'shelter',
    })),
    items: copy(MOCK_RUN.items),
    wall: [],
    pantry: [],
    power: 8,
    science: 0,
    calls: [],
    log: [],
    scrambleResult: null,
  };
}

/** @param {RunState} state @returns {{source:'GAME',seconds:number,realMinutes:number,clampNote:string|null,layoutSeed:string|number,itemSpawns:Object[],crewSpawns:Object[]}} */
export function getScrambleSetup(state) {
  const random = createRng(state.seed);
  const position = () => ({
    x: Math.round((random() - 0.5) * 20),
    z: Math.round((random() - 0.5) * 20),
  });
  return {
    source: 'GAME',
    seconds: MOCK_RUN.countdownMin * (state.difficulty === 'Cadet' ? 1.5 : 1),
    // Contract field name retained; these minutes are synthetic until prompt 3.
    realMinutes: MOCK_RUN.countdownMin,
    clampNote: null,
    layoutSeed: state.seed,
    itemSpawns: state.items.map((item) => ({ ...copy(item), ...position() })),
    crewSpawns: state.crew.map((crew) => ({ ...copy(crew), ...position() })),
  };
}

/** @param {RunState} state @param {ScrambleResult} result @returns {RunState} */
export function applyScrambleResult(state, result) {
  if (state.phase !== 'scramble')
    throw new Error('Scramble already completed.');
  const knownCrew = new Set(state.crew.map((crew) => crew.id));
  const knownItems = new Set(state.items.map((item) => item.id));
  if (
    result.itemsSaved.some((id) => !knownItems.has(id)) ||
    [...result.crewSaved, ...result.crewExposed].some(
      (id) => !knownCrew.has(id),
    )
  )
    throw new Error('Unknown scramble pickup.');
  if (result.crewSaved.some((id) => result.crewExposed.includes(id)))
    throw new Error('Crew cannot be both saved and exposed.');
  state.scrambleResult = copy(result);
  state.pantry = copy(
    state.items.filter((item) => result.itemsSaved.includes(item.id)),
  );
  state.crew.forEach((crew) => {
    crew.status = result.crewSaved.includes(crew.id) ? 'sheltered' : 'exposed';
  });
  state.phase = 'shelter';
  return state;
}

/** @param {RunState} state @returns {Object} UI snapshot; synthetic messages never receive a REAL stamp. */
export function getShiftView(state) {
  const inventory = [...state.wall, ...state.pantry];
  const radio = hasRadio(state);
  const now = utcAt(state);
  return copy({
    source: 'GAME',
    day: Math.floor(state.shiftIndex / 2) + 1,
    shift: state.shiftIndex % 2 ? 'PM' : 'AM',
    radio,
    blind: !radio,
    radioMessages: radio
      ? MOCK_RUN.flares
          .filter((flare) => Date.parse(flare.begin) <= Date.parse(now))
          .map((flare) => ({
            source: 'GAME',
            text: `Test flare ${flare.class}`,
            utc: flare.begin,
          }))
      : [],
    forecastCards: radio
      ? MOCK_RUN.cmeForecasts
          .filter((forecast) => Date.parse(forecast.issued) <= Date.parse(now))
          .map((forecast) => ({
            ...forecast,
            bandHours:
              state.difficulty === 'Flight Director'
                ? null
                : forecast.bandHours,
          }))
      : [],
    crew: state.crew,
    wall: state.wall,
    pantry: state.pantry,
    // GAME approximation from DESIGN §10.1, not a physical dose model.
    shield: Math.min(
      0.9,
      1 - Math.exp(-state.wall.reduce((mass, item) => mass + item.mass, 0) / 8),
    ),
    power: state.power,
    food: inventory.filter((item) => item.type === 'food').length,
    water: inventory.filter((item) => item.type === 'water').length,
    science: state.science,
    daysUntilResupply: Math.max(
      0,
      MOCK_RUN.days - Math.floor(state.shiftIndex / 2),
    ),
  });
}

/** @param {RunState} state @param {Action} action @returns {RunState} */
export function act(state, action) {
  if (state.phase !== 'shelter')
    throw new Error('Actions require the shelter phase.');
  switch (action.type) {
    case 'assignCrew': {
      const crew = state.crew.find((member) => member.id === action.crewId);
      if (!crew) throw new Error('Unknown crew member.');
      crew.assignment = action.task;
      break;
    }
    case 'moveItem': {
      if (!['wall', 'pantry'].includes(action.to))
        throw new Error('Move to wall or pantry.');
      const from = action.to === 'wall' ? 'pantry' : 'wall';
      const index = state[from].findIndex((item) => item.id === action.itemId);
      if (index < 0) throw new Error('Item is not in the source inventory.');
      if (action.to === 'wall' && state.wall.length >= 8)
        throw new Error('Wall is full.');
      state[action.to].push(...state[from].splice(index, 1));
      break;
    }
    case 'consume':
    case 'useItem': {
      const location = state.wall.some((item) => item.id === action.itemId)
        ? 'wall'
        : 'pantry';
      const index = state[location].findIndex(
        (item) => item.id === action.itemId,
      );
      if (index < 0) throw new Error('Unknown inventory item.');
      if (
        action.type === 'consume' &&
        !['food', 'water'].includes(state[location][index].type)
      )
        throw new Error('Only food and water can be consumed.');
      // Stub removes the item only; upkeep and item effects arrive in prompt 3.
      state[location].splice(index, 1);
      break;
    }
    case 'recallAll':
      state.crew.forEach((crew) => {
        crew.assignment = 'shelter';
      });
      break;
    case 'keepWorking':
      break;
    case 'endShift':
      resolveShift(state);
      return state;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
  state.calls.push({ ...copy(action), utc: utcAt(state) });
  return state;
}

/** @param {RunState} state @returns {EventLog[]} */
export function resolveShift(state) {
  if (state.phase !== 'shelter')
    throw new Error('Shift requires the shelter phase.');
  const utc = utcAt(state);
  const nextUtc = new Date(Date.parse(utc) + 12 * 3600000).toISOString();
  const log = [
    {
      source: 'GAME',
      utc,
      text: 'Practice shift complete. Kamote is rooting for you.',
    },
  ];
  for (const flare of MOCK_RUN.flares) {
    if (
      Date.parse(flare.begin) >= Date.parse(utc) &&
      Date.parse(flare.begin) < Date.parse(nextUtc)
    )
      log.push({
        source: 'GAME',
        utc: flare.begin,
        text: `Test flare ${flare.class}.`,
      });
  }
  state.calls.push({ type: 'endShift', utc });
  state.log.push(...log);
  state.shiftIndex += 1;
  if (state.shiftIndex >= MOCK_RUN.days * 2) state.phase = 'ending';
  return copy(log);
}

/** @param {RunState} state @returns {string|null} Placeholder ending, not survival evaluation. */
export function checkEnding(state) {
  return state.phase === 'ending' ? 'Mission Complete' : null;
}

/** @param {RunState} state @returns {Object} */
export function buildReveal(state) {
  return copy({
    source: 'GAME',
    dates: { start: MOCK_RUN.start, end: MOCK_RUN.end },
    timeline: {
      playerCalls: state.calls,
      nasaForecast: MOCK_RUN.cmeForecasts,
      reality: [
        ...MOCK_RUN.flares,
        ...MOCK_RUN.sepEvents,
        ...MOCK_RUN.cmeForecasts.map((forecast) => ({
          source: 'GAME',
          id: forecast.id,
          time: forecast.actual,
        })),
      ],
    },
    stats: {
      crewHome: state.crew.filter((crew) => crew.status === 'sheltered').length,
      science: state.science,
      totalDose: state.crew.reduce((total, crew) => total + crew.dose, 0),
      shifts: state.shiftIndex,
    },
    ending: checkEnding(state),
    approximations: [
      'All dates, flares, particle events, forecasts and statistics are invented test fixtures.',
      'Shielding uses a GAME mass approximation.',
      'No dose, upkeep, production, forecast scoring or survival rules are implemented yet.',
    ],
  });
}
