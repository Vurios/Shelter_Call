import { createRun, getShiftView, buildReveal } from '../core/api.js';
import { ITEM_TYPES, TASKS } from '../core/config.js';
import { ENDINGS } from '../core/endings.js';
import { EVENT_DECK } from '../core/events.js';
import { allRealIds, windows } from '../core/data.js';

export const SAVE_KEY = 'shelter-call.mission.v1';
export const SETTINGS_KEY = 'shelter-call.settings.v1';
export const PROGRESS_KEY = 'shelter-call.progress.v1';
export const DEFAULT_SETTINGS = {
  language: 'en',
  textSize: 'normal',
  motion: 'system',
  sound: false,
  volume: 0.55,
  flat: false,
  tutorial: true,
};
const emptyProgress = () => ({
  cards: [],
  endings: [],
  achievements: [],
  historic: [],
  dailyWins: [],
});
function finiteTree(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  if (value && typeof value === 'object')
    return Object.values(value).every(finiteTree);
  return true;
}
function matchesTemplate(value, template) {
  if (template == null) return true;
  if (Array.isArray(template)) return Array.isArray(value);
  if (typeof template === 'object')
    return (
      value != null &&
      typeof value === 'object' &&
      Object.entries(template).every(([key, child]) =>
        matchesTemplate(value[key], child),
      )
    );
  return typeof value === typeof template;
}
export function validMission(value) {
  try {
    if (
      value?.version !== 1 ||
      !['scramble', 'shelter', 'ending', 'reveal', 'unlocks'].includes(
        value.screen,
      )
    )
      return false;
    const run = value.run;
    if (!run || !finiteTree(run) || !Array.isArray(run.crew)) return false;
    const template = createRun({
      seed: run.seed,
      difficulty: run.difficulty,
      mode: run.mode,
      windowId: run.windowId,
      crewIds: run.crew.map((c) => c.id),
    });
    // Explicit window IDs skip the window-selection RNG draw. Check the four
    // legal resupply boundaries, rather than re-drawing a different boundary.
    const firstResupply =
      Math.floor(template.now / 86400000) * 86400000 +
      (template.rules.days * 2 - 3) * 43200000;
    if (
      Object.keys(template).some((key) => !(key in run)) ||
      !matchesTemplate(run, template)
    )
      return false;
    if (
      JSON.stringify(run.config) !== JSON.stringify(template.config) ||
      JSON.stringify(run.rules) !== JSON.stringify(template.rules)
    )
      return false;
    if (
      !['scramble', 'shelter', 'ending'].includes(run.phase) ||
      !Number.isInteger(run.shiftIndex) ||
      run.shiftIndex < 0 ||
      run.shiftIndex > 40 ||
      run.now < template.now ||
      run.now > run.resupply ||
      ![0, 1, 2, 3].some(
        (offset) => run.resupply === firstResupply + offset * 43200000,
      )
    )
      return false;
    if (
      run.crew.some(
        (c) =>
          !TASKS.includes(c.assignment) ||
          !['waiting', 'healthy', 'rad-sick', 'medevac'].includes(c.status) ||
          ['dose', 'hunger', 'thirst', 'fedFood', 'fedWater', 'work'].some(
            (key) => !Number.isFinite(c[key]) || c[key] < 0,
          ),
      )
    )
      return false;
    for (const list of [run.items, run.wall, run.pantry]) {
      if (
        !Array.isArray(list) ||
        list.some(
          (item) =>
            !Object.hasOwn(ITEM_TYPES, item.type) ||
            typeof item.id !== 'string' ||
            item.mass !== ITEM_TYPES[item.type].mass ||
            item.slots !== ITEM_TYPES[item.type].slots,
        )
      )
        return false;
    }
    if (
      run.wall.length > 8 ||
      new Set(run.wall.concat(run.pantry).map((item) => item.id)).size !==
        run.wall.length + run.pantry.length
    )
      return false;
    if (
      !Array.isArray(run.calls) ||
      !Array.isArray(run.log) ||
      !Array.isArray(run.hazards) ||
      !Array.isArray(run.forecastResults) ||
      !Array.isArray(run.achievements)
    )
      return false;
    if (
      run.shift &&
      (!Number.isFinite(run.shift.end) ||
        !Number.isFinite(run.shift.start) ||
        run.now > run.shift.end ||
        run.shift.start > run.now)
    )
      return false;
    if (
      run.pendingEvent &&
      !EVENT_DECK.some(
        (event) =>
          event.id === run.pendingEvent.id &&
          event.text === run.pendingEvent.text &&
          JSON.stringify(event.choices) ===
            JSON.stringify(run.pendingEvent.choices),
      )
    )
      return false;
    if (
      run.interrupt &&
      (run.interrupt.source !== 'REAL' ||
        typeof run.interrupt.donkiId !== 'string' ||
        !Number.isFinite(Date.parse(run.interrupt.utc)))
    )
      return false;
    if (
      value.screen === 'scramble'
        ? run.phase !== 'scramble'
        : run.phase === 'scramble'
    )
      return false;
    if (
      ['ending', 'reveal', 'unlocks'].includes(value.screen) !==
      (run.phase === 'ending')
    )
      return false;
    const actions = [
      'assignCrew',
      'moveItem',
      'consume',
      'useItem',
      'chooseEvent',
      'recallAll',
      'keepWorking',
      'endShift',
    ];
    if (
      run.calls.some(
        (call) =>
          !call ||
          !actions.includes(call.type) ||
          !Number.isFinite(Date.parse(call.utc)),
      ) ||
      run.hazards.some(
        (hazard) =>
          !hazard ||
          !Number.isFinite(hazard.time) ||
          ![1, 2, 3].includes(hazard.tier) ||
          !Number.isFinite(hazard.duration),
      ) ||
      run.forecastResults.some((id) => typeof id !== 'string')
    )
      return false;
    if (
      run.crew.some(
        (crew) =>
          typeof crew.name !== 'string' ||
          typeof crew.trait !== 'string' ||
          (crew.workByTask != null &&
            (typeof crew.workByTask !== 'object' ||
              Object.values(crew.workByTask).some(
                (work) => !Number.isFinite(work),
              ))),
      )
    )
      return false;
    if (run.phase !== 'scramble') getShiftView(run);
    if (run.phase === 'ending' && !ENDINGS.includes(buildReveal(run).ending))
      return false;
    return true;
  } catch {
    return false;
  }
}
/** All persistence is optional. Never allow unavailable storage to stop play. */
export function createStorage(provider = () => globalThis.localStorage) {
  const memory = new Map();
  let blocked = false;
  function read(key) {
    if (memory.has(key)) return structuredClone(memory.get(key));
    try {
      const raw = provider().getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      blocked = true;
      return null;
    }
  }
  function write(key, value) {
    memory.set(key, structuredClone(value));
    try {
      if (value == null) provider().removeItem(key);
      else provider().setItem(key, JSON.stringify(value));
    } catch {
      blocked = true;
    }
  }
  return {
    mission: () => {
      const value = read(SAVE_KEY);
      return validMission(value) ? value : null;
    },
    saveMission: (run, screen, journal = {}) =>
      write(SAVE_KEY, { version: 1, run, screen, journal }),
    clearMission: () => write(SAVE_KEY, null),
    settings: () => {
      const value = read(SETTINGS_KEY) ?? {};
      return {
        language: value.language === 'fil' ? 'fil' : 'en',
        textSize: ['normal', 'large', 'largest'].includes(value.textSize)
          ? value.textSize
          : 'normal',
        motion: ['system', 'reduced'].includes(value.motion)
          ? value.motion
          : 'system',
        sound: value.sound === true,
        volume: Number.isFinite(value.volume)
          ? Math.max(0, Math.min(1, value.volume))
          : 0.55,
        flat: value.flat === true,
        tutorial: value.tutorial !== false,
      };
    },
    saveSettings: (value) => write(SETTINGS_KEY, value),
    progress: () => {
      const value = read(PROGRESS_KEY);
      const result = emptyProgress();
      for (const key of Object.keys(result))
        result[key] = Array.isArray(value?.[key])
          ? [
              ...new Set(
                value[key].filter((entry) => typeof entry === 'string'),
              ),
            ]
          : [];
      result.endings = result.endings.filter((entry) =>
        ENDINGS.includes(entry),
      );
      result.cards = result.cards.filter((entry) => allRealIds.includes(entry));
      result.historic = result.historic.filter((entry) =>
        windows.includes(entry),
      );
      result.dailyWins = result.dailyWins.filter(
        (entry) =>
          /^\d{4}-\d{2}-\d{2}$/.test(entry) &&
          Number.isFinite(Date.parse(entry)),
      );
      result.achievements = result.achievements.filter((entry) =>
        [
          'Outguessed the Model',
          'Trusted the Forecast',
          'Blind Luck',
          'Full House',
          'Kamote Kingdom',
          'Iron Wall',
          'Sun Streak',
          'Historian',
          'Almanac 25%',
          'Almanac 50%',
          'Almanac 100%',
          'Flight Director win',
        ].includes(entry),
      );
      return result;
    },
    saveProgress: (value) => write(PROGRESS_KEY, value),
    isBlocked: () => blocked,
  };
}
