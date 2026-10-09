import { windowData, stats, HOUR } from './data.js';
import { has } from './rules.js';
export function forecasts(state) {
  if (!has(state, 'radio')) return [];
  const mara = state.crew.some(
    (c) => c.trait === 'Comms Officer' && c.status !== 'medevac',
  );
  return windowData(state.windowId, state.sourceData)
    .cmeForecasts.filter((f) => Date.parse(f.issued) <= state.now)
    .map((f) => ({
      source: 'REAL',
      donkiId: f.id,
      utc: f.predicted,
      issuedUtc: mara ? f.issued : null,
      issueHour: mara ? (Date.parse(f.issued) - state.now) / HOUR : null,
      arrivalInHours: (Date.parse(f.predicted) - state.now) / HOUR,
      bandHours:
        state.difficulty === 'Flight Director'
          ? null
          : [
              (state.sourceData?.stats ?? stats).cmeErrorHours.p25,
              (state.sourceData?.stats ?? stats).cmeErrorHours.p75,
            ],
      kpRange: mara ? f.kpRange : null,
    }));
}
export function messages(state) {
  if (!has(state, 'radio')) return [];
  const w = windowData(state.windowId, state.sourceData);
  return [
    ...w.flares
      .filter((f) => Date.parse(f.begin) <= state.now)
      .map((f) => ({
        source: 'REAL',
        donkiId: f.id,
        utc: f.begin,
        hoursAgo: (state.now - Date.parse(f.begin)) / HOUR,
        text: `Flare ${f.class}.`,
        class: f.class,
        associationRate:
          (state.sourceData?.stats ?? stats).flareSepRate[f.class[0]] ?? null,
        hint:
          (state.sourceData?.stats ?? stats).flareSepRate[f.class[0]] == null
            ? `This archive has no particle-rate estimate for ${f.class[0]}-class flares.`
            : `About ${Math.round((state.sourceData?.stats ?? stats).flareSepRate[f.class[0]] * 100)} in 100 ${f.class[0]}-class flares in this archive were linked to particles.`,
      })),
    ...w.sepEvents
      .filter((s) => s.alertTime && Date.parse(s.alertTime) <= state.now)
      .map((s) => ({
        source: 'REAL',
        donkiId: s.id,
        utc: s.alertTime,
        hoursAgo: (state.now - Date.parse(s.alertTime)) / HOUR,
        text: 'Particle alert received.',
      })),
  ];
}

/** A source-backed MODEL hint, never an observed particle arrival or a guarantee. */
export function electronWarnings(state) {
  if (!has(state, 'electron')) return [];
  return windowData(state.windowId, state.sourceData)
    .sepEvents.filter((row) => {
      const warning = Date.parse(row.modelTime);
      return (
        row.modelLeadMin > 0 &&
        row.modelId &&
        warning <= state.now &&
        state.now < Date.parse(row.onset)
      );
    })
    .map((row) => ({
      source: 'REAL',
      donkiId: row.modelId,
      utc: row.modelTime,
      modelLeadMin: row.modelLeadMin,
      text: 'MODEL early warning. Particles may follow; a prediction is not a detection.',
    }));
}
