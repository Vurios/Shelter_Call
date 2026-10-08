import { expect, it } from 'vitest';
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
} from '../../src/core/api.js';
import { SCRAMBLE_CONFIG as C } from '../../src/core/config.js';
import {
  createScramble,
  startScramble,
  updateScramble,
  setTarget,
  usedSlots,
  dropCarried,
  finishScramble,
} from '../../src/scenes/scramble/logic.js';

const fresh = () =>
  createScramble(
    getScrambleSetup(createRun({ seed: 'scramble-proof', mode: 'judge' })),
  );
const advance = (s, seconds, input = {}) => {
  for (let n = 0; n < Math.round(seconds * 60); n++)
    updateScramble(s, 1 / 60, input);
};
it('reuses the REAL countdown and deterministic layout without mutating engine setup', () => {
  const setup = getScrambleSetup(createRun({ seed: 'repeat', mode: 'judge' }));
  const copy = structuredClone(setup);
  const a = createScramble(setup),
    b = createScramble(setup);
  expect(a).toEqual(b);
  expect(a.setup.realMinutes).toBe(60);
  expect(a.remaining).toBe(60);
  expect(a.stations).toHaveLength(6);
  expect(a.rocks).toHaveLength(C.rocks);
  startScramble(a);
  startScramble(b);
  advance(a, 4, { x: 1, z: 0.5 });
  advance(b, 4, { x: 1, z: 0.5 });
  expect(a).toEqual(b);
  expect(setup).toEqual(copy);
});
it('enforces weighted carry slots, drops without immediate re-pickup and deposits at the hatch', () => {
  const s = fresh();
  startScramble(s);
  s.crew.forEach((c) => {
    c.x = 10;
    c.z = 10;
  });
  s.items.forEach((i) => {
    i.x = 10;
    i.z = 10;
  });
  const water = s.items.filter((i) => i.type === 'water').slice(0, 3);
  water.forEach((i) => {
    i.x = 0;
    i.z = 2.5;
  });
  updateScramble(s, 1 / 60);
  expect(s.carried).toHaveLength(2);
  expect(usedSlots(s)).toBe(4);
  water[2].x = 10;
  dropCarried(s, water[0].id);
  updateScramble(s, 1 / 60);
  expect(usedSlots(s)).toBe(2);
  setTarget(s, 0, 0);
  advance(s, 4);
  expect(s.savedItems).toContain(water[1].id);
  expect(s.carried).toHaveLength(0);
  expect(usedSlots(s)).toBe(0);
});
it('tags crew, moves a conga line and saves them through the hatch', () => {
  const s = fresh();
  startScramble(s);
  s.items.forEach((i) => {
    i.x = 10;
    i.z = 10;
  });
  s.crew.forEach((c, i) => {
    c.x = 0;
    c.z = 2.5 + i * 0.05;
  });
  updateScramble(s, 1 / 60);
  expect(s.crew.every((c) => c.status === 'following')).toBe(true);
  advance(s, 1, { x: 1 });
  expect(s.crew[0].x).toBeGreaterThan(0);
  expect(s.crew[3].x).toBeLessThan(s.player.x);
  setTarget(s, 0, 0);
  advance(s, 6);
  expect(s.savedCrew).toHaveLength(4);
  expect(new Set(s.savedCrew).size).toBe(4);
});
it('makes low-gravity arcs with landing events, target bounds and keyboard override', () => {
  const s = fresh();
  startScramble(s);
  setTarget(s, 100, 100);
  expect(Math.hypot(s.target.x, s.target.z)).toBeCloseTo(C.mapRadius);
  advance(s, 0.5, { x: 1 });
  expect(s.player.y).toBeGreaterThan(0);
  expect(s.target).toBeNull();
  advance(s, 2);
  expect(s.events.some((e) => e.kind === 'land')).toBe(true);
  expect(s.player.y).toBe(0);
});
it('finishes once at the real deadline, exposes carried crew and preserves core result contract', () => {
  const run = createRun({ seed: 'deadline', mode: 'judge' });
  const s = createScramble(getScrambleSetup(run));
  updateScramble(s, 100);
  expect(s.remaining).toBe(60);
  startScramble(s);
  s.crew[0].status = 'following';
  updateScramble(s, 100);
  expect(s.phase).toBe('finished');
  expect(s.result.timeLeft).toBe(0);
  expect(s.result.crewExposed).toHaveLength(4);
  const result = structuredClone(s.result);
  updateScramble(s, 10);
  expect(s.result).toEqual(result);
  applyScrambleResult(run, s.result);
  expect(run.phase).toBe('shelter');
  expect(run.scrambleResult).toEqual(result);
  expect(run.crew.every((c) => c.dose > 0)).toBe(true);
});
it('allows early closure only at the hatch and ignores invalid time/targets', () => {
  const s = fresh();
  startScramble(s);
  expect(finishScramble(s, true)).toBeNull();
  setTarget(s, NaN, Infinity);
  updateScramble(s, -1);
  updateScramble(s, Infinity);
  expect(s.target).toBeNull();
  expect(s.remaining).toBe(60);
  setTarget(s, 0, 0);
  advance(s, 4);
  const result = finishScramble(s, true);
  expect(result.timeLeft).toBeGreaterThan(0);
  expect(result.crewSaved.length + result.crewExposed.length).toBe(4);
});
