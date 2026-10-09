import { it, expect } from 'vitest';
import {
  dailySetup,
  encodeSeed,
  decodeSeed,
  utcDate,
  shareResult,
  missionScore,
} from '../../src/app/replay.js';
import { createRun, getScrambleSetup } from '../../src/core/api.js';

it('uses UTC dates and gives everyone the same daily setup across timezone offsets', () => {
  const date = utcDate(Date.parse('2026-10-09T00:30:00+08:00'));
  expect(date).toBe('2026-10-08');
  const first = dailySetup(date),
    second = dailySetup(utcDate(Date.parse('2026-10-08T16:30:00Z')));
  expect(first).toEqual(second);
  expect(new Set(first.crewIds).size).toBe(4);
  expect(getScrambleSetup(createRun(first))).toEqual(
    getScrambleSetup(createRun(second)),
  );
  expect(dailySetup('2026-10-09').seed).not.toBe(first.seed);
  expect(() => dailySetup('2026-02-30')).toThrow();
});
it('checked codes reproduce the map, window, crew and difficulty and reject edits', () => {
  const setup = {
    ...dailySetup('2026-10-09'),
    seed: 'kaibigan 🌞',
    difficulty: 'Flight Director',
  };
  const code = encodeSeed(setup),
    decoded = decodeSeed(code);
  expect(getScrambleSetup(createRun(decoded))).toEqual(
    getScrambleSetup(createRun({ ...setup, mode: 'normal' })),
  );
  expect(() => decodeSeed(code + 'x')).toThrow('Invalid seed code.');
  expect(() => decodeSeed('SC1.garbage.1')).toThrow();
  expect(encodeSeed({ ...setup, sourceData: {} })).toBeNull();
});
it('shares the fixed GAME score and readable result grid with an exact seed code', () => {
  const setup = dailySetup('2026-10-09');
  const reveal = {
    ending: 'Blind Luck',
    stats: { crewHome: 4, science: 10, totalDose: 20 },
  };
  expect(missionScore(reveal)).toBe(216);
  expect(shareResult(reveal, setup)).toContain('🟩🟩🟩🟩');
  expect(shareResult(reveal, setup)).toContain(encodeSeed(setup));
});
