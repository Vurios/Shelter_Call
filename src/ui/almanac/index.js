import archive from '../../../public/data/episodes.json' with { type: 'json' };
import { collectibleRealIds } from '../../core/data.js';
import { t } from '../../i18n/index.js';
import { escape as e } from '../shelter/view.js';
import './style.css';

/** Each fact is a template of recorded fields. Rarity is a labelled GAME category. */
export function sourceCards(data = archive) {
  const cards = [];
  for (const row of data.flares)
    cards.push({
      id: row.id,
      kind: 'flare',
      date: row.begin,
      class: row.class,
      tier: row.class.startsWith('X') ? 3 : row.class.startsWith('M') ? 2 : 1,
      fact: ['Flare class {value}.', { value: row.class }],
    });
  for (const row of data.sepEvents) {
    cards.push({
      id: row.id,
      kind: 'particles',
      date: row.onset,
      class: row.instruments.join(' / '),
      tier: row.tier,
      fact:
        row.countdownMin == null
          ? ['Detected at {date}.', { date: row.onset }]
          : [
              'Linked flare-to-detection gap: {value} minutes.',
              { value: row.countdownMin },
            ],
    });
    if (row.modelId && row.modelTime)
      cards.push({
        id: row.modelId,
        kind: 'model',
        date: row.modelTime,
        class: 'MODEL',
        tier: row.tier,
        fact: [
          'Recorded MODEL lead: {value} minutes. Prediction, not detection.',
          { value: row.modelLeadMin },
        ],
      });
  }
  for (const row of data.cmeForecasts)
    cards.push({
      id: row.id,
      kind: 'forecast',
      date: row.issued,
      class: 'CME',
      tier: 1,
      forecast: row.predicted,
      actual: row.actual,
      outcome: row.outcome,
      fact:
        row.errorH == null
          ? ['No linked Earth shock in this verified record.', {}]
          : [
              'Observed minus predicted arrival: {value} hours.',
              { value: row.errorH },
            ],
    });
  for (const row of data.surpriseArrivals)
    cards.push({
      id: row.id,
      kind: 'shock',
      date: row.time,
      class: 'IPS',
      tier: 1,
      fact: ['Recorded Earth shock at {date}.', { date: row.time }],
    });
  return [...new Map(cards.map((card) => [card.id, card])).values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}
export function mountAlmanac({ root, signal, progress, liveCards = [] }) {
  const known = new Set(progress.cards),
    reachable = new Set(collectibleRealIds);
  const cards = sourceCards().filter((card) => reachable.has(card.id));
  for (const card of liveCards)
    if (!cards.some((row) => row.id === card.id)) cards.push(card);
  const collected = cards.filter(
    (card) => known.has(card.id) || card.live,
  ).length;
  root.insertAdjacentHTML(
    'beforeend',
    `<p class="hero-line">${t('{count} of {total} archived records collected', { count: progress.cards.filter((id) => reachable.has(id)).length, total: reachable.size })} · ${((progress.cards.filter((id) => reachable.has(id)).length / reachable.size) * 100).toFixed(1)}%</p><progress class="almanac-progress" max="${reachable.size}" value="${progress.cards.filter((id) => reachable.has(id)).length}" aria-label="${t('Sun Almanac progress')}"></progress><p>${t('Rarity is a GAME label based on recorded tier/class. MODEL cards are predictions, not detections.')}</p><form class="almanac-filter"><label>${t('Record type')}<select name="kind"><option value="all">${t('All types')}</option>${['flare', 'particles', 'forecast', 'shock', 'model'].map((kind) => `<option value="${kind}">${t(kind)}</option>`).join('')}</select></label><label class="check-setting"><input type="checkbox" name="collected" checked>${t('Collected cards only')} (${collected})</label></form><p class="almanac-count" role="status"></p><div class="almanac-grid"></div><div class="app-actions almanac-pages"><button data-page="-1">${t('Previous cards')}</button><button data-page="1">${t('Next cards')}</button></div>`,
  );
  let page = 0;
  function render() {
    const form = root.querySelector('.almanac-filter');
    const filtered = cards.filter(
      (card) =>
        (form.elements.kind.value === 'all' ||
          card.kind === form.elements.kind.value) &&
        (!form.elements.collected.checked || known.has(card.id) || card.live),
    );
    const last = Math.max(0, Math.ceil(filtered.length / 24) - 1);
    page = Math.max(0, Math.min(last, page));
    root.querySelector('.almanac-count').textContent = t(
      'Page {page} of {total}',
      { page: page + 1, total: last + 1 },
    );
    root.querySelector('.almanac-grid').innerHTML =
      filtered
        .slice(page * 24, (page + 1) * 24)
        .map((card) => {
          const collected = known.has(card.id) || card.live;
          if (!collected)
            return `<article class="almanac-card locked"><span>${t(card.kind)}</span><h2>${t('Still to discover')}</h2><p>◇ ${t('Play a mission to collect this record.')}</p></article>`;
          const rarity =
            ['Common', 'Uncommon', 'Rare'][card.tier - 1] ?? 'Common';
          return `<article class="almanac-card rarity-${card.tier}" data-card="${e(card.id)}"><button class="card-flip" aria-expanded="false"><span class="almanac-art" aria-hidden="true"><img src="/assets/icons/${{ flare: 'solar', particles: 'dose', forecast: 'radio', shock: 'shield', model: 'dosimeter' }[card.kind]}.svg" alt=""></span><span class="source-label">${card.live ? 'LIVE / ' : ''}REAL · ${t(card.kind)}</span><span>${t(rarity)} · GAME</span><strong>${e(card.class)}</strong><time>${e(card.date)} UTC</time><span>${t('Flip card')}</span></button><div class="card-fact" hidden><p>${t(...card.fact)}</p>${card.forecast ? `<p>${t('Predicted UTC')}: ${e(card.forecast)}<br>${t('Observed UTC')}: ${card.actual ? e(card.actual) : t('No matched arrival in the archive')}</p>` : ''}<code>${e(card.id)}</code><p>${t('Source: NASA/CCMC DONKI')}</p></div></article>`;
        })
        .join('') ||
      `<p>${t('No cards here yet. Your next mission can add some.')}</p>`;
    root.querySelector('[data-page="-1"]').disabled = page === 0;
    root.querySelector('[data-page="1"]').disabled = page === last;
  }
  root.querySelector('.almanac-filter').addEventListener(
    'change',
    () => {
      page = 0;
      render();
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (event) => {
      const pageButton = event.target.closest('[data-page]');
      if (pageButton) {
        page += Number(pageButton.dataset.page);
        render();
        root
          .querySelector('.almanac-count')
          .scrollIntoView({ block: 'nearest' });
      }
      const flip = event.target.closest('.card-flip');
      if (flip) {
        const open = flip.getAttribute('aria-expanded') !== 'true';
        flip.setAttribute('aria-expanded', String(open));
        flip.nextElementSibling.hidden = !open;
        flip.closest('article').classList.toggle('flipped', open);
      }
    },
    { signal },
  );
  render();
}
