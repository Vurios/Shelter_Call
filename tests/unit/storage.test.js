import { describe, it, expect } from 'vitest';
import {
  createStorage,
  SAVE_KEY,
  validMission,
} from '../../src/app/storage.js';
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
  resolveShift,
  act,
} from '../../src/core/api.js';
function sheltered(options = {}) {
  const run = createRun({ seed: 'save-check', mode: 'judge', ...options });
  const setup = getScrambleSetup(run);
  applyScrambleResult(run, {
    itemsSaved: setup.itemSpawns.map((i) => i.id),
    crewSaved: run.crew.map((c) => c.id),
    crewExposed: [],
    timeLeft: 0,
  });
  return run;
}
function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
describe('optional browser persistence', () => {
  it('accepts ordinary seeded windows without changing the resupply RNG draw', () => {
    for (const difficulty of ['Cadet', 'Commander', 'Flight Director']) {
      const run = createRun({ seed: 'orbit-a', difficulty });
      applyScrambleResult(run, {
        itemsSaved: [],
        crewSaved: [],
        crewExposed: run.crew.map((c) => c.id),
        timeLeft: 0,
      });
      resolveShift(run);
      const backend = storage();
      createStorage(() => backend).saveMission(run, 'shelter');
      expect(createStorage(() => backend).mission()?.run).toEqual(run);
    }
  });
  it('resumes a pending real decision at the same cursor, then produces the same next shift', () => {
    const run = sheltered({ windowId: '2011-09-24T20:45:00-WINDOW-001' });
    act(run, { type: 'assignCrew', crewId: 'ria', task: 'science' });
    for (let i = 0; i < 20 && !run.interrupt; i++) {
      if (run.pendingEvent)
        act(run, {
          type: 'chooseEvent',
          eventId: run.pendingEvent.id,
          choice: 1,
        });
      resolveShift(run);
    }
    expect(run.interrupt).not.toBeNull();
    const backend = storage();
    createStorage(() => backend).saveMission(run, 'shelter', {
      slots: ['water-1', null, null, null, null, null, null, null],
      coachStep: 2,
      logs: [],
    });
    const restored = createStorage(() => backend).mission();
    expect(restored.run).toEqual(run);
    expect(restored.journal.coachStep).toBe(2);
    for (const mission of [run, restored.run]) {
      act(mission, { type: 'recallAll' });
      resolveShift(mission);
    }
    expect(restored.run).toEqual(run);
  });
  it('keeps playable session state and collections when storage throws', () => {
    const store = createStorage(() => {
      throw new Error('SecurityError');
    });
    const run = sheltered();
    store.saveMission(run, 'shelter');
    store.saveProgress({
      cards: [],
      endings: ['Mission Complete'],
      achievements: ['Full House'],
      historic: [],
      dailyWins: [],
    });
    expect(store.mission().run).toEqual(run);
    expect(store.progress().endings).toEqual(['Mission Complete']);
    expect(store.isBlocked()).toBe(true);
    store.clearMission();
    expect(store.mission()).toBeNull();
  });
  it('rejects damaged saves without crashing and sanitizes settings/progress', () => {
    const backend = storage();
    backend.setItem(SAVE_KEY, '{bad json');
    expect(createStorage(() => backend).mission()).toBeNull();
    const run = sheltered();
    for (const damage of [
      () => {
        run.crew[0].assignment = 'invented';
      },
      () => {
        run.rules.days = 900;
      },
      () => {
        run.wall = [{ id: 'fake', type: 'water', mass: 100, slots: 2 }];
      },
      () => {
        run.config.sick = null;
      },
    ]) {
      damage();
      expect(validMission({ version: 1, screen: 'shelter', run })).toBe(false);
    }
    backend.setItem(
      'shelter-call.settings.v1',
      JSON.stringify({
        language: 'unknown',
        volume: 9,
        textSize: 'tiny',
        sound: 'yes',
      }),
    );
    const store = createStorage(() => backend);
    expect(store.settings()).toMatchObject({
      language: 'en',
      volume: 1,
      textSize: 'normal',
      sound: false,
    });
    backend.setItem(
      'shelter-call.progress.v1',
      JSON.stringify({
        endings: ['Unknown', 'Mission Complete', 'Mission Complete'],
        cards: 'oops',
      }),
    );
    expect(store.progress()).toMatchObject({
      endings: ['Mission Complete'],
      cards: [],
    });
  });
  it('accepts complete terminal saves, rejects a premature reveal, and clears a save', () => {
    const run = sheltered();
    const backend = storage();
    const store = createStorage(() => backend);
    store.saveMission(run, 'reveal');
    expect(store.mission()).toBeNull();
    while (run.phase === 'shelter') {
      if (run.pendingEvent)
        act(run, {
          type: 'chooseEvent',
          eventId: run.pendingEvent.id,
          choice: 1,
        });
      else if (run.interrupt) act(run, { type: 'recallAll' });
      else resolveShift(run);
    }
    store.saveMission(run, 'reveal');
    expect(store.mission().run.phase).toBe('ending');
    store.clearMission();
    expect(createStorage(() => backend).mission()).toBeNull();
  });
});
