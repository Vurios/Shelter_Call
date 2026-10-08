import { allRealIds, collectibleRealIds, windows } from './data.js';
/** Pure achievement ledger. Caller owns persistence and supplies daily UTC date. */
export function collect(
  previous,
  reveal,
  { mode = 'normal', windowId = null, dailyDate = null } = {},
) {
  const result = structuredClone(
    previous ?? {
      cards: [],
      endings: [],
      achievements: [],
      historic: [],
      dailyWins: [],
    },
  );
  const unique = (values) => [...new Set(values)].sort();
  result.cards = unique(
    result.cards.concat(
      reveal.timeline.reality
        .map((e) => e.donkiId)
        .filter((id) => allRealIds.includes(id)),
    ),
  );
  result.endings = unique(result.endings.concat(reveal.ending));
  result.achievements = unique(result.achievements.concat(reveal.achievements));
  const win = !['Early Ride Home', 'Snack Attack', 'Lights Out'].includes(
    reveal.ending,
  );
  if (win && mode === 'historic' && windows.includes(windowId))
    result.historic = unique(result.historic.concat(windowId));
  if (
    win &&
    mode === 'daily' &&
    dailyDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(dailyDate) &&
    !Number.isNaN(Date.parse(dailyDate))
  )
    result.dailyWins = unique(result.dailyWins.concat(dailyDate));
  let streak = 0,
    last = null;
  for (const date of result.dailyWins) {
    const time = Date.parse(date);
    streak = last !== null && time - last === 86400000 ? streak + 1 : 1;
    last = time;
    if (streak >= 7) result.achievements.push('Sun Streak');
  }
  if (result.historic.length >= 5) result.achievements.push('Historian');
  const collected = result.cards.filter((id) =>
    collectibleRealIds.includes(id),
  ).length;
  for (const percent of [25, 50, 100])
    if (collected / collectibleRealIds.length >= percent / 100)
      result.achievements.push(`Almanac ${percent}%`);
  result.achievements = unique(result.achievements);
  return result;
}
