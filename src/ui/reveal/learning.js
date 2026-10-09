import { t } from '../../i18n/index.js';
import { escape as e } from '../shelter/view.js';

export const SCIENCE_NOTES = [
  'Earth records, lunar story. These near-Earth observations drive a fictional Moon mission, not a measured lunar arrival forecast.',
  'The countdown uses a retrospective flare-to-detection interval. It does not prove how much warning astronauts would have had.',
  'Kp describes magnetic activity at Earth, not lunar dose. A CME arrival does not guarantee a solar-particle event.',
  'Supply shielding is a GAME abstraction inspired by mass shielding. Eating does not remove all that mass from a spacecraft; our formula does not certify safety.',
  'Radiation is invisible. The storm shimmer is a symbolic warning. Hopping dust falls back down; it is not wind in a lunar atmosphere.',
  'AM and PM label work shifts, not a 24-hour lunar daylight cycle. Exposure points and recovery are GAME rules, not medical units.',
];

/** Post-mission reflection uses recorded calls; it never reconstructs unrecorded knowledge. */
export function decisionReflection(reveal) {
  const calls = reveal.timeline.playerCalls
    .filter((call) =>
      ['recallAll', 'keepWorking', 'consume', 'moveItem'].includes(call.type),
    )
    .slice(-3);
  return `<section class="decision-reflection"><h2>${t('Three calls to remember')}</h2><p>${t('A careful choice can have an unlucky outcome. A lucky outcome does not make a forecast certain.')}</p>${calls.length ? calls.map((call) => `<article><time>${e(call.utc)} UTC</time><dl><dt>${t('What you knew')}</dt><dd>${t(['recallAll', 'keepWorking'].includes(call.type) ? 'A warning paused the shift. Future arrival and future work were uncertain.' : 'You could see your supplies and current shielding. Future events were unknown.')}</dd><dt>${t('What you chose')}</dt><dd>${t(call.type)}${call.to ? ` · ${t(call.to)}` : ''}${call.itemId ? ` · ${e(call.itemId)}` : ''}</dd><dt>${t('What happened')}</dt><dd>${t(call.type === 'recallAll' ? 'Human crew returned inside for the remaining shift. Earned work stayed earned.' : call.type === 'keepWorking' ? 'Crew kept their assignments for the remaining shift.' : call.type === 'consume' ? 'One supply was spent immediately. Its location determined whether shielding also fell.' : 'The item changed location. Supplies in the wall count toward GAME shielding.')}</dd></dl></article>`).join('') : `<p>${t('Read your calls and the recorded events together below.')}</p>`}<p class="quiet-copy">${t('These notes explain recorded actions. The timeline below shows observations; it does not imply they were all known during play.')}</p></section>`;
}
