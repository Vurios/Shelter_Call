import { it, expect } from 'vitest';
import { timelineRows } from '../../src/ui/reveal/timeline.js';
import { t, phrase, setLanguage } from '../../src/i18n/index.js';
import en from '../../src/i18n/en.json';
import fil from '../../src/i18n/fil.json';

it('compares crew calls at actual UTC rather than a later recall; separates later archive arrivals', () => {
  const reveal = {
    dates: { start: '2024-05-01T00:00:00Z', end: '2024-05-03T00:00:00Z' },
    timeline: {
      playerCalls: [
        {
          type: 'assignCrew',
          crewId: 'ria',
          task: 'science',
          utc: '2024-05-01T01:00:00Z',
        },
        { type: 'recallAll', utc: '2024-05-02T04:00:00Z' },
      ],
      nasaForecast: [
        {
          id: 'first',
          predicted: '2024-05-01T03:00:00Z',
          actual: '2024-05-02T03:00:00Z',
        },
        {
          id: 'later',
          predicted: '2024-05-03T10:00:00Z',
          actual: '2024-05-04T00:00:00Z',
        },
      ],
      reality: [
        {
          kind: 'shock',
          utc: '2024-05-02T03:00:00Z',
          donkiId: 'real-shock',
          source: 'GAME',
        },
      ],
    },
  };
  const before = structuredClone(reveal);
  const rows = timelineRows(reveal, ['ria', 'dom']);
  expect(rows.find((row) => row.forecast?.id === 'first')).toMatchObject({
    missed: true,
    reached: true,
    comparison: 'Crew outside at the arrival',
  });
  expect(rows.find((row) => row.forecast?.id === 'later')).toMatchObject({
    missed: false,
    reached: false,
    comparison: 'Not reached before your journal closed',
  });
  expect(rows.find((row) => row.event)).toMatchObject({ caught: true });
  expect(reveal).toEqual(before);
});
it('marks a sheltered miss and an evaluated false alarm without inventing an observed arrival', () => {
  const reveal = {
    dates: { start: '2024-05-01T00:00:00Z', end: '2024-05-04T00:00:00Z' },
    timeline: {
      playerCalls: [],
      reality: [],
      nasaForecast: [
        {
          id: 'miss',
          predicted: '2024-05-01T00:00:00Z',
          actual: '2024-05-02T00:00:00Z',
        },
        { id: 'false', predicted: '2024-05-01T00:00:00Z', actual: null },
      ],
    },
  };
  const rows = timelineRows(reveal, ['ria']);
  expect(rows.find((row) => row.forecast.id === 'miss').comparison).toBe(
    'Crew sheltered when the forecast missed',
  );
  expect(rows.find((row) => row.forecast.id === 'false').comparison).toBe(
    'Sheltered through a false alarm',
  );
});
it('switches natural Filipino copy, interpolates game quantities and preserves source IDs/UTC', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(fil).sort());
  for (const key of Object.keys(en))
    expect([...en[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(
      [...fil[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
    );
  setLanguage('fil');
  expect(t('Play')).toBe('Maglaro');
  expect(phrase('Day 3')).toBe('Araw 3');
  expect(phrase('Find Ria')).toBe('Hanapin si Ria');
  expect(phrase('2024-05-11T02:10:00-SEP-001')).toBe(
    '2024-05-11T02:10:00-SEP-001',
  );
  expect(phrase('2024-05-11T02:10:00Z')).toBe('2024-05-11T02:10:00Z');
  expect(phrase('Moon dust in the filter. Brush it by hand')).toBe(
    'May alikabok ng Buwan sa filter. Linisin gamit ang kamay',
  );
  setLanguage('en');
});
