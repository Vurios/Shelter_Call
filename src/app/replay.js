import { createRng } from '../core/rng.js';
import { CREW, DIFFICULTIES } from '../core/config.js';
import { windows } from '../core/data.js';
import { t } from '../i18n/index.js';

export const ACHIEVEMENTS = [
  'Outguessed the Model',
  'Trusted the Forecast',
  'Blind Luck',
  'Full House',
  'Kamote Kingdom',
  'Iron Wall',
  'Sun Streak',
  'Historian',
  'Almanac 25%',
  'Almanac 50%',
  'Almanac 100%',
  'Flight Director win',
];
export const isWin = (ending) =>
  !['Early Ride Home', 'Snack Attack', 'Lights Out'].includes(ending);
export function utcDate(time = Date.now()) {
  return new Date(time).toISOString().slice(0, 10);
}
function validDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    utcDate(Date.parse(date)) === date
  );
}
/** Same date means the same map, window and crew for everyone. No core clock. */
export function dailySetup(date) {
  if (!validDate(date)) throw new Error('Invalid UTC date.');
  const seed = `daily:${date}:v1`;
  const random = createRng(seed);
  const pool = CREW.map((crew) => crew.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    seed,
    mode: 'daily',
    dailyDate: date,
    difficulty: 'Commander',
    crewIds: pool.slice(0, 4),
    windowId: windows[Math.floor(random() * windows.length)],
  };
}
function checksum(text) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(text))
    hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return hash.toString(36);
}
export function encodeSeed(setup) {
  if (setup.sourceData) return null; // Live snapshots cannot fit a short friend code.
  const text = JSON.stringify([
    1,
    String(setup.seed),
    setup.windowId,
    setup.difficulty,
    setup.crewIds ?? setup.crew.map((crew) => crew.id),
    setup.windowDraw ?? setup.consumeWindowDraw ?? false,
  ]);
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `SC1.${encoded}.${checksum(text)}`;
}
export function decodeSeed(code) {
  if (typeof code !== 'string' || code.length > 1000)
    throw new Error('Invalid seed code.');
  try {
    const [prefix, payload, check, extra] = code.trim().split('.');
    if (prefix !== 'SC1' || extra !== undefined || !/^[\w-]+$/.test(payload))
      throw new Error();
    const text = new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(
        atob(payload.replaceAll('-', '+').replaceAll('_', '/')),
        (character) => character.charCodeAt(0),
      ),
    );
    if (checksum(text) !== check) throw new Error();
    const [
      version,
      seed,
      windowId,
      difficulty,
      crewIds,
      consumeWindowDraw = false,
    ] = JSON.parse(text);
    if (
      version !== 1 ||
      typeof seed !== 'string' ||
      !seed.length ||
      seed.length > 64 ||
      !windows.includes(windowId) ||
      typeof consumeWindowDraw !== 'boolean' ||
      !Object.hasOwn(DIFFICULTIES, difficulty) ||
      !Array.isArray(crewIds) ||
      crewIds.length !== 4 ||
      new Set(crewIds).size !== 4 ||
      crewIds.some((id) => !CREW.some((crew) => crew.id === id))
    )
      throw new Error();
    return {
      seed,
      windowId,
      difficulty,
      crewIds,
      consumeWindowDraw,
      mode: 'normal',
    };
  } catch {
    throw new Error('Invalid seed code.');
  }
}
/** Same fixed GAME score as tools/bots.mjs, never a scientific risk score. */
export function missionScore(reveal) {
  return Math.round(
    (isWin(reveal.ending) ? 100 : 0) +
      25 * reveal.stats.crewHome +
      Math.min(100, reveal.stats.science * 2) -
      reveal.stats.totalDose * 0.2,
  );
}
export function shareResult(reveal, setup) {
  const code = encodeSeed(setup);
  const saved =
    setup.crew?.filter((crew) => crew.status !== 'medevac').length ??
    reveal.stats.crewHome;
  const crewGrid = Array.from({ length: 4 }, (_, index) =>
    index < saved ? '🟩' : '🟨',
  ).join('');
  return `SHELTER CALL${setup.dailyDate ? ` / ${setup.dailyDate} UTC` : ''}\n${crewGrid}\n${t(reveal.ending)} / ${missionScore(reveal)} ${t('GAME points')}\n${code ?? t('LIVE source snapshot')}\nhttps://shelter-call.pages.dev/`;
}
