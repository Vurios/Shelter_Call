import { create } from './state.js';
import { createRng } from './rng.js';
import { TASKS } from './config.js';
import { HOUR, windowData, timeline, stats } from './data.js';
import { shield, expose, integrate } from './dose.js';
import { has, inventory, remove, produce, upkeep } from './rules.js';
import { forecasts, messages } from './forecast.js';
import { nextEvent, choose } from './events.js';
import { ending, achievements } from './endings.js';
/**
 * Deterministic real-data engine for DESIGN API contract.
 * Radiation, resources and traits are labeled GAME approximations.
 * Mutators update the supplied state and return it; views are detached copies.
 * @typedef {'Cadet'|'Commander'|'Flight Director'} Difficulty
 * @typedef {'normal'|'daily'|'live'|'historic'|'judge'} Mode
 * @typedef {{seed: string|number, difficulty?: Difficulty, windowId?: string, crewIds?: string[], mode?: Mode}} RunOptions
 * @typedef {{id:string, name:string, trait:string, dose:number, hunger:number, thirst:number, status:string, assignment:string}} Crew
 * @typedef {{id:string, type:string, name:string, slots:number, mass:number}} Item
 * @typedef {{itemsSaved:string[], crewSaved:string[], crewExposed:string[], timeLeft:number}} ScrambleResult
 * @typedef {{type:'assignCrew', crewId:string, task:string}|{type:'moveItem', itemId:string, to:'wall'|'pantry'}|{type:'consume'|'useItem', itemId:string, crewId?:string}|{type:'recallAll'|'keepWorking'|'endShift'}|{type:'chooseEvent',eventId:string,choice:0|1}} Action
 * @typedef {{id:string,source:'GAME',text:string,choices:string[],kind?:string}} PendingEvent
 * @typedef {{source:'REAL',donkiId:string,kind:string,class:string|null,associationRate:number|null,hour:number,text:string}} Interrupt
 * @typedef {{source:'REAL', donkiId:string, utc:string, text:string}|{source:'GAME', utc?:string, text:string}} EventLog
 * @typedef {{seed:string|number, difficulty:Difficulty, mode:Mode, windowId:string, phase:string, shiftIndex:number, crew:Crew[], items:Item[], wall:Item[], pantry:Item[], power:number, science:number, calls:Object[], log:EventLog[], scrambleResult:ScrambleResult|null, pendingEvent:PendingEvent|null, interrupt:Interrupt|null, rng:number, cursor:number, now:number, achievements:string[]}} RunState
 */

const copy = (value) => structuredClone(value);
const utc = (state) => new Date(state.now).toISOString();
export function createRun(options) {
  return create(options);
}
export function getScrambleSetup(state) {
  const random = createRng(`${state.seed}:layout`);
  const position = () => ({
    x: Math.round((random() - 0.5) * 20),
    z: Math.round((random() - 0.5) * 20),
  });
  const minutes = windowData(state.windowId).sep.countdownMin;
  const seconds =
    Math.max(state.config.timerMin, Math.min(state.config.timerMax, minutes)) *
    state.rules.timer;
  return {
    source: 'REAL',
    seconds,
    realMinutes: minutes,
    clampNote:
      seconds / state.rules.timer === minutes
        ? null
        : `GAME timer clamped to ${seconds} seconds; real countdown ${minutes} minutes.`,
    layoutSeed: state.seed,
    itemSpawns: state.items.map((i) => ({ ...copy(i), ...position() })),
    crewSpawns: state.crew.map((c) => ({
      ...copy(c),
      ...position(),
      hopMultiplier: c.trait === 'Rover Pilot' ? 1.3 : 1,
    })),
  };
}
export function applyScrambleResult(state, result) {
  if (state.phase !== 'scramble')
    throw new Error('Scramble already completed.');
  for (const key of ['itemsSaved', 'crewSaved', 'crewExposed'])
    if (
      !Array.isArray(result[key]) ||
      new Set(result[key]).size !== result[key].length
    )
      throw new Error('Duplicate or invalid scramble pickups.');
  if (
    result.itemsSaved.some((id) => !state.items.some((i) => i.id === id)) ||
    result.crewSaved
      .concat(result.crewExposed)
      .some((id) => !state.crew.some((c) => c.id === id))
  )
    throw new Error('Unknown scramble pickup.');
  if (
    result.crewSaved.some((id) => result.crewExposed.includes(id)) ||
    result.crewSaved.length + result.crewExposed.length !== 4
  )
    throw new Error('Partition all four crew into saved or exposed.');
  if (
    !Number.isFinite(result.timeLeft) ||
    result.timeLeft < 0 ||
    result.timeLeft > getScrambleSetup(state).seconds
  )
    throw new Error('Invalid time left.');
  state.scrambleResult = copy(result);
  state.pantry = copy(
    state.items.filter((i) => result.itemsSaved.includes(i.id)),
  );
  state.phase = 'shelter';
  state.flags.radioEver = has(state, 'radio');
  const tier = windowData(state.windowId).sep.tier;
  state.crew.forEach((c) => {
    c.status = 'healthy';
    if (result.crewExposed.includes(c.id)) {
      c.dose = state.config.dose[tier];
      c.status =
        c.dose >= state.config.sick * state.rules.tolerance
          ? 'rad-sick'
          : 'healthy';
    }
  });
  state.log.push({
    source: 'REAL',
    donkiId: windowData(state.windowId).sep.id,
    utc: utc(state),
    text: 'Particles detected. Relative GAME storm tier ' + tier + '.',
  });
  state.achievements = achievements(state);
  return state;
}
export function getShiftView(state) {
  const dosimeter = has(state, 'dosimeter');
  // At an ending boundary the journal shows the shift just completed.
  const journalTime =
    state.phase === 'ending' && state.now % (12 * HOUR) === 0
      ? state.now - 1
      : state.now;
  return copy({
    source: 'GAME',
    phase: state.phase,
    day:
      Math.floor(journalTime / (24 * HOUR)) -
      Math.floor(Date.parse(windowData(state.windowId).start) / (24 * HOUR)) +
      1,
    shift: Math.floor(journalTime / (12 * HOUR)) % 2 ? 'PM' : 'AM',
    shiftIndex: state.shiftIndex,
    radio: has(state, 'radio'),
    blind: !has(state, 'radio'),
    dosimeter,
    particleLevel: dosimeter
      ? Math.round(integrate(state, state.now, state.now + HOUR) * 12 * 100) /
        100
      : null,
    allClear: dosimeter
      ? integrate(state, state.now, state.now + HOUR) * 12 <
        state.config.allClearLevel
      : null,
    radioMessages: messages(state),
    forecastCards: forecasts(state),
    crew: state.crew.map((c) => ({
      id: c.id,
      name: c.name,
      trait: c.trait,
      status: c.status,
      assignment: c.assignment,
      dose: dosimeter ? Math.round(c.dose * 100) / 100 : null,
      hunger: c.hunger,
      thirst: c.thirst,
      symptoms:
        c.status === 'rad-sick'
          ? 'Needs a rest'
          : c.hunger || c.thirst
            ? 'Feeling weak'
            : 'Feeling well',
    })),
    wall: state.wall,
    pantry: state.pantry,
    shield: shield(state),
    power: state.power,
    food: inventory(state).filter((i) => i.type === 'food').length,
    water: inventory(state).filter((i) => i.type === 'water').length,
    science: state.science,
    morale: state.morale,
    plant: state.plant,
    broken: state.broken,
    achievements: state.achievements,
    daysUntilResupply: Math.max(
      0,
      Math.ceil((state.resupply - state.now) / (24 * HOUR)),
    ),
    pendingEvent: state.pendingEvent,
    interrupt: state.interrupt,
    boltTask: has(state, 'bolt') ? state.boltTask : null,
  });
}
/** @param {RunState} state @param {Action} action */
export function act(state, action) {
  if (state.phase !== 'shelter')
    throw new Error('Actions require the shelter phase.');
  if (state.pendingEvent && action.type !== 'chooseEvent')
    throw new Error('Choose the pending event first.');
  if (state.interrupt && !['recallAll', 'keepWorking'].includes(action.type))
    throw new Error('Answer the interrupt first.');
  if (state.shift && !state.interrupt && action.type !== 'endShift')
    throw new Error('Continue resolving the current shift.');
  switch (action.type) {
    case 'assignCrew': {
      if (!TASKS.includes(action.task)) throw new Error('Unknown task.');
      if (action.crewId === 'bolt') {
        if (!has(state, 'bolt')) throw new Error('BOLT was not saved.');
        state.boltTask = action.task;
        break;
      }
      const crew = state.crew.find((c) => c.id === action.crewId);
      if (!crew || crew.status === 'medevac')
        throw new Error('Crew unavailable.');
      crew.assignment = action.task;
      if (action.task !== 'shelter') state.flags.eva = true;
      break;
    }
    case 'moveItem': {
      if (!['wall', 'pantry'].includes(action.to))
        throw new Error('Move to wall or pantry.');
      const from = action.to === 'wall' ? 'pantry' : 'wall';
      const index = state[from].findIndex((i) => i.id === action.itemId);
      if (index < 0) throw new Error('Item is not in the source inventory.');
      if (action.to === 'wall' && state.wall.length >= state.config.wallSlots)
        throw new Error('Wall is full.');
      state[action.to].push(...state[from].splice(index, 1));
      break;
    }
    case 'consume': {
      const item = inventory(state).find((i) => i.id === action.itemId);
      if (!item || !['water', 'food'].includes(item.type))
        throw new Error('Only food and water can be consumed.');
      if (
        action.crewId !== undefined &&
        !state.crew.some(
          (c) => c.id === action.crewId && c.status !== 'medevac',
        )
      )
        throw new Error('Crew unavailable.');
      const crew =
        state.crew.find((c) => c.id === action.crewId) ??
        state.crew.find((c) => c.status !== 'medevac');
      if (!crew || crew.status === 'medevac')
        throw new Error('Crew unavailable.');
      const type = remove(state, item.id).type;
      crew[type === 'food' ? 'fedFood' : 'fedWater'] +=
        type === 'food' &&
        state.crew.some((c) => c.trait === 'Chef' && c.status !== 'medevac')
          ? state.config.chefFood
          : 1;
      break;
    }
    case 'useItem': {
      const item = inventory(state).find((i) => i.id === action.itemId);
      if (
        !item ||
        !['repair', 'med', 'battery', 'guitar', 'game'].includes(item.type)
      )
        throw new Error('Item cannot be used this way.');
      if (
        action.crewId !== undefined &&
        !state.crew.some(
          (c) => c.id === action.crewId && c.status !== 'medevac',
        )
      )
        throw new Error('Crew unavailable.');
      const crew =
        state.crew.find((c) => c.id === action.crewId) ??
        state.crew
          .filter((c) => c.status !== 'medevac')
          .sort((a, b) => b.dose - a.dose)[0];
      if (item.type === 'med' && (!crew || crew.status === 'medevac'))
        throw new Error('Crew unavailable.');
      remove(state, item.id);
      if (item.type === 'repair') state.broken = false;
      if (item.type === 'battery') state.power += state.config.batteryPower;
      if (item.type === 'med') {
        crew.dose = Math.max(0, crew.dose - state.config.medReduction);
        crew.status =
          crew.dose >= state.config.sick * state.rules.tolerance
            ? 'rad-sick'
            : 'healthy';
      }
      if (['guitar', 'game'].includes(item.type))
        state.morale = Math.min(state.config.moraleMax, state.morale + 3);
      break;
    }
    case 'chooseEvent':
      if (
        !state.pendingEvent ||
        action.eventId !== state.pendingEvent.id ||
        ![0, 1].includes(action.choice)
      )
        throw new Error('Invalid event choice.');
      choose(state, action.choice);
      state.log.push({
        source: 'GAME',
        utc: utc(state),
        text:
          state.pendingEvent.text +
          ' ' +
          state.pendingEvent.choices[action.choice],
      });
      state.pendingEvent = null;
      break;
    case 'recallAll':
      state.crew.forEach((c) => {
        c.assignment = 'shelter';
      });
      state.interrupt = null;
      break;
    case 'keepWorking':
      state.interrupt = null;
      break;
    case 'endShift':
      resolveShift(state);
      return state;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
  state.calls.push({ ...copy(action), utc: utc(state) });
  return state;
}
function segment(state, to) {
  const from = state.now;
  // Production accrues before dose thresholds crossed in this segment; no end-of-shift hindsight.
  state.crew
    .filter((c) => c.status !== 'medevac')
    .forEach((c) => produce(state, c, (to - from) / (12 * HOUR)));
  expose(state, from, to);
  state.now = to;
}
export function resolveShift(state) {
  if (state.phase !== 'shelter')
    throw new Error('Shift requires the shelter phase.');
  if (state.pendingEvent || state.interrupt)
    throw new Error('Resolve the pending decision.');
  const firstLog = state.log.length;
  if (!state.shift) {
    state.shift = {
      end: (Math.floor(state.now / (12 * HOUR)) + 1) * 12 * HOUR,
      start: state.now,
    };
    state.calls.push({ type: 'endShift', utc: utc(state) });
  }
  const events = timeline(state.windowId);
  while (
    state.cursor < events.length &&
    events[state.cursor].time < state.shift.end
  ) {
    const event = events[state.cursor++];
    if (event.time < state.now) continue;
    segment(state, event.time);
    state.log.push({
      source: 'REAL',
      donkiId: event.donkiId,
      utc: event.utc,
      text:
        event.kind === 'flare' ? `Flare ${event.row.class}.` : event.kind + '.',
    });
    if (event.kind === 'particles' || event.kind === 'shock') {
      const tier = event.kind === 'shock' ? 1 : event.row.tier;
      state.hazards.push({
        id: event.donkiId,
        time: event.time,
        tier,
        duration: event.kind === 'shock' ? 1 : state.config.duration[tier],
      });
    }
    if (
      event.kind === 'forecast' &&
      has(state, 'radio') &&
      state.crew.some((c) => c.trait === 'Comms Officer')
    )
      state.morale = Math.min(state.config.moraleMax, state.morale + 1);
    if (
      (event.kind === 'flare' &&
        has(state, 'radio') &&
        state.crew.some(
          (c) => c.status !== 'medevac' && c.assignment !== 'shelter',
        )) ||
      (event.kind === 'particles' && has(state, 'dosimeter'))
    ) {
      state.interrupt = {
        source: 'REAL',
        donkiId: event.donkiId,
        kind: event.kind,
        class: event.row.class ?? null,
        associationRate:
          event.kind === 'flare'
            ? (stats.flareSepRate[event.row.class[0]] ?? null)
            : null,
        hour: (state.now / HOUR) % 24,
        text:
          event.kind === 'flare'
            ? `Flare ${event.row.class}. Recall crew or keep working?`
            : 'Dosimeter alarm. Recall crew or keep working?',
      };
      return copy(state.log.slice(firstLog));
    }
  }
  segment(state, state.shift.end);
  for (const forecast of windowData(state.windowId).cmeForecasts) {
    const predicted = Date.parse(forecast.predicted);
    const actual = forecast.actual ? Date.parse(forecast.actual) : null;
    const evaluated = actual ?? predicted + 30 * HOUR;
    if (
      evaluated <= state.now &&
      !state.forecastResults.includes(forecast.id)
    ) {
      state.forecastResults.push(forecast.id);
      // Score the call at arrival, not a later recall in the same shift.
      const assignments = Object.fromEntries(
        state.crew.map((c) => [c.id, 'shelter']),
      );
      for (const call of state.calls.filter(
        (c) => Date.parse(c.utc) <= evaluated,
      )) {
        if (call.type === 'assignCrew' && call.crewId !== 'bolt')
          assignments[call.crewId] = call.task;
        if (call.type === 'recallAll')
          Object.keys(assignments).forEach((id) => {
            assignments[id] = 'shelter';
          });
      }
      const sheltered = Object.values(assignments).every(
        (task) => task === 'shelter',
      );
      if (
        has(state, 'radio') &&
        sheltered &&
        actual &&
        Math.abs(actual - predicted) <= 30 * HOUR
      )
        state.flags.trusted++;
      if (
        has(state, 'radio') &&
        ((!actual && !sheltered) ||
          (actual && Math.abs(actual - predicted) > 12 * HOUR && sheltered))
      )
        state.flags.outguessed++;
    }
  }
  upkeep(state, state.now);
  state.shiftIndex++;
  state.shift = null;
  state.flags.radioEver ||= has(state, 'radio');
  state.log.push({
    source: 'GAME',
    utc: utc(state),
    text: 'Shift complete. Resources and relative dose use GAME rules.',
  });
  if (
    state.phase === 'shelter' &&
    state.shiftIndex % state.config.eventEvery === 0
  )
    state.pendingEvent = nextEvent(state);
  state.achievements = achievements(state);
  return copy(state.log.slice(firstLog));
}
export function checkEnding(state) {
  return ending(state);
}
export function buildReveal(state) {
  if (state.phase !== 'ending')
    throw new Error('Finish the run before revealing hidden records.');
  const w = windowData(state.windowId);
  return copy({
    source: 'GAME',
    dates: { start: w.start, end: utc(state) },
    timeline: {
      playerCalls: state.calls,
      nasaForecast: w.cmeForecasts
        .filter((f) => Date.parse(f.issued) <= state.now)
        .map((f) => ({ ...f, source: 'REAL', donkiId: f.id })),
      reality: timeline(state.windowId)
        .filter((e) => e.time <= state.now)
        .map(({ donkiId, utc, kind }) => ({
          source: 'REAL',
          donkiId,
          utc,
          kind,
        })),
    },
    stats: {
      crewHome: state.crew.filter((c) => c.status !== 'medevac').length,
      science: state.science,
      totalDose: state.crew.reduce((n, c) => n + c.dose, 0),
      shifts: state.shiftIndex,
      outguessed: state.flags.outguessed,
      trusted: state.flags.trusted,
      wallSuppliesConsumed: state.wallConsumed ?? 0,
    },
    ending: ending(state),
    achievements: achievements(state),
    approximations: [
      'GAME relative rad units, storm tiers, half-shift decay and shock surge; never mSv.',
      'GAME shielding: min(90%, 1-exp(-wall mass/8)); consuming wall supplies immediately removes mass.',
      'GAME food, water, power, morale, production, crew traits, medevac and resupply rules.',
      'GAME scramble seconds and clamp; source countdown stays in real minutes.',
      'NASA near-Earth measurements proxy Moon timing; not a Moon dosimetry model.',
      'GAME flare interrupts and dosimeter alarms, partial first shift, and UTC-midnight upkeep.',
    ],
  });
}
