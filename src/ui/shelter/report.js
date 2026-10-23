import { escape } from './view.js';
import { t, phrase } from '../../i18n/index.js';

const RESOURCES = [
  ['food', 'Food'],
  ['water', 'Water'],
  ['power', 'Power'],
  ['science', 'Science'],
];
// Short original crew lines; chosen from known state, never from hidden records.
const TRAIT_LINES = {
  Botanist: 'Kamote and I are both leaning toward the lamp.',
  Engineer: 'Every bolt in this shelter has a name. Mostly Bolt.',
  Medic: 'Water, rest, and a buddy check. Doctor’s orders.',
  Geologist: 'I labeled three rocks today. They are all named Rocky.',
  'Comms Officer': 'Radio check. The Sun is chatty, so we listen.',
  'Rover Pilot': 'I parked the rover so straight it looks proud.',
  Chef: 'Tonight’s menu: food pack, with a side of food pack.',
  Rookie: 'I wrote “stay calm” in my notebook. Then I underlined it.',
};
function moment(before, after) {
  const crew = after.crew.filter((c) => c.status !== 'medevac');
  if (!crew.length) return null;
  const pick = (list) => list[after.shiftIndex % list.length];
  const hungry = crew.filter((c) => c.hunger || c.thirst);
  if (hungry.length)
    return [
      pick(hungry),
      'My tummy is louder than the radio. Supplies, please!',
    ];
  const sick = crew.filter((c) => c.status === 'rad-sick');
  if (sick.length)
    return [pick(sick), 'I will rest behind the wall for a bit.'];
  if (after.shield < before.shield)
    return [
      pick(crew),
      'There is a gap in the wall now. Let’s keep that in mind.',
    ];
  if (after.power <= 2)
    return [pick(crew), 'Lights are dim. Let’s save power where we can.'];
  if (after.plant > before.plant)
    return [pick(crew), 'Kamote grew a new leaf! Everyone, look!'];
  const back = crew.filter(
    (c) =>
      c.assignment === 'shelter' &&
      before.crew.find((b) => b.id === c.id)?.assignment !== 'shelter',
  );
  if (back.length)
    return [pick(back), 'Boots off, helmet on the hook. Good to be inside.'];
  const speaker = pick(crew);
  return [speaker, TRAIT_LINES[speaker.trait] ?? TRAIT_LINES.Rookie];
}
/** A dismissible journal note about the finished shift; it never blocks actions. */
export function shiftReport(before, after, start, logs) {
  const changes = RESOURCES.map(([key, label]) => {
    const delta = Number(
      (after[key] - (start?.[key] ?? before[key])).toFixed(2),
    );
    return `<li class="${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}"><img src="/assets/icons/${key}.svg" alt="">${t(label)} <strong>${delta > 0 ? '+' : ''}${delta}</strong></li>`;
  }).join('');
  const line = moment(before, after);
  const recent = logs
    .filter((row) => !row.text.startsWith('Shift complete'))
    .slice(-2)
    .map(
      (row) =>
        `<li>${row.source === 'REAL' ? '<b class="real-chip">REAL</b>' : ''}${escape(phrase(row.text))}</li>`,
    )
    .join('');
  return `<section class="shift-report" aria-labelledby="shift-report-heading"><p class="journal-eyebrow">${t('SHIFT REPORT · GAME')}</p><h2 id="shift-report-heading">${t('Twelve hours later…')}</h2><ul class="report-changes">${changes}</ul>${recent ? `<ul class="report-log">${recent}</ul>` : ''}${line ? `<p class="report-moment"><img src="/assets/portraits/${line[0].id}-${line[0].hunger || line[0].thirst || line[0].status !== 'healthy' ? 'tired' : 'happy'}.svg" alt=""><span><strong>${escape(line[0].name)}:</strong> “${t(line[1])}”</span></p>` : ''}<button type="button" data-action="report-close" data-key="report-close">${t('Back to the shelter')}</button></section>`;
}
