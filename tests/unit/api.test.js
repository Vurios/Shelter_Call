import { describe, expect, it } from 'vitest';
import {
  act,
  applyScrambleResult,
  buildReveal,
  checkEnding,
  createRun,
  getScrambleSetup,
  getShiftView,
  resolveShift,
} from '../../src/core/api.js';
import { MOCK_RUN } from '../../src/core/mock-run.js';

function shelter(seed = 'test') {
  const state = createRun({ seed });
  return applyScrambleResult(state, {
    itemsSaved: state.items.map((item) => item.id),
    crewSaved: state.crew.map((crew) => crew.id),
    crewExposed: [],
    timeLeft: 0,
  });
}

describe('prompt 1 mock API contract', () => {
  it('provides the requested fixture and deterministic detached spawn tables', () => {
    const a = createRun({ seed: 'moon' });
    const b = createRun({ seed: 'moon' });
    expect(getScrambleSetup(a)).toEqual(getScrambleSetup(b));
    expect(MOCK_RUN.flares).toHaveLength(2);
    expect(MOCK_RUN.cmeForecasts).toHaveLength(1);
    expect(MOCK_RUN.sepEvents).toHaveLength(1);
    expect(a.crew).toHaveLength(4);
    expect(a.items).toHaveLength(6);
    getScrambleSetup(a).crewSpawns[0].name = 'Changed';
    expect(b.crew[0].name).toBe('Ria');
  });
  it('moves and consumes wall supplies, hides forecasts without a radio', () => {
    const state = shelter();
    state.shiftIndex = 2;
    expect(getShiftView(state).forecastCards).toHaveLength(1);
    act(state, { type: 'moveItem', itemId: 'water-1', to: 'wall' });
    const shield = getShiftView(state).shield;
    expect(shield).toBeGreaterThan(0);
    act(state, { type: 'consume', itemId: 'water-1' });
    expect(getShiftView(state).shield).toBeLessThan(shield);
    act(state, { type: 'useItem', itemId: 'radio-1' });
    expect(getShiftView(state).forecastCards).toEqual([]);
    expect(getShiftView(state).blind).toBe(true);
  });
  it('supports assignment, recall, shift resolution, ending and three reveal lanes', () => {
    const state = shelter();
    act(state, { type: 'assignCrew', crewId: 'ria', task: 'greenhouse' });
    act(state, { type: 'keepWorking' });
    expect(state.crew[0].assignment).toBe('greenhouse');
    act(state, { type: 'recallAll' });
    expect(state.crew[0].assignment).toBe('shelter');
    expect(checkEnding(state)).toBeNull();
    expect(resolveShift(state).every((event) => event.source === 'GAME')).toBe(
      true,
    );
    for (let index = 1; index < 24; index += 1)
      act(state, { type: 'endShift' });
    expect(checkEnding(state)).toBe('Mission Complete');
    expect(Object.keys(buildReveal(state).timeline)).toEqual([
      'playerCalls',
      'nasaForecast',
      'reality',
    ]);
    expect(buildReveal(state).approximations[0]).toContain('invented');
    expect(() => resolveShift(state)).toThrow();
  });
});
