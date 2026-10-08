import { HOUR } from './data.js';
import { draw } from './rng.js';
export function shield(state) {
  return Math.min(
    state.config.shieldMax,
    1 -
      Math.exp(
        -state.wall.reduce((n, i) => n + i.mass, 0) /
          state.config.shieldMassScale,
      ),
  );
}
/** Exact integration of GAME piecewise-constant half-shift decay, not mSv. */
export function integrate(state, from, to) {
  let total = 0;
  for (const hazard of state.hazards) {
    for (let age = 0; age < hazard.duration + 12; age++) {
      const start = hazard.time + age * 12 * HOUR;
      const overlap =
        Math.max(0, Math.min(to, start + 12 * HOUR) - Math.max(from, start)) /
        (12 * HOUR);
      if (overlap)
        total +=
          overlap *
          state.config.dose[hazard.tier] *
          2 ** -Math.max(0, age - hazard.duration + 1);
    }
  }
  return total;
}
export function expose(state, from, to) {
  const dose = integrate(state, from, to);
  if (!dose) return;
  const protection = shield(state);
  if (protection >= 0.9) state.flags.ironWall = true;
  for (const crew of state.crew.filter((c) => c.status !== 'medevac')) {
    const outside = crew.assignment !== 'shelter';
    crew.dose += dose * (outside ? 1 : 1 - protection);
    if (
      outside &&
      state.hazards.some(
        (h) =>
          h.tier === 3 &&
          from >= h.time &&
          from < h.time + h.duration * 12 * HOUR,
      )
    )
      state.flags.closeCall = true;
    if (crew.dose >= state.config.medevac * state.rules.tolerance) {
      crew.status = 'medevac';
      state.flags.doseEvac = true;
      if (!outside && protection < 0.9 && state.flags.wallEaten)
        state.flags.snack = true;
    } else
      crew.status =
        crew.dose >= state.config.sick * state.rules.tolerance
          ? 'rad-sick'
          : 'healthy';
    if (crew.trait === 'Rookie')
      crew.trait = ['Botanist', 'Engineer', 'Medic', 'Geologist'][
        Math.floor(draw(state) * 4)
      ];
  }
}
