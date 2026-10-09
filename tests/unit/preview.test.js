import { describe, expect, it } from 'vitest';
import { act, applyScrambleResult, createRun } from '../../src/core/api.js';
import {
  getItemPreview,
  getPlanPreview,
  getEventPreviews,
} from '../../src/core/preview.js';
import { HOUR } from '../../src/core/data.js';
import { shield } from '../../src/core/dose.js';
import { inventory, produce } from '../../src/core/rules.js';

function shelter() {
  const state = createRun({ seed: 'preview', mode: 'judge' });
  applyScrambleResult(state, {
    itemsSaved: state.items.map((item) => item.id),
    crewSaved: state.crew.map((crew) => crew.id),
    crewExposed: [],
    timeLeft: 0,
  });
  return state;
}
function observed(state) {
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

it('previews only present event costs, including a consumed wall repair kit, without RNG or mutation', () => {
  const state = shelter();
  expect(getEventPreviews(state)).toEqual([]);
  const kit = state.pantry.find((item) => item.type === 'repair');
  act(state, { type: 'moveItem', itemId: kit.id, to: 'wall' });
  state.broken = true;
  state.pendingEvent = {
    id: 'game-6',
    kind: 'maintenance',
    source: 'GAME',
    text: 'A pebble pinged the greenhouse.',
    choices: ['Patch the panel', 'Use the spare cover'],
  };
  const snapshot = structuredClone(state),
    previews = getEventPreviews(state);
  expect(state).toEqual(snapshot);
  for (const preview of previews) {
    const next = structuredClone(state);
    act(next, preview.action);
    expect(next.rng).toBe(state.rng);
    expect(preview.changes.shield.after).toBe(shield(next));
    expect(preview.changes.power.after).toBe(next.power);
    expect(preview.changes.items.after).toBe(inventory(next).length);
  }
  expect(previews[0].repaired).toBe(true);
  expect(previews[0].changes.items.delta).toBe(-1);
});

describe('safe immediate item previews', () => {
  it.each(['food', 'water', 'battery', 'repair', 'med', 'guitar', 'game'])(
    'matches actual %s use and shield change from either inventory',
    (type) => {
      for (const location of ['pantry', 'wall']) {
        const state = shelter();
        const item = state.pantry.find((entry) => entry.type === type);
        if (location === 'wall')
          act(state, { type: 'moveItem', itemId: item.id, to: 'wall' });
        state.broken = true;
        state.crew[0].dose = 28;
        state.crew[0].status = 'rad-sick';
        const original = structuredClone(state);
        const result = getItemPreview(state, item.id, state.crew[0].id);
        expect(state).toEqual(original);
        expect(result.use.available).toBe(true);
        const actual = structuredClone(state);
        act(actual, result.use.action);
        for (const [key, value] of Object.entries(observed(actual))) {
          expect(result.use.changes[key].after).toBe(value);
          expect(result.use.changes[key].delta).toBe(
            value - observed(state)[key],
          );
        }
        expect(result.use.crew.dose.after).toBe(actual.crew[0].dose);
        expect(result.use.crew.fedFood.after).toBe(actual.crew[0].fedFood);
        expect(result.use.crew.fedWater.after).toBe(actual.crew[0].fedWater);
        expect(result.use.repaired).toBe(type === 'repair');
        expect(actual.rng).toBe(state.rng);
      }
    },
  );

  it('matches moves both ways without consuming resources', () => {
    const state = shelter();
    const item = state.pantry[0];
    for (const to of ['wall', 'pantry']) {
      const preview = getItemPreview(state, item.id);
      expect(preview.move.action.to).toBe(to);
      act(state, preview.move.action);
      expect(preview.move.changes.shield.after).toBe(shield(state));
      expect(preview.move.changes.water.delta).toBe(0);
    }
  });

  it('reports rejected actions and non-usable/unknown items', () => {
    const state = shelter();
    const radio = state.pantry.find((item) => item.type === 'radio');
    expect(getItemPreview(state, 'missing')).toBeNull();
    expect(getItemPreview(state, radio.id).use).toBeNull();
    state.config.wallSlots = 0;
    expect(getItemPreview(state, radio.id).move).toMatchObject({
      available: false,
      reason: 'Wall is full.',
      changes: null,
    });
    const food = state.pantry[0];
    expect(getItemPreview(state, food.id, 'missing').use.available).toBe(false);
    state.interrupt = { kind: 'flare' };
    expect(getItemPreview(state, food.id).use.available).toBe(false);
    state.interrupt = null;
    state.pendingEvent = { id: 'test' };
    expect(getItemPreview(state, food.id).move.available).toBe(false);
    state.pendingEvent = null;
    state.shift = { start: state.now, end: state.now + HOUR };
    expect(getItemPreview(state, food.id).use.available).toBe(false);
    state.shift = null;
    state.phase = 'ending';
    expect(getItemPreview(state, food.id).move.available).toBe(false);
  });

  it('keeps dose and automatic med patient hidden without a dosimeter', () => {
    const state = shelter();
    state.pantry = state.pantry.filter((item) => item.type !== 'dosimeter');
    const med = state.pantry.find((item) => item.type === 'med');
    state.crew[0].dose = 31.234567;
    const preview = getItemPreview(state, med.id, state.crew[0].id);
    expect(preview.use.crew.dose).toBeNull();
    expect(JSON.stringify(preview)).not.toContain('31.234567');
    expect(getItemPreview(state, med.id).use.crew).toBeNull();
    const before = getItemPreview(state, med.id);
    state.crew[1].dose = 99;
    expect(getItemPreview(state, med.id)).toEqual(before);
  });

  it('uses the default food recipient and exact Chef serving credit', () => {
    const state = shelter();
    state.crew[1].trait = 'Chef';
    const food = state.pantry.find((item) => item.type === 'food');
    const preview = getItemPreview(state, food.id);
    expect(preview.use.crew.id).toBe(state.crew[0].id);
    expect(preview.use.crew.fedFood.delta).toBe(state.config.chefFood);
    for (const crew of state.crew) crew.status = 'medevac';
    expect(getItemPreview(state, food.id).use.available).toBe(false);
  });
});

describe('planning estimates without future knowledge', () => {
  it.each(['shelter', 'greenhouse', 'solar', 'drill', 'science'])(
    'matches %s production under unchanged current conditions',
    (task) => {
      for (const trait of ['Botanist', 'Engineer', 'Geologist', 'Medic']) {
        const state = shelter();
        state.now = Math.floor(state.now / (12 * HOUR)) * 12 * HOUR + 6 * HOUR;
        state.crew[0].trait = trait;
        state.crew[0].assignment = task;
        state.crew[0].workByTask = {
          [task]: task === 'greenhouse' ? 1.8 : 0.8,
        };
        const expected = getPlanPreview(state).crew[0];
        const actual = structuredClone(state);
        const before = observed(actual);
        produce(actual, actual.crew[0], 0.5);
        for (const key of ['food', 'water', 'power', 'science'])
          expect(expected.estimate[key]).toBeCloseTo(
            observed(actual)[key] - before[key],
          );
        expect(expected.earnedWork).toBe(state.crew[0].workByTask[task]);
      }
    },
  );

  it('retains earned work at an interrupt and estimates only remaining work', () => {
    const state = shelter();
    state.shift = { start: state.now, end: state.now + 6 * HOUR };
    state.interrupt = { kind: 'flare' };
    state.crew[0].assignment = 'drill';
    state.crew[0].workByTask = { drill: 0.75, greenhouse: 1.5 };
    const preview = getPlanPreview(state);
    expect(preview.hoursRemaining).toBe(6);
    expect(preview.crew[0]).toMatchObject({
      earnedWork: 0.75,
      workNeeded: 1,
      earnedByTask: { greenhouse: 1.5 },
      estimate: { water: 1 },
    });
    expect(preview.conditions).toContain('beforeUpkeep');
    act(state, { type: 'recallAll' });
    expect(getPlanPreview(state).crew[0]).toMatchObject({
      task: 'shelter',
      outside: false,
      earnedByTask: { drill: 0.75 },
    });
  });

  it('accounts for blocked greenhouse, weak crew, morale, medevac and random salvage', () => {
    const state = shelter();
    state.crew[0].assignment = 'greenhouse';
    state.crew[0].workByTask = { greenhouse: 1.9 };
    state.pantry = state.pantry.filter((item) => item.type !== 'seeds');
    state.broken = true;
    state.power = 0;
    const greenhouse = getPlanPreview(state).crew[0];
    expect(greenhouse.estimate.food).toBe(0);
    expect(greenhouse.conditions).toEqual([
      'needsSeeds',
      'needsRepair',
      'needsPower',
    ]);
    state.crew[0].assignment = 'science';
    state.crew[0].hunger = 1;
    state.morale = 0;
    const slowed = getPlanPreview(state);
    expect(slowed.crew[0].estimate.science).toBeCloseTo(
      ((state.config.science * slowed.hoursRemaining) / 12) *
        0.5 *
        state.config.moraleOutput,
    );
    expect(slowed.crew[0].conditions).toEqual(['crewSlowed', 'lowMorale']);
    state.crew[0].status = 'medevac';
    expect(getPlanPreview(state).crew[0]).toMatchObject({
      available: false,
      outside: false,
      estimate: { science: 0 },
    });
    state.crew[1].assignment = 'salvage';
    state.crew[1].workByTask = { salvage: 0.9 };
    expect(getPlanPreview(state).crew[1].estimate.randomItems).toBe(1);
    expect(getPlanPreview(state).crew[1].conditions).toContain('randomFind');
  });

  it('shows BOLT alternatives without consulting whether hidden radiation occurs', () => {
    const state = shelter();
    state.boltTask = 'science';
    const preview = getPlanPreview(state);
    expect(preview.bolt.powerCost).toBe(state.config.boltPower);
    expect(preview.bolt.slower.estimate.science).toBeCloseTo(
      preview.bolt.normal.estimate.science * state.config.boltOutput,
    );
    state.hazards = [];
    state.cursor = 999;
    state.rng = 999;
    state.crew.forEach((crew) => {
      crew.dose = 123.456789;
    });
    state.sourceData = { hiddenFuture: 'SECRET_ARRIVAL' };
    expect(getPlanPreview(state)).toEqual(preview);
    const serialized = JSON.stringify(preview);
    for (const hidden of [
      'SECRET_ARRIVAL',
      '123.456789',
      'hazards',
      'cursor',
      'rng',
      'actual',
      'predicted',
    ])
      expect(serialized).not.toContain(hidden);
    state.phase = 'ending';
    expect(getPlanPreview(state).hoursRemaining).toBe(0);
    expect(getPlanPreview(state).bolt.normal.estimate.science).toBe(0);
    state.pantry = state.pantry.filter((item) => item.type !== 'bolt');
    expect(getPlanPreview(state).bolt).toBeNull();
  });

  it('returns detached data and preserves full state, config, ordering and RNG', () => {
    const state = shelter();
    state.crew[0].assignment = 'salvage';
    state.crew[0].workByTask = { salvage: 0.9 };
    const original = structuredClone(state);
    const plan = getPlanPreview(state);
    const item = getItemPreview(state, state.pantry[0].id);
    plan.crew[0].earnedByTask.salvage = 999;
    plan.estimate.food = 999;
    item.move.action.itemId = 'changed';
    item.use.crew.fedWater.after = 999;
    expect(state).toEqual(original);
  });
});
