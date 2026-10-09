import { it, expect } from 'vitest';
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
  getShiftView,
  act,
  resolveShift,
} from '../../src/core/api.js';
import { timeline, windowData } from '../../src/core/data.js';
import { validMission } from '../../src/app/storage.js';
it('uses recorded MODEL IDs/times for sensor warnings, never a future detection ID', () => {
  const run = createRun({
    seed: 'sensor-proof',
    difficulty: 'Cadet',
    windowId: '2017-09-04T23:52:00-WINDOW-001',
  });
  const setup = getScrambleSetup(run);
  applyScrambleResult(run, {
    crewSaved: setup.crewSpawns.map((c) => c.id),
    crewExposed: [],
    itemsSaved: setup.itemSpawns
      .filter((item) => item.type === 'electron')
      .map((item) => item.id),
    timeLeft: 0,
  });
  const warnings = getShiftView(run).electronWarnings;
  expect(warnings.length).toBeGreaterThan(0);
  expect(warnings[0].donkiId).toBe('2017-09-04T22:56:00-SEP-001');
  expect(warnings[0].utc).toBe('2017-09-04T22:56Z');
  expect(warnings[0].text).toContain('prediction is not a detection');
  const sensor = run.pantry.find((item) => item.type === 'electron');
  act(run, { type: 'moveItem', itemId: sensor.id, to: 'wall' });
  expect(getShiftView(run).electronWarnings).toEqual(warnings);
  run.wall = [];
  expect(getShiftView(run).electronWarnings).toEqual([]);
});
it('preserves the original event cursor when resuming a prompt 7 checkpoint', () => {
  const run = createRun({
    seed: 'old-checkpoint',
    windowId: '2023-07-16T06:35:00-WINDOW-001',
  });
  const setup = getScrambleSetup(run);
  applyScrambleResult(run, {
    crewSaved: setup.crewSpawns.map((c) => c.id),
    crewExposed: [],
    itemsSaved: [],
    timeLeft: 0,
  });
  const original = timeline(run.windowId, undefined, false);
  run.cursor = original.filter((event) => event.time <= run.now).length;
  delete run.sensorVersion;
  const saved = { version: 1, screen: 'shelter', run, journal: {} };
  expect(validMission(saved)).toBe(true);
  expect(run.sensorVersion).toBe(0);
  expect(
    timeline(run.windowId, undefined, false).some(
      (event) => event.kind === 'model',
    ),
  ).toBe(false);
  expect(timeline(run.windowId).some((event) => event.kind === 'model')).toBe(
    true,
  );
  resolveShift(run);
  expect(run.cursor).toBe(
    original.filter((event) => event.time < run.now).length,
  );
  expect(windowData(run.windowId).sep).toBeDefined();
});
