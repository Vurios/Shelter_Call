import { it, expect } from 'vitest';
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
  getShiftView,
  resolveShift,
  act,
} from '../../src/core/api.js';
import { createStorage } from '../../src/app/storage.js';
it('pauses issued forecasts and resumes the identical source time and pending shift', () => {
  const run = createRun({
    seed: 'classroom-proof',
    mode: 'judge',
    difficulty: 'Cadet',
    classroom: true,
  });
  const setup = getScrambleSetup(run);
  applyScrambleResult(run, {
    crewSaved: setup.crewSpawns.map((c) => c.id),
    crewExposed: [],
    itemsSaved: setup.itemSpawns.map((i) => i.id),
    timeLeft: 0,
  });
  for (
    let n = 0;
    n < 20 && run.interrupt?.kind !== 'forecast' && run.phase === 'shelter';
    n++
  ) {
    if (run.pendingEvent) act(run, { type: 'chooseEvent', choice: 1 });
    if (run.interrupt) act(run, { type: 'keepWorking' });
    resolveShift(run);
  }
  expect(run.interrupt?.kind).toBe('forecast');
  const view = getShiftView(run),
    card = view.forecastCards.find(
      (row) => row.donkiId === view.interrupt.donkiId,
    );
  expect(card).toBeTruthy();
  const now = run.now,
    cursor = run.cursor,
    index = run.shiftIndex;
  const rows = new Map(),
    store = createStorage(() => ({
      getItem: (key) => rows.get(key),
      setItem: (key, value) => rows.set(key, value),
    }));
  store.saveMission(run, 'shelter');
  const restored = store.mission().run;
  expect(restored.now).toBe(now);
  expect(restored.cursor).toBe(cursor);
  expect(restored.interrupt).toEqual(run.interrupt);
  act(restored, { type: 'keepWorking' });
  expect(restored.now).toBe(now);
  expect(restored.shiftIndex).toBe(index);
  resolveShift(restored);
  expect(restored.cursor).toBeGreaterThanOrEqual(cursor);
});
