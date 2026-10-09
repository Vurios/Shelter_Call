import { it, expect } from 'vitest';
import { createStorage } from '../../src/app/storage.js';
import {
  claimDaily,
  completeDaily,
  dailyAttempts,
} from '../../src/app/daily.js';
it('reserves once across tabs, resumes a started date and scores only the first completion', async () => {
  const data = new Map(),
    provider = () => ({
      getItem: (key) => data.get(key),
      setItem: (key, value) => data.set(key, value),
    }),
    a = createStorage(provider),
    b = createStorage(provider);
  expect(dailyAttempts(b)).toEqual({});
  expect(await claimDaily(a, '2026-10-09', null)).toBe(true);
  expect(await claimDaily(b, '2026-10-09', null)).toBe(false);
  const reveal = {
    ending: 'Blind Luck',
    stats: { crewHome: 4, science: 10, totalDose: 20 },
  };
  expect(completeDaily(b, '2026-10-09', reveal, 'first')).toBe(true);
  expect(completeDaily(a, '2026-10-09', reveal, 'second')).toBe(false);
  expect(dailyAttempts(a)['2026-10-09']).toMatchObject({
    status: 'complete',
    score: 216,
    share: 'first',
  });
  expect(await claimDaily(b, '2026-10-10', null)).toBe(true);
});
it('keeps one daily attempt in memory when storage is blocked and ignores corrupted attempts', async () => {
  const store = createStorage(() => {
    throw new Error('blocked');
  });
  expect(await claimDaily(store, '2026-10-09', null)).toBe(true);
  expect(await claimDaily(store, '2026-10-09', null)).toBe(false);
  store.writeExtra('daily-attempts', {
    'bad-date': { status: 'started', code: 'bad' },
  });
  expect(dailyAttempts(store)).toEqual({});
});
