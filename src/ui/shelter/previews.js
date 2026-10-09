import { escape, TASK_LABELS } from './view.js';
import { t } from '../../i18n/index.js';

const number = (value) => Number(value.toFixed(2));
const outputLabels = {
  food: 'Food',
  water: 'Water',
  power: 'Power',
  science: 'Science',
  randomItems: 'Random finds',
};
function outputs(estimate) {
  return (
    Object.entries(estimate)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${t(outputLabels[key])} +${number(value)}`)
      .join(' · ') || t('No supplies produced')
  );
}
/** Exact costs and conditional estimates are separate; neither resolves a future shift. */
export function renderPreviews(
  page,
  view,
  selection,
  plan,
  item,
  eventChoices = [],
  shiftStart = null,
) {
  eventChoices.forEach((choice, index) => {
    if (!choice.available) return;
    const changes = Object.entries(choice.changes)
      .filter(
        ([key, row]) =>
          ['power', 'morale', 'science', 'items', 'shield'].includes(key) &&
          row.delta !== 0,
      )
      .map(
        ([key, row]) =>
          `${t(key === 'items' ? 'Supplies' : key === 'shield' ? 'Shield' : (outputLabels[key] ?? 'Morale'))} ${row.delta > 0 ? '+' : ''}${number(row.delta * (key === 'shield' ? 100 : 1))}${key === 'shield' ? '%' : ''}`,
      );
    page
      .querySelector(`[data-choice="${index}"]`)
      ?.insertAdjacentHTML(
        'beforeend',
        `<small class="event-cost">GAME · ${changes.join(' · ')}${choice.repaired ? ` · ${t('Greenhouse repaired')}` : ''}</small>`,
      );
  });
  if (view.pendingEvent)
    page.querySelector('.journal-dialog h2')?.insertAdjacentHTML(
      'afterend',
      `<div class="event-crew" aria-hidden="true">${view.crew
        .filter((crew) => crew.status !== 'medevac')
        .map(
          (crew) =>
            `<img src="/assets/portraits/${crew.id}-${view.broken ? 'worried' : 'happy'}.svg" alt="">`,
        )
        .join('')}</div>`,
    );
  const selected = view.crew.find((crew) => crew.id === selection.crew);
  const worker = plan.crew.find((crew) => crew.id === selection.crew);
  const panel = page.querySelector('.crew-panel');
  if (selected) {
    const mood =
      selected.hunger || selected.thirst || selected.status !== 'healthy'
        ? 'tired'
        : view.morale < 3
          ? 'worried'
          : 'calm';
    const reaction =
      selected.status === 'medevac'
        ? 'A ride home means care and another chance.'
        : selected.hunger || selected.thirst
          ? 'A snack and a drink would help me work.'
          : selected.assignment === 'shelter'
            ? 'Tools down. We can plan from here.'
            : 'I have my task. Call if the plan changes.';
    panel
      .querySelector('.task-board')
      .insertAdjacentHTML(
        'beforebegin',
        `<div class="crew-detail"><img src="/assets/portraits/${selected.id}-${mood}.svg" alt=""><div><strong>${escape(selected.name)} · ${t(selected.trait)}</strong><p>${t(TASK_LABELS[selected.assignment])}</p><p>${t(selected.status === 'rad-sick' ? 'Needs a rest' : selected.status === 'medevac' ? 'Ride home needed' : selected.symptoms)}</p><p>${t('Hunger')} ${selected.hunger} · ${t('Thirst')} ${selected.thirst}</p><p>${selected.dose == null ? t('No meter: exact dose is hidden.') : `${t('GAME dose')}: ${number(selected.dose)}`}</p></div></div><p class="crew-reaction">“${t(reaction)}”</p>`,
      );
  }
  panel.insertAdjacentHTML(
    'beforeend',
    `<div class="known-preview"><strong>${t('Shift plan')} · GAME</strong><p>${t('Assignments can change until you finish the shift. Used supplies are spent now.')}</p>${worker ? `<p>${t('This crew')}: ${outputs(worker.estimate)}</p><p>${t('Stored task progress')}: ${number(worker.earnedWork)}${worker.workNeeded ? ` / ${worker.workNeeded}` : ''}</p>` : ''}<p>${t('Crew total')}: ${outputs(plan.estimate)}</p><small>${t('Estimate before meals and upkeep. Current conditions only; warnings and events can change the plan.')}</small>${plan.bolt ? `<p>BOLT: ${t('Power')} −${plan.bolt.powerCost}. ${t('Outside output varies with conditions.')}</p>` : ''}</div>`,
  );
  if (view.interrupt)
    page.querySelector('.journal-dialog .decision-buttons')?.insertAdjacentHTML(
      'beforebegin',
      `<div class="known-preview"><strong>${t('Stored task progress')}</strong>${plan.crew
        .filter((crew) => crew.outside)
        .map(
          (crew) =>
            `<p>${escape(view.crew.find((c) => c.id === crew.id)?.name)}: ${number(crew.earnedWork)} ${t('task credit retained')}</p>`,
        )
        .join(
          '',
        )}<small>${t('Recall preserves work already done. Only remaining outside work is interrupted.')}</small></div>`,
    );
  if (view.interrupt && shiftStart) {
    const earned = Object.entries(outputLabels)
      .filter(([key]) => key !== 'randomItems')
      .map(
        ([key, label]) =>
          `${t(label)} ${view[key] - shiftStart[key] >= 0 ? '+' : ''}${number(view[key] - shiftStart[key])}`,
      )
      .join(' · ');
    page
      .querySelector('.journal-dialog .known-preview')
      ?.insertAdjacentHTML(
        'afterbegin',
        `<p><strong>${t('Already added this shift')}</strong>: ${earned}</p>`,
      );
  }
  if (!item) return;
  const effect = (action) => {
    if (!action?.available)
      return escape(
        t(
          action?.reason ||
            'Unavailable until the current decision is finished.',
        ),
      );
    const shield = action.changes.shield;
    const changes = Object.entries(action.changes)
      .filter(
        ([key, row]) =>
          ['food', 'water', 'power', 'science', 'morale'].includes(key) &&
          row.delta !== 0,
      )
      .map(
        ([key, row]) =>
          `${t(outputLabels[key] ?? 'Morale')} ${row.delta > 0 ? '+' : ''}${number(row.delta)}`,
      );
    if (action.crew?.fedFood?.delta > 0)
      changes.push(`${t('Food credit')} +${number(action.crew.fedFood.delta)}`);
    if (action.crew?.fedWater?.delta > 0)
      changes.push(
        `${t('Water credit')} +${number(action.crew.fedWater.delta)}`,
      );
    if (action.crew?.dose?.delta)
      changes.push(`${t('GAME dose')} ${number(action.crew.dose.delta)}`);
    if (action.repaired) changes.push(t('Greenhouse repaired'));
    return `${changes.join(' · ')}${changes.length ? ' · ' : ''}${t('Shield')} ${Math.round(shield.before * 100)}% → ${Math.round(shield.after * 100)}%`;
  };
  page
    .querySelector('.item-tools')
    .insertAdjacentHTML(
      'beforeend',
      `<div class="known-preview"><strong>${t('Before you choose')} · GAME</strong><p>${t('Move')}: ${effect(item.move)}</p>${item.use ? `<p>${t('Use now')}: ${effect(item.use)}</p><small>${t('Using this item takes effect immediately. It cannot be undone.')}</small>` : ''}${item.location === 'wall' ? `<p>${t('Removing this item leaves a wall gap. Less shielding means more GAME exposure inside.')}</p>` : ''}</div>`,
    );
}
