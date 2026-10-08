import { describe, expect, it } from 'vitest';
import * as api from '../../src/core/api.js';
import { CONFIG, CREW, ITEM_TYPES } from '../../src/core/config.js';
import { HOUR, windows, windowData, timeline } from '../../src/core/data.js';
import { shield, integrate, expose } from '../../src/core/dose.js';
import { ENDINGS, ending, achievements } from '../../src/core/endings.js';
import { EVENT_DECK, choose } from '../../src/core/events.js';
import { addItem } from '../../src/core/state.js';
import { produce, upkeep, feed, remove } from '../../src/core/rules.js';
import { createRng, seedValue, draw } from '../../src/core/rng.js';
import { MOCK_RUN } from '../../src/core/mock-run.js';
import { runBot, BOTS, policy } from '../../tools/bots.mjs';
const {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
  getShiftView,
  act,
  resolveShift,
  checkEnding,
  buildReveal,
} = api;
const clone = (x) => structuredClone(x);
function shelter(options = {}) {
  const s = createRun({ seed: 'test', mode: 'judge', ...options });
  applyScrambleResult(s, {
    itemsSaved: s.items.map((i) => i.id),
    crewSaved: s.crew.map((c) => c.id),
    crewExposed: [],
    timeLeft: 0,
  });
  return s;
}
function advance(s) {
  if (s.pendingEvent)
    act(s, { type: 'chooseEvent', eventId: s.pendingEvent.id, choice: 1 });
  if (s.interrupt) act(s, { type: 'recallAll' });
  resolveShift(s);
}
function finish(s) {
  for (let i = 0; i < 2000 && s.phase === 'shelter'; i++) advance(s);
  return s;
}
describe('real engine contract', () => {
  it('retains eight exports, detached setups, true May 11 timing, and archived mock isolation', () => {
    expect(Object.keys(api)).toHaveLength(8);
    const s = createRun({ seed: 'moon', mode: 'judge' });
    const setup = getScrambleSetup(s);
    expect(setup.realMinutes).toBe(60);
    expect(setup.seconds).toBe(60);
    expect(setup.clampNote).toBeNull();
    expect(windowData(s.windowId).sep.alertLagMin).toBe(20);
    expect(setup.crewSpawns).toHaveLength(4);
    setup.crewSpawns[0].name = 'changed';
    expect(s.crew[0].name).toBe('Ria');
    expect(MOCK_RUN.pendingEvent.source).toBe('GAME');
    expect(MOCK_RUN.flares.every((f) => f.source === 'GAME')).toBe(true);
    expect(
      getScrambleSetup(
        createRun({ seed: 1, mode: 'judge', difficulty: 'Cadet' }),
      ).seconds,
    ).toBe(90);
    expect(
      getScrambleSetup(createRun({ seed: 1, windowId: windows[0] })).clampNote,
    ).toContain('clamped');
  });
  it('uniform selection covers every real window and serializable RNG matches closure', () => {
    const selected = new Set(
      Array.from({ length: 3000 }, (_, seed) => createRun({ seed }).windowId),
    );
    expect(selected.size).toBe(windows.length);
    const r = createRng('moon'),
      s = { rng: seedValue('moon') };
    for (let i = 0; i < 50; i++) expect(draw(s)).toBe(r());
    expect(() => windowData('missing')).toThrow();
    expect(Object.isFrozen(windowData(windows[0]))).toBe(true);
  });
  it('rejects invalid options and scramble partitions without mutation', () => {
    for (const o of [
      {},
      { seed: 1, difficulty: 'bad' },
      { seed: 1, mode: 'bad' },
      { seed: 1, crewIds: ['ria'] },
      { seed: 1, crewIds: ['ria', 'ria', 'dom', 'pip'] },
      { seed: 1, crewIds: ['ria', 'dom', 'pip', 'bad'] },
      { seed: 1, windowId: 'missing' },
    ])
      expect(() => createRun(o)).toThrow();
    const s = createRun({ seed: 1 });
    const valid = {
      itemsSaved: [],
      crewSaved: s.crew.map((c) => c.id),
      crewExposed: [],
      timeLeft: 0,
    };
    for (const change of [
      { itemsSaved: ['bad'] },
      { itemsSaved: [s.items[0].id, s.items[0].id] },
      { crewSaved: ['bad'] },
      { crewExposed: ['ria'] },
      { crewSaved: [] },
      { timeLeft: -1 },
      { timeLeft: Infinity },
      { timeLeft: 999 },
      { itemsSaved: null },
    ]) {
      const before = clone(s);
      expect(() => applyScrambleResult(s, { ...valid, ...change })).toThrow();
      expect(s).toEqual(before);
    }
    applyScrambleResult(s, valid);
    expect(() => applyScrambleResult(s, valid)).toThrow();
    const exposed = createRun({ seed: 1, mode: 'judge' });
    applyScrambleResult(exposed, {
      ...valid,
      crewSaved: [],
      crewExposed: exposed.crew.map((c) => c.id),
    });
    expect(exposed.crew[0].dose).toBe(CONFIG.dose[3]);
  });
  it('save/restore and repeated resolution produce identical results', () => {
    const a = shelter(),
      b = JSON.parse(JSON.stringify(a));
    for (let i = 0; i < 60 && a.phase === 'shelter'; i++) {
      advance(a);
      advance(b);
      expect(a).toEqual(b);
    }
    expect(buildReveal(finish(a))).toEqual(buildReveal(finish(b)));
  });
  it('gates radio, dosimeter, issue times, Kp and reveal without future leakage', () => {
    const s = shelter({ crewIds: ['mara', 'iggy', 'sol', 'pip'] });
    const view = getShiftView(s);
    expect(view.radio).toBe(true);
    expect(view.crew[0].dose).toBe(0);
    for (const card of view.forecastCards) {
      expect(Object.keys(card)).not.toContain('actual');
      expect(Object.keys(card)).not.toContain('errorH');
      expect(Object.keys(card)).not.toContain('outcome');
      expect(card.issueHour).toBeLessThanOrEqual(0);
    }
    s.now += 3 * 24 * HOUR;
    const cards = getShiftView(s).forecastCards;
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((f) => f.kpRange)).toBe(true);
    s.difficulty = 'Flight Director';
    expect(
      getShiftView(s).forecastCards.every((f) => f.bandHours === null),
    ).toBe(true);
    s.pantry = s.pantry.filter((i) => !['radio', 'dosimeter'].includes(i.type));
    expect(getShiftView(s).forecastCards).toEqual([]);
    expect(getShiftView(s).radioMessages).toEqual([]);
    expect(getShiftView(s).crew[0].dose).toBeNull();
    getShiftView(s).crew[0].name = 'changed';
    expect(s.crew[0].name).toBe('Mara');
    expect(() => buildReveal(s)).toThrow();
  });
  it('consuming wall mass changes shielding immediately and validates moves', () => {
    const s = shelter();
    act(s, { type: 'moveItem', itemId: s.pantry[0].id, to: 'wall' });
    const before = shield(s);
    act(s, { type: 'consume', itemId: s.wall[0].id, crewId: 'ria' });
    expect(shield(s)).toBeLessThan(before);
    expect(s.crew[0].fedWater).toBe(1);
    expect(s.flags.wallEaten).toBe(true);
    for (let i = 0; i < 8; i++)
      act(s, { type: 'moveItem', itemId: s.pantry[0].id, to: 'wall' });
    expect(shield(s)).toBe(0.9);
    expect(() =>
      act(s, { type: 'moveItem', itemId: s.pantry[0].id, to: 'wall' }),
    ).toThrow();
    act(s, { type: 'moveItem', itemId: s.wall[0].id, to: 'pantry' });
    for (const action of [
      { type: 'moveItem', itemId: 'bad', to: 'wall' },
      { type: 'moveItem', to: 'bad' },
      { type: 'consume', itemId: 'bad' },
      { type: 'consume', itemId: s.pantry.find((i) => i.type === 'radio').id },
      { type: 'useItem', itemId: 'bad' },
      { type: 'assignCrew', crewId: 'bad', task: 'science' },
      { type: 'assignCrew', crewId: 'ria', task: 'bad' },
      { type: 'bad' },
      { type: 'chooseEvent', eventId: 'bad', choice: 0 },
    ])
      expect(() => act(s, action)).toThrow();
    expect(() => remove(s, 'bad')).toThrow();
  });
  it('interrupts freeze at their real time and continuation consumes each event once', () => {
    const s = shelter();
    act(s, { type: 'assignCrew', crewId: 'ria', task: 'science' });
    for (let i = 0; i < 100 && !s.interrupt; i++) advance(s);
    expect(s.interrupt.source).toBe('REAL');
    const now = s.now,
      index = s.shiftIndex;
    expect(() => resolveShift(s)).toThrow();
    expect(() =>
      act(s, { type: 'assignCrew', crewId: 'ria', task: 'shelter' }),
    ).toThrow();
    act(s, { type: 'recallAll' });
    expect(s.now).toBe(now);
    expect(s.shiftIndex).toBe(index);
    expect(s.crew.every((c) => c.assignment === 'shelter')).toBe(true);
    expect(() => act(s, { type: 'useItem', itemId: s.pantry[0].id })).toThrow();
    resolveShift(s);
    if (s.interrupt) act(s, { type: 'keepWorking' });
    finish(s);
    const keys = s.log
      .filter((e) => e.source === 'REAL')
      .map((e) => e.donkiId + e.utc + e.text);
    expect(new Set(keys).size).toBe(keys.length);
    expect(() => resolveShift(s)).toThrow();
    expect(() => act(s, { type: 'endShift' })).toThrow();
  });
});
describe('GAME dose and survival rules', () => {
  it('integrates partial exposure, decay and overlapping storms', () => {
    const s = shelter();
    s.hazards = [{ time: 0, tier: 1, duration: 1 }];
    expect(integrate(s, 0, 6 * HOUR)).toBe(CONFIG.dose[1] / 2);
    expect(integrate(s, 12 * HOUR, 24 * HOUR)).toBe(CONFIG.dose[1] / 2);
    expect(integrate(s, -12 * HOUR, 0)).toBe(0);
    s.hazards.push({ ...s.hazards[0] });
    expect(integrate(s, 0, 12 * HOUR)).toBe(CONFIG.dose[1] * 2);
    expose(s, 0, 0);
    s.wall = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      mass: 3,
      type: 'water',
    }));
    s.hazards = [{ time: 0, tier: 3, duration: 3 }];
    s.crew[0].assignment = 'science';
    expose(s, 0, 12 * HOUR);
    expect(s.crew[0].dose).toBe(CONFIG.dose[3]);
    expect(s.crew[1].dose).toBeCloseTo(CONFIG.dose[3] * 0.1);
    expect(s.flags.closeCall).toBe(true);
    expect(s.flags.ironWall).toBe(true);
    s.flags.wallEaten = true;
    s.crew[0].dose = 49;
    expose(s, 12 * HOUR, 24 * HOUR);
    expect(s.crew[0].status).toBe('medevac');
    expect(s.flags.snack).toBe(false);
    s.wall = [];
    s.crew[1].dose = 49;
    expose(s, 24 * HOUR, 36 * HOUR);
    expect(s.flags.snack).toBe(true);
    s.crew[1].status = 'healthy';
    s.crew[1].dose = 24;
    expose(s, 24 * HOUR, 36 * HOUR);
    expect(s.crew[1].status).toBe('rad-sick');
  });
  it('implements all eight crew traits and task production, sick output, BOLT', () => {
    expect(CREW).toHaveLength(8);
    const s = shelter();
    const c = s.crew[0];
    c.assignment = 'greenhouse';
    produce(s, c, 2);
    expect(s.pantry.filter((i) => i.type === 'food').length).toBe(
      CONFIG.initialFood + 4,
    );
    c.assignment = 'solar';
    c.trait = 'Engineer';
    s.broken = true;
    const power = s.power;
    produce(s, c, 1);
    expect(s.power - power).toBe(CONFIG.solar * 2);
    expect(s.broken).toBe(false);
    c.assignment = 'science';
    c.trait = 'Geologist';
    produce(s, c, 1);
    expect(s.science).toBe(CONFIG.science * 2);
    c.status = 'rad-sick';
    produce(s, c, 1);
    expect(s.science).toBe(CONFIG.science * 3);
    c.assignment = 'drill';
    produce(s, c, 2);
    expect(s.pantry.filter((i) => i.type === 'water').length).toBe(
      CONFIG.initialWater + 1,
    );
    for (const trait of ['Rover Pilot', 'Botanist']) {
      c.trait = trait;
      c.assignment = 'salvage';
      produce(s, c, 2);
    }
    produce(s, c, 0);
    c.assignment = 'shelter';
    produce(s, c, 1);
    const pilot = createRun({
      seed: 1,
      crewIds: ['mara', 'iggy', 'sol', 'pip'],
    });
    expect(
      getScrambleSetup(pilot).crewSpawns.find((c) => c.id === 'iggy')
        .hopMultiplier,
    ).toBeGreaterThan(1);
    const rookie = shelter({ crewIds: ['mara', 'iggy', 'sol', 'pip'] });
    expose(rookie, rookie.now, rookie.now + HOUR);
    expect(rookie.crew.find((c) => c.id === 'pip').trait).not.toBe('Rookie');
    const boltDose = s.crew[0].dose;
    s.boltTask = 'science';
    upkeep(s, 12 * HOUR);
    expect(s.boltCrew.workByTask.science).toBeDefined();
    expect(s.crew[0].dose).toBe(boltDose);
    s.power = 0;
    upkeep(s, 12 * HOUR);
    s.pantry = s.pantry.filter((i) => i.type !== 'bolt');
    expect(() =>
      act(s, { type: 'assignCrew', crewId: 'bolt', task: 'drill' }),
    ).toThrow();
  });
  it('medicine, chef feeding, missed meals, repair, batteries and morale have effects', () => {
    const s = shelter({ crewIds: ['sol', 'dom', 'aiko', 'ria'] });
    const c = s.crew[0];
    const item = (type) => s.pantry.find((i) => i.type === type).id;
    act(s, { type: 'consume', itemId: item('food'), crewId: c.id });
    expect(c.fedFood).toBe(1.5);
    c.dose = 40;
    c.status = 'rad-sick';
    act(s, { type: 'useItem', itemId: item('med'), crewId: c.id });
    expect(c.dose).toBe(20);
    expect(c.status).toBe('healthy');
    c.dose = 49;
    c.status = 'rad-sick';
    s.medicAt = -6;
    upkeep(s, 12 * HOUR);
    expect(c.dose).toBe(39);
    s.shiftIndex = 7;
    upkeep(s, 12 * HOUR);
    expect(c.dose).toBe(29);
    s.shiftIndex = 14;
    upkeep(s, 12 * HOUR);
    expect(c.status).toBe('healthy');
    s.broken = true;
    act(s, { type: 'useItem', itemId: item('repair') });
    expect(s.broken).toBe(false);
    const power = s.power;
    act(s, { type: 'useItem', itemId: item('battery') });
    expect(s.power).toBe(power + 8);
    act(s, { type: 'useItem', itemId: item('guitar') });
    act(s, { type: 'useItem', itemId: item('game') });
    expect(s.morale).toBe(10);
    expect(feed(s, c, 'food')).toBe(true);
    s.pantry = s.pantry.filter((i) => !['water', 'food'].includes(i.type));
    expect(feed(s, c, 'water')).toBe(false);
    upkeep(s, 24 * HOUR);
    upkeep(s, 48 * HOUR);
    upkeep(s, 72 * HOUR);
    expect(s.phase).toBe('ending');
    expect(s.crew.some((c) => c.status === 'medevac')).toBe(true);
    const dark = shelter();
    dark.power = 0;
    upkeep(dark, 12 * HOUR);
    upkeep(dark, 12 * HOUR);
    expect(dark.flags.powerEvac).toBe(true);
  });
  it('all 30 original events offer two choices and keep GAME stamps', () => {
    expect(EVENT_DECK).toHaveLength(30);
    expect(new Set(EVENT_DECK.map((e) => e.text)).size).toBe(30);
    for (const event of EVENT_DECK)
      for (const choice of [0, 1]) {
        const s = shelter();
        s.pendingEvent = clone(event);
        expect(() => act(s, { type: 'endShift' })).toThrow();
        expect(() =>
          act(s, { type: 'chooseEvent', eventId: event.id, choice: 2 }),
        ).toThrow();
        act(s, { type: 'chooseEvent', eventId: event.id, choice });
        expect(s.pendingEvent).toBeNull();
        expect(s.log.at(-1).source).toBe('GAME');
      }
    const s = shelter();
    s.pantry = s.pantry.filter((i) => !['game', 'guitar'].includes(i.type));
    choose(s, 1);
    expect(s.morale).toBe(7);
  });
  it('greenhouse requires seeds, power and functioning equipment; daily upkeep uses wall last', () => {
    for (const change of ['seeds', 'broken', 'power']) {
      const s = shelter();
      const c = s.crew[0];
      c.assignment = 'greenhouse';
      if (change === 'seeds')
        s.pantry = s.pantry.filter((i) => i.type !== 'seeds');
      if (change === 'broken') s.broken = true;
      if (change === 'power') s.power = 0;
      produce(s, c, 2);
      expect(s.plant).toBe(0);
    }
    const s = shelter();
    s.wall = s.pantry.filter((i) => i.type === 'water').slice(0, 4);
    s.pantry = s.pantry.filter((i) => i.type !== 'water');
    upkeep(s, 24 * HOUR);
    expect(s.wall).toHaveLength(0);
    expect(s.flags.wallEaten).toBe(true);
  });
});
describe('endings, achievements and real IDs', () => {
  it('all ten endings are reachable with explicit documented precedence', () => {
    const base = shelter();
    base.phase = 'ending';
    base.flags.eva = true;
    const checks = {
      'Mission Complete': (s) => {
        s.science = 0;
      },
      'Science Legend': (s) => {
        s.science = s.rules.goal;
      },
      'Kamote Kingdom': (s) => {
        s.flags.eva = false;
        s.plant = 3;
      },
      'Early Ride Home': (s) => {
        s.crew[0].status = 'medevac';
      },
      'Lights Out': (s) => {
        s.flags.powerEvac = true;
      },
      'Snack Attack': (s) => {
        s.flags.snack = true;
      },
      'Forecast Whisperer': (s) => {
        s.flags.outguessed = 3;
      },
      'Blind Luck': (s) => {
        s.flags.radioEver = false;
      },
      'Skeleton Crew': (s) => {
        s.scrambleResult.crewSaved = ['ria'];
      },
      'Close Call': (s) => {
        s.flags.closeCall = true;
      },
    };
    for (const id of ENDINGS) {
      const s = clone(base);
      checks[id](s);
      expect(checkEnding(s)).toBe(id);
    }
    expect(ending(shelter())).toBeNull();
    expect(achievements(base)).toContain('Full House');
    base.flags.ironWall = true;
    base.flags.trusted = 1;
    base.flags.outguessed = 1;
    expect(achievements(base)).toEqual(
      expect.arrayContaining([
        'Iron Wall',
        'Trusted the Forecast',
        'Outguessed the Model',
      ]),
    );
    base.flags.radioEver = false;
    base.difficulty = 'Flight Director';
    expect(achievements(base)).toEqual(
      expect.arrayContaining(['Blind Luck', 'Flight Director win']),
    );
    base.flags.eva = false;
    base.plant = 3;
    expect(achievements(base)).toContain('Kamote Kingdom');
  });
  it('all source REAL IDs and reveal lanes remain valid over every window', () => {
    for (const windowId of windows) {
      const s = finish(shelter({ windowId, seed: windowId }));
      const reveal = buildReveal(s);
      expect(Object.keys(reveal.timeline)).toEqual([
        'playerCalls',
        'nasaForecast',
        'reality',
      ]);
      const ids = new Set(timeline(windowId).map((e) => e.donkiId));
      for (const e of s.log.filter((e) => e.source === 'REAL'))
        expect(ids.has(e.donkiId)).toBe(true);
      expect(reveal.approximations.join(' ')).toContain('never mSv');
    }
  });
  it('all six policies finish seeded runs on every difficulty using permitted views', () => {
    for (const difficulty of ['Cadet', 'Commander', 'Flight Director'])
      for (const bot of BOTS)
        for (let i = 0; i < 12; i++)
          expect(
            runBot({ seed: `integration:${i}`, bot, difficulty }).ending,
          ).toBeTruthy();
    const view = getShiftView(shelter());
    expect(policy(view, 'AlwaysShelter', () => 0)).toBe(true);
    expect(policy(view, 'NeverShelter', () => 0)).toBe(false);
    for (const type of Object.keys(ITEM_TYPES))
      expect(runBot({ seed: 'ablation', omit: type }).ending).toBeTruthy();
    const s = shelter();
    s.crew[0].status = 'medevac';
    expect(() =>
      act(s, { type: 'assignCrew', crewId: s.crew[0].id, task: 'science' }),
    ).toThrow();
    s.crew.forEach((c) => (c.status = 'medevac'));
    expect(() =>
      act(s, {
        type: 'useItem',
        itemId: s.pantry.find((i) => i.type === 'med').id,
      }),
    ).toThrow();
    expect(() => act(s, { type: 'consume', itemId: s.pantry[0].id })).toThrow();
    addItem(s, 'water');
  });
});

it('bounds resupply to the last two UTC days and rejects invalid medicine targets atomically', () => {
  for (const difficulty of ['Cadet', 'Commander', 'Flight Director'])
    for (let seed = 0; seed < 100; seed++) {
      const s = createRun({ seed, difficulty });
      const base = Math.floor(s.now / (12 * HOUR)) * 12 * HOUR;
      expect(s.resupply - base).toBeGreaterThanOrEqual(
        (s.rules.days * 2 - 3) * 12 * HOUR,
      );
      expect(s.resupply - base).toBeLessThanOrEqual(s.rules.days * 24 * HOUR);
    }
  for (const seed of [NaN, Infinity, null, {}, true])
    expect(() => createRun({ seed })).toThrow();
  const s = shelter();
  for (const type of ['consume', 'useItem']) {
    const before = clone(s);
    expect(() =>
      act(s, {
        type,
        itemId: s.pantry.find(
          (i) => i.type === (type === 'consume' ? 'food' : 'med'),
        ).id,
        crewId: 'missing',
      }),
    ).toThrow();
    expect(s).toEqual(before);
  }
  s.crew[0].status = 'medevac';
  expect(() =>
    act(s, {
      type: 'useItem',
      itemId: s.pantry.find((i) => i.type === 'med').id,
      crewId: s.crew[0].id,
    }),
  ).toThrow();
});
