import { windowData, stats, HOUR } from './data.js';
import { has } from './rules.js';
export function forecasts(state) {
  if (!has(state, 'radio')) return [];
  const mara = state.crew.some(
    (c) => c.trait === 'Comms Officer' && c.status !== 'medevac',
  );
  return windowData(state.windowId)
    .cmeForecasts.filter((f) => Date.parse(f.issued) <= state.now)
    .map((f) => ({
      source: 'REAL',
      donkiId: f.id,
      issueHour: mara ? (Date.parse(f.issued) - state.now) / HOUR : null,
      arrivalInHours: (Date.parse(f.predicted) - state.now) / HOUR,
      bandHours:
        state.difficulty === 'Flight Director'
          ? null
          : [stats.cmeErrorHours.p25, stats.cmeErrorHours.p75],
      kpRange: mara ? f.kpRange : null,
    }));
}
export function messages(state) {
  if (!has(state, 'radio')) return [];
  const w = windowData(state.windowId);
  return [
    ...w.flares
      .filter((f) => Date.parse(f.begin) <= state.now)
      .map((f) => ({
        source: 'REAL',
        donkiId: f.id,
        hoursAgo: (state.now - Date.parse(f.begin)) / HOUR,
        text: `Flare ${f.class}.`,
        class: f.class,
        associationRate: stats.flareSepRate[f.class[0]] ?? null,
        hint:
          stats.flareSepRate[f.class[0]] == null
            ? `This archive has no particle-rate estimate for ${f.class[0]}-class flares.`
            : `About ${Math.round(stats.flareSepRate[f.class[0]] * 100)} in 100 ${f.class[0]}-class flares in this archive were linked to particles.`,
      })),
    ...w.sepEvents
      .filter((s) => s.alertTime && Date.parse(s.alertTime) <= state.now)
      .map((s) => ({
        source: 'REAL',
        donkiId: s.id,
        hoursAgo: (state.now - Date.parse(s.alertTime)) / HOUR,
        text: 'Particle alert received.',
      })),
  ];
}
