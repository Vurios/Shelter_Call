import { dailySetup, missionScore, encodeSeed } from './replay.js';

export function dailyAttempts(store) {
  const value = store.readExtra('daily-attempts');
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([date, row]) => {
      try {
        return (
          row &&
          row.code === encodeSeed(dailySetup(date)) &&
          ['started', 'complete'].includes(row.status) &&
          (row.status === 'started' ||
            (typeof row.share === 'string' && Number.isFinite(row.score)))
        );
      } catch {
        return false;
      }
    }),
  );
}
/** Claim before starting. Web Locks coordinates tabs; storage is optional. */
export async function claimDaily(
  store,
  date,
  lock = globalThis.navigator?.locks,
) {
  const claim = () => {
    const attempts = dailyAttempts(store);
    if (attempts[date]) return false;
    attempts[date] = { status: 'started', code: encodeSeed(dailySetup(date)) };
    store.writeExtra('daily-attempts', attempts);
    return true;
  };
  return lock ? lock.request(`shelter-call.daily.${date}`, claim) : claim();
}
export function completeDaily(store, date, reveal, share) {
  const attempts = dailyAttempts(store),
    row = attempts[date];
  if (!row || row.status === 'complete') return false;
  attempts[date] = {
    ...row,
    status: 'complete',
    score: missionScore(reveal),
    ending: reveal.ending,
    share,
  };
  store.writeExtra('daily-attempts', attempts);
  return true;
}
