import { expect, it } from 'vitest';
import { collect } from '../../src/core/collections.js';
import {
  allRealIds,
  collectibleRealIds,
  windows,
  windowData,
  HOUR,
} from '../../src/core/data.js';
import {
  createRun,
  applyScrambleResult,
  buildReveal,
} from '../../src/core/api.js';
import { DIFFICULTIES } from '../../src/core/config.js';
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

it('can complete the Almanac from legal reveal boundaries without future or invented cards', () => {
  let ledger;
  const reached = new Set();
  const longest = Math.max(...Object.values(DIFFICULTIES).map((d) => d.days));
  for (const windowId of windows) {
    const start = Date.parse(windowData(windowId).start);
    const latestEnd = (Math.floor(start / (24 * HOUR)) + longest) * 24 * HOUR;
    let s;
    for (let seed = 0; seed < 100; seed++) {
      const candidate = createRun({
        seed,
        windowId,
        difficulty: 'Flight Director',
      });
      if (candidate.resupply === latestEnd) {
        s = candidate;
        break;
      }
    }
    expect(s).toBeDefined();
    applyScrambleResult(s, {
      itemsSaved: s.items.map((i) => i.id),
      crewSaved: s.crew.map((c) => c.id),
      crewExposed: [],
      timeLeft: 0,
    });
    // Evaluate the final-reveal contract at a legal end; survival balance is tested separately.
    s.now = s.resupply;
    s.phase = 'ending';
    const r = buildReveal(s);
    for (const row of r.timeline.reality) {
      expect(Date.parse(row.utc)).toBeLessThanOrEqual(latestEnd);
      expect(allRealIds).toContain(row.donkiId);
      reached.add(row.donkiId);
    }
    const linkedFlare = windowData(windowId).sep.flareId;
    expect(r.timeline.reality.some((e) => e.donkiId === linkedFlare)).toBe(
      true,
    );
    ledger = collect(ledger, r);
  }
  expect([...reached].sort()).toEqual(collectibleRealIds);
  expect(collectibleRealIds.length).toBeLessThan(allRealIds.length);
  expect(ledger.achievements).toContain('Almanac 100%');
});

it('ignores duplicate, unreachable and unknown legacy cards when awarding percentages', () => {
  const partial = {
    ...reveal,
    timeline: { reality: [] },
  };
  const old = {
    cards: [
      collectibleRealIds[0],
      collectibleRealIds[0],
      ...allRealIds.filter((id) => !collectibleRealIds.includes(id)),
      ...Array.from(
        { length: collectibleRealIds.length },
        (_, n) => `old-unknown-${n}`,
      ),
    ],
    endings: [],
    achievements: [],
    historic: [],
    dailyWins: [],
  };
  expect(collect(old, partial).achievements).not.toContain('Almanac 25%');
  expect(old.achievements).toEqual([]);
});
