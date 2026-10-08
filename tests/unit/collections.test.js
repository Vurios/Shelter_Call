import { expect, it } from 'vitest';
import { collect } from '../../src/core/collections.js';
import { allRealIds, windows } from '../../src/core/data.js';
const reveal = {
  ending: 'Mission Complete',
  achievements: ['Full House'],
  timeline: { reality: allRealIds.map((donkiId) => ({ donkiId })) },
};
it('tracks all collection achievements without storage or a current clock', () => {
  let ledger;
  for (let day = 1; day <= 7; day++)
    ledger = collect(ledger, reveal, {
      mode: 'daily',
      dailyDate: `2024-05-0${day}`,
    });
  for (let n = 0; n < 5; n++)
    ledger = collect(ledger, reveal, {
      mode: 'historic',
      windowId: windows[n],
    });
  expect(ledger.achievements).toEqual(
    expect.arrayContaining([
      'Almanac 25%',
      'Almanac 50%',
      'Almanac 100%',
      'Sun Streak',
      'Historian',
      'Full House',
    ]),
  );
  const before = structuredClone(ledger);
  expect(collect(ledger, reveal)).toEqual(ledger);
  expect(ledger).toEqual(before);
  expect(
    collect(
      undefined,
      { ...reveal, ending: 'Early Ride Home' },
      { mode: 'daily', dailyDate: '2024-01-01' },
    ).dailyWins,
  ).toEqual([]);
  expect(
    collect(undefined, reveal, { mode: 'daily', dailyDate: 'bad' }).dailyWins,
  ).toEqual([]);
  expect(
    collect(undefined, reveal, { mode: 'daily', dailyDate: '2024-99-01' })
      .dailyWins,
  ).toEqual([]);
  const partial = {
    ...reveal,
    timeline: {
      reality: [{ donkiId: 'invented' }, { donkiId: allRealIds[0] }],
    },
  };
  expect(collect(undefined, partial).cards).toEqual([allRealIds[0]]);
  let short = collect(undefined, partial, {
    mode: 'daily',
    dailyDate: '2024-01-01',
  });
  short = collect(short, partial, { mode: 'daily', dailyDate: '2024-01-03' });
  expect(short.achievements).not.toContain('Sun Streak');
});
