import episodes from '../../public/data/episodes.json' with { type: 'json' };
import { DIFFICULTIES } from './config.js';
// Read-only module input; exports return new arrays, never the archived objects.
export const HOUR = 3600000;
export const windows = episodes.windows.map((w) => w.id);
export const stats = structuredClone(episodes.stats);
export const allRealIds = Object.freeze(
  [
    ...new Set(
      ['flares', 'sepEvents', 'cmeForecasts', 'surpriseArrivals']
        .flatMap((key) => episodes[key].map((e) => e.id))
        .concat(episodes.sepEvents.map((row) => row.modelId).filter(Boolean)),
    ),
  ].sort(),
);
const tables = Object.fromEntries(
  ['windows', 'flares', 'sepEvents', 'cmeForecasts', 'surpriseArrivals'].map(
    (key) => [key, new Map(episodes[key].map((row) => [row.id, row]))],
  ),
);
Object.freeze(windows);
const windowCache = new Map();
const timelineCache = new Map();
const liveCaches = new WeakMap();
const archiveCache = { tables, windowCache, timelineCache };
function cacheFor(source) {
  if (!source) return archiveCache;
  if (!liveCaches.has(source))
    liveCaches.set(source, {
      tables: Object.fromEntries(
        [
          'windows',
          'flares',
          'sepEvents',
          'cmeForecasts',
          'surpriseArrivals',
        ].map((key) => [key, new Map(source[key].map((row) => [row.id, row]))]),
      ),
      windowCache: new Map(),
      timelineCache: new Map(),
    });
  return liveCaches.get(source);
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
freeze(stats);
export function windowData(id, source) {
  const { tables, windowCache } = cacheFor(source);
  if (windowCache.has(id)) return windowCache.get(id);
  const w = tables.windows.get(id);
  if (!w) throw new Error('Unknown real window.');
  const value = {
    ...w,
    sep: tables.sepEvents.get(w.sepId),
    ...Object.fromEntries(
      Object.entries(w.refs).map(([key, ids]) => [
        key,
        ids.map((ref) => tables[key].get(ref)),
      ]),
    ),
  };
  const result = freeze(source ? structuredClone(value) : value);
  windowCache.set(id, result);
  return result;
}
export function timeline(id, source, withModels = true) {
  const { timelineCache } = cacheFor(source);
  const cacheKey = `${id}:${withModels}`;
  if (timelineCache.has(cacheKey)) return timelineCache.get(cacheKey);
  const w = windowData(id, source);
  const events = [];
  const add = (row, kind, utc) => {
    if (utc)
      events.push({
        source: 'REAL',
        donkiId: row.id,
        utc,
        time: Date.parse(utc),
        kind,
        row,
      });
  };
  w.flares.forEach((row) => add(row, 'flare', row.begin));
  w.sepEvents.forEach((row) => {
    if (withModels && row.modelLeadMin > 0 && row.modelId && row.modelTime)
      add({ ...row, id: row.modelId }, 'model', row.modelTime);
    add(row, 'particles', row.onset);
    add(row, 'alert', row.alertTime);
  });
  w.cmeForecasts.forEach((row) => {
    add(row, 'forecast', row.issued);
    add(row, 'shock', row.actual);
  });
  w.surpriseArrivals.forEach((row) =>
    add(row, 'shock', row.time ?? row.arrival),
  );
  const result = freeze(
    [
      ...new Map(
        events.map((event) => [
          `${event.kind}:${event.donkiId}:${event.utc}`,
          event,
        ]),
      ).values(),
    ].sort(
      (a, b) =>
        a.time - b.time ||
        a.kind.localeCompare(b.kind) ||
        a.donkiId.localeCompare(b.donkiId),
    ),
  );
  timelineCache.set(cacheKey, result);
  return result;
}

// The shipped archive also contains late context rows beyond any legal mission end.
// Collection percentages count only records reachable by at least one mission.
const longestMissionDays = Math.max(
  ...Object.values(DIFFICULTIES).map((d) => d.days),
);
export const collectibleRealIds = Object.freeze(
  [
    ...new Set(
      windows.flatMap((id) => {
        const latestEnd =
          (Math.floor(Date.parse(windowData(id).start) / (24 * HOUR)) +
            longestMissionDays) *
          24 *
          HOUR;
        return timeline(id)
          .filter((e) => e.time <= latestEnd)
          .map((e) => e.donkiId);
      }),
    ),
  ].sort(),
);
