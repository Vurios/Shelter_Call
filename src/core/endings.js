export const ENDINGS = [
  'Mission Complete',
  'Science Legend',
  'Kamote Kingdom',
  'Early Ride Home',
  'Lights Out',
  'Snack Attack',
  'Forecast Whisperer',
  'Blind Luck',
  'Skeleton Crew',
  'Close Call',
];
export function ending(state) {
  if (state.phase !== 'ending') return null;
  if (state.flags.snack) return 'Snack Attack';
  if (state.flags.powerEvac) return 'Lights Out';
  if (state.crew.some((c) => c.status === 'medevac')) return 'Early Ride Home';
  if (state.scrambleResult.crewSaved.length === 1) return 'Skeleton Crew';
  if (!state.flags.eva && state.plant >= 3) return 'Kamote Kingdom';
  if (!state.flags.radioEver) return 'Blind Luck';
  if (state.flags.outguessed >= 3) return 'Forecast Whisperer';
  if (state.flags.closeCall) return 'Close Call';
  if (
    state.science >= state.rules.goal &&
    state.crew.every((c) => c.status === 'healthy')
  )
    return 'Science Legend';
  return 'Mission Complete';
}
export function achievements(state) {
  const list = [];
  if (state.scrambleResult?.crewSaved.length === 4) list.push('Full House');
  if (state.flags.outguessed) list.push('Outguessed the Model');
  if (state.flags.trusted) list.push('Trusted the Forecast');
  if (state.flags.ironWall) list.push('Iron Wall');
  const result = ending(state);
  if (
    result &&
    !['Snack Attack', 'Lights Out', 'Early Ride Home'].includes(result)
  ) {
    if (!state.flags.radioEver) list.push('Blind Luck');
    if (result === 'Kamote Kingdom') list.push(result);
    if (state.difficulty === 'Flight Director')
      list.push('Flight Director win');
  }
  // Cross-run Almanac, Historian and Daily streaks require collection state (prompt 8).
  return list;
}
