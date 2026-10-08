import {
  createRun,
  applyScrambleResult,
  act,
  getShiftView,
  checkEnding,
  buildReveal,
  getScrambleSetup,
} from '../src/core/api.js';
import { CONFIG } from '../src/core/config.js';
import { createRng } from '../src/core/rng.js';
export const BOTS = [
  'AlwaysShelter',
  'NeverShelter',
  'TrustForecast',
  'Cautious',
  'Greedy',
  'Random',
];
export function policy(view, bot, random) {
  const forecast = view.forecastCards.some((f) => {
    const band = f.bandHours ?? [0, 0];
    return f.arrivalInHours + band[0] <= 12 && f.arrivalInHours + band[1] >= 0;
  });
  const flare = view.radioMessages.some(
    (m) =>
      m.class &&
      m.hoursAgo <= CONFIG.flareMemoryHours &&
      m.class.startsWith('X'),
  );
  const sick = view.crew.some(
    (c) => c.status === 'rad-sick' || (c.dose !== null && c.dose >= 18),
  );
  if (bot === 'AlwaysShelter') return true;
  if (bot === 'TrustForecast')
    return (
      forecast ||
      flare ||
      view.radioMessages.some(
        (m) => !m.class && m.hoursAgo <= CONFIG.alertMemoryHours,
      )
    );
  if (bot === 'Cautious')
    return (
      forecast ||
      view.radioMessages.some(
        (m) =>
          m.class &&
          m.hoursAgo <= CONFIG.flareMemoryHours &&
          ['M', 'X'].includes(m.class[0]),
      ) ||
      sick ||
      view.shiftIndex < 6
    );
  if (bot === 'Greedy') return false;
  if (bot === 'Random') return random() < 0.5;
  return false;
}
export function runBot({
  seed,
  difficulty = 'Commander',
  bot = 'TrustForecast',
  omit = null,
  config = null,
  skeleton = false,
}) {
  const state = createRun({ seed, difficulty });
  if (config) {
    state.config = { ...state.config, ...config };
    let food = 0,
      water = 0;
    state.items = state.items.filter((i) =>
      i.type === 'food'
        ? ++food <= state.config.initialFood
        : i.type === 'water'
          ? ++water <= state.config.initialWater
          : true,
    );
  }
  const random = createRng(`${seed}:bot`);
  // GAME proxy for a successful multi-trip scramble; paired ablations remove one instance.
  applyScrambleResult(state, {
    itemsSaved: state.items
      .filter(
        (i) => i.id !== state.items.find((item) => item.type === omit)?.id,
      )
      .map((i) => i.id),
    crewSaved: state.crew.slice(0, skeleton ? 1 : 4).map((c) => c.id),
    crewExposed: state.crew.slice(skeleton ? 1 : 4).map((c) => c.id),
    timeLeft: 0,
  });
  let decisions = 0;
  while (state.phase === 'shelter') {
    if (++decisions > 3000) throw new Error('Decision loop failed to advance.');
    const view = getShiftView(state);
    if (view.pendingEvent) {
      act(state, {
        type: 'chooseEvent',
        eventId: view.pendingEvent.id,
        choice: bot === 'Random' ? Math.floor(random() * 2) : 1,
      });
      continue;
    }
    if (view.interrupt) {
      const recall =
        bot === 'AlwaysShelter' ||
        (bot === 'Cautious' &&
          (view.interrupt.kind === 'particles' ||
            ['M', 'X'].includes(view.interrupt.class?.[0]))) ||
        (bot === 'TrustForecast' && view.interrupt.class?.startsWith('X')) ||
        (bot === 'Random' && random() < 0.5);
      act(state, { type: recall ? 'recallAll' : 'keepWorking' });
      act(state, { type: 'endShift' });
      continue;
    }
    if (!state.shift) {
      const all = view.wall.concat(view.pantry);
      const wanted = all
        .slice()
        .sort((a, b) => b.mass - a.mass || a.id.localeCompare(b.id))
        .slice(0, 8);
      for (const item of view.wall.filter(
        (i) => !wanted.some((w) => w.id === i.id),
      ))
        act(state, { type: 'moveItem', itemId: item.id, to: 'pantry' });
      for (const item of wanted.filter(
        (i) => !view.wall.some((w) => w.id === i.id),
      ))
        act(state, { type: 'moveItem', itemId: item.id, to: 'wall' });
      const med = all.find((i) => i.type === 'med');
      if (med && view.crew.some((c) => c.status === 'rad-sick'))
        act(state, { type: 'useItem', itemId: med.id });
      const battery = all.find((i) => i.type === 'battery');
      if (battery && view.power < 4)
        act(state, { type: 'useItem', itemId: battery.id });
      const repair = all.find((i) => i.type === 'repair');
      if (repair && view.broken)
        act(state, { type: 'useItem', itemId: repair.id });
      const safe = policy(view, bot, random);
      for (let index = 0; index < view.crew.length; index++) {
        const crew = view.crew[index];
        let task = 'science';
        if (bot === 'Random')
          task = ['science', 'drill', 'greenhouse', 'solar', 'salvage'][
            Math.floor(random() * 5)
          ];
        else if (view.power < 5) task = index === 1 ? 'solar' : 'science';
        else if (bot === 'Greedy') task = 'science';
        else if (view.water < 12) task = 'drill';
        else if (view.food < 12 && all.some((i) => i.type === 'seeds'))
          task = 'greenhouse';
        act(state, {
          type: 'assignCrew',
          crewId: crew.id,
          task: safe ? 'shelter' : task,
        });
      }
      if (view.boltTask !== null)
        act(state, {
          type: 'assignCrew',
          crewId: 'bolt',
          task:
            bot === 'AlwaysShelter' || view.power < 6
              ? 'shelter'
              : view.water < 12
                ? 'drill'
                : view.food < 12
                  ? 'greenhouse'
                  : 'science',
        });
    }
    act(state, { type: 'endShift' });
  }
  const reveal = buildReveal(state);
  const ending = checkEnding(state);
  const win = !['Early Ride Home', 'Snack Attack', 'Lights Out'].includes(
    ending,
  );
  // Fixed GAME score, chosen before tuning.
  const score =
    (win ? 100 : 0) +
    25 * reveal.stats.crewHome +
    Math.min(100, reveal.stats.science * 2) -
    reveal.stats.totalDose * 0.2;
  return {
    win,
    ending,
    score,
    ...reveal.stats,
    seconds: getScrambleSetup(state).seconds,
  };
}
