import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  transformLive,
  validLiveArchive,
  loadLive,
} from '../../src/data/live.js';
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
  getShiftView,
  act,
  resolveShift,
} from '../../src/core/api.js';
import { createStorage } from '../../src/app/storage.js';
const raw = JSON.parse(readFileSync('tests/fixtures/live-donki.json', 'utf8'));
const empty = () => ({
  FLR: [],
  SEP: [],
  CME: [],
  IPS: [],
  WSAEnlilSimulations: [],
});
it('matches the Python join output on an archived NASA fixture', () => {
  const python = existsSync('.venv/Scripts/python.exe')
    ? '.venv/Scripts/python.exe'
    : 'python';
  const result = spawnSync(
    python,
    [
      '-c',
      "import sys,json;sys.path.insert(0,'data-pipeline');from joins import transform;data,rates,_,_=transform(json.load(sys.stdin),'2024-05-31');print(json.dumps(dict(data=data,rates=rates)))",
    ],
    { input: JSON.stringify(raw), encoding: 'utf8' },
  );
  expect(result.status, result.stderr).toBe(0);
  const expected = JSON.parse(result.stdout),
    actual = transformLive(raw, { endDate: '2024-05-31' });
  for (const key of [
    'flares',
    'sepEvents',
    'cmeForecasts',
    'surpriseArrivals',
    'windows',
  ])
    expect(actual[key]).toEqual(expected.data[key]);
  expect(actual.stats.flareSepRate).toEqual(expected.rates);
  expect(
    actual.sepEvents.find((row) => row.id === '2024-05-11T02:10:00-SEP-001'),
  ).toMatchObject({ countdownMin: 60, alertLagMin: 20, tier: 3 });
});
it('keeps MODEL/STEREO rows out of detections and selects latest linked flare and first forecasts', () => {
  const data = empty();
  data.FLR = [
    { flrID: 'old', beginTime: '2024-05-10T00:00Z', classType: 'C1.0' },
    { flrID: 'recent', beginTime: '2024-05-11T01:10Z', classType: 'X1.0' },
  ];
  const sep = (sepID, eventTime, name) => ({
    sepID,
    eventTime,
    instruments: [{ displayName: name }],
    linkedEvents: [{ activityID: 'old' }, { activityID: 'recent' }],
  });
  data.SEP = [
    sep('model', '2024-05-11T01:30Z', 'MODEL: REleASE:ACE'),
    sep('stereo', '2024-05-11T01:40Z', 'STEREO A: IMPACT'),
    sep('first', '2024-05-11T02:10Z', 'SOHO: COSTEP'),
    sep('channel', '2024-05-11T02:20Z', 'GOES-P: >100 MeV'),
  ];
  data.SEP[3].sentNotifications = [{ messageIssueTime: '2024-05-11T02:30Z' }];
  const result = transformLive(data, { endDate: '2024-05-31' });
  expect(result.sepEvents).toHaveLength(1);
  expect(result.sepEvents[0]).toMatchObject({
    tier: 3,
    flareId: 'recent',
    modelId: 'model',
    modelLeadMin: 40,
    alertLagMin: 20,
  });
  expect(result.sepEvents[0].instruments).not.toContain('MODEL: REleASE:ACE');
  expect(result.windows).toEqual([]);
});
it('plays and saves a live snapshot without registering it globally or changing the archive', () => {
  const data = transformLive(raw, { endDate: '2024-05-31' });
  expect(validLiveArchive(data)).toBe(true);
  const before = structuredClone(data),
    run = createRun({ seed: 'live-parity', mode: 'live', sourceData: data });
  const setup = getScrambleSetup(run);
  applyScrambleResult(run, {
    crewSaved: setup.crewSpawns.map((crew) => crew.id),
    crewExposed: [],
    itemsSaved: setup.itemSpawns.map((item) => item.id),
    timeLeft: 0,
  });
  act(run, { type: 'assignCrew', crewId: 'ria', task: 'science' });
  resolveShift(run);
  const backend = new Map(),
    provider = () => ({
      getItem: (key) => backend.get(key),
      setItem: (key, value) => backend.set(key, value),
    });
  createStorage(provider).saveMission(run, 'shelter');
  const resumed = createStorage(provider).mission();
  expect(resumed).not.toBeNull();
  expect(getShiftView(resumed.run)).toEqual(getShiftView(run));
  expect(data).toEqual(before);
  expect(() =>
    createRun({ seed: 'bad', mode: 'normal', sourceData: data }),
  ).toThrow();
});
it('keeps a missing live error distribution unknown, never a zero-width band', () => {
  const data = transformLive(raw, { endDate: '2024-05-31' });
  data.stats.cmeErrorHours = { median: null, p25: null, p75: null };
  const run = createRun({
    seed: 'missing-band',
    mode: 'live',
    sourceData: data,
  });
  const setup = getScrambleSetup(run);
  applyScrambleResult(run, {
    crewSaved: setup.crewSpawns.map((c) => c.id),
    crewExposed: [],
    itemsSaved: setup.itemSpawns.map((i) => i.id),
    timeLeft: 0,
  });
  run.now = Date.parse(data.cmeForecasts[0].issued);
  expect(getShiftView(run).forecastCards[0]).toMatchObject({
    bandHours: null,
    bandReason: 'unknown',
  });
});
it('rejects corrupt instrument or MODEL cache fields before a mission can use them', () => {
  const source = transformLive(raw, { endDate: '2024-05-31' });
  for (const mutation of [
    (row) => (row.instruments = null),
    (row) => {
      row.modelId = 'broken';
      row.modelTime = 'not-a-date';
      row.modelLeadMin = 5;
    },
  ]) {
    const data = structuredClone(source);
    mutation(data.sepEvents[0]);
    expect(validLiveArchive(data)).toBe(false);
  }
});
it('falls back to a validated cache or the archive for offline/quiet responses', async () => {
  const cached = transformLive(raw, { endDate: '2024-05-31' }),
    cache = { read: () => cached, write: () => {} };
  const offline = await loadLive({
    now: Date.parse('2024-06-01T00:00Z'),
    cache,
    fetcher: async () => {
      throw new Error('offline');
    },
  });
  expect(offline.status).toBe('cached-offline');
  const quiet = await loadLive({
    now: Date.parse('2024-06-01T00:00Z'),
    fetcher: async () => ({ ok: true, json: async () => [] }),
  });
  expect(quiet.status).toBe('archive-quiet');
  expect(quiet.data.meta.source).toBe('NASA/CCMC DONKI');
  let written;
  const fresh = await loadLive({
    now: Date.parse('2024-06-01T00:00Z'),
    cache: {
      read: () => null,
      write: (data) => {
        written = data;
      },
    },
    fetcher: async (url) => ({
      ok: true,
      json: async () => raw[url.split('/').at(-1).split('?')[0]] ?? [],
    }),
  });
  expect(fresh.status).toBe('fresh');
  expect(written).toEqual(fresh.data);
});
