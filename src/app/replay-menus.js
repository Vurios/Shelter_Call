import showcase from '../../public/data/showcase.json' with { type: 'json' };
import { windowData } from '../core/data.js';
import { t } from '../i18n/index.js';
import { escape as e } from '../ui/shelter/view.js';
import { dailySetup, utcDate, decodeSeed, isWin } from './replay.js';
import { dailyAttempts } from './daily.js';
import { loadLive } from '../data/live.js';

export function mountDaily({ shell, store, current, start, continueMission }) {
  const date = utcDate(),
    setup = dailySetup(date),
    attempt = dailyAttempts(store)[date];
  const { root, signal } = shell(
    'Daily Sun',
    `<p class="hero-line">${e(date)} UTC</p><p>${t('One shared Sun, map and four-person crew. One scored attempt each UTC day. Friend-code replays are practice.')}</p><p>${t('Daily Sun uses Commander rules for everyone.')}</p><p>${setup.crewIds.map((id) => id.toUpperCase()).join(' · ')}</p>${store.isBlocked() ? `<p role="status">${t('Daily scores stay in this tab because storage is unavailable.')}</p>` : ''}${attempt?.status === 'complete' ? `<h2>${t('Today’s result')}</h2><p>${t(attempt.ending)} · ${attempt.score} ${t('GAME points')}</p><textarea class="share-text" readonly aria-label="${t('Share result')}">${e(attempt.share)}</textarea><button data-share>${t('Share result')}</button>` : attempt ? `<p>${t('Your scored attempt has started. Continue the saved mission from Title.')}</p>${current?.run.dailyDate === date ? `<button data-resume>${t('Continue daily mission')}</button>` : ''}` : `<button data-daily>${t('Start today’s attempt')}</button>`}<p class="share-status" role="status"></p>`,
  );
  root
    .querySelector('[data-daily]')
    ?.addEventListener('click', () => start(setup), { signal });
  root
    .querySelector('[data-resume]')
    ?.addEventListener('click', continueMission, { signal });
  root
    .querySelector('[data-share]')
    ?.addEventListener('click', () => shareText(root, attempt.share), {
      signal,
    });
}
export function mountSeedCode({ shell, start }) {
  const { root, signal } = shell(
    'Play a friend’s Sun',
    `<p>${t('Paste a SHELTER CALL code. It recreates the window, map, crew and difficulty. Your choices can change the ending.')}</p><form class="seed-form"><label>${t('Seed code')}<textarea name="code" required maxlength="1000" placeholder="SC1.…"></textarea></label><button>${t('Play this code')}</button></form><p role="status" class="code-status"></p>`,
  );
  root.querySelector('form').addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      try {
        start(decodeSeed(event.currentTarget.elements.code.value));
      } catch {
        root.querySelector('.code-status').textContent = t(
          'That code is incomplete or damaged. Ask your friend to copy it again.',
        );
      }
    },
    { signal },
  );
}
export function mountHistoric({ shell, progress, start }) {
  const unlocked = progress.endings.some(isWin);
  const { root, signal } = shell(
    'Historic Storms',
    unlocked
      ? `<p>${t('Dates are shown up front here. These windows come from the verified showcase.')}</p><div class="historic-grid">${[
          ...new Map(showcase.map((row) => [row.windowId, row])).values(),
        ]
          .map((row) => {
            const data = windowData(row.windowId);
            return `<article><h2>${e(data.start.slice(0, 10))}</h2><p>${t('Linked flare-to-detection gap: {value} minutes.', { value: data.sep.countdownMin })}</p><p>${t('{count} issued forecasts in this window', { count: data.cmeForecasts.filter((f) => Date.parse(f.issued) >= Date.parse(data.start) && Date.parse(f.issued) < Date.parse(data.end)).length })}</p><p>${progress.historic.includes(row.windowId) ? t('Completed') : t('Still to discover')}</p><button data-historic="${e(row.windowId)}">${t('Play historic window')}</button></article>`;
          })
          .join('')}</div>`
      : `<p class="hero-line">${t('Reach a successful ending to unlock Historic Storms.')}</p>`,
  );
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('[data-historic]');
      if (button)
        start({
          seed: crypto.randomUUID(),
          mode: 'historic',
          windowId: button.dataset.historic,
          difficulty: 'Commander',
          crewIds: ['ria', 'dom', 'aiko', 'tunde'],
        });
    },
    { signal },
  );
}
export function mountLive({ shell, store, start }) {
  const { root, signal } = shell(
    'Live Sun',
    `<p>${t('Check the last 30 days of NASA DONKI records. Only complete verified windows can be played; otherwise use the cached Sun.')}</p><button data-live>${t('Check the Sun')}</button><p class="live-status" role="status"></p><div class="live-ready"></div>`,
  );
  root.querySelector('[data-live]').addEventListener(
    'click',
    async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      root.querySelector('.live-status').textContent = t(
        'Checking verified records…',
      );
      const result = await loadLive({
        signal,
        cache: {
          read: () => store.readExtra('live-source'),
          write: (data) => store.writeExtra('live-source', data),
        },
      });
      if (signal.aborted) return;
      const fresh = result.status === 'fresh';
      const cached = result.status.startsWith('cached');
      root.querySelector('.live-status').textContent = t(
        fresh
          ? 'LIVE: a complete recent window is ready.'
          : cached
            ? 'No fresh complete window. Your verified cached LIVE Sun is ready.'
            : 'No complete recent window or connection. The verified archived Sun is ready.',
      );
      root.querySelector('.live-ready').innerHTML =
        `<p>${fresh || cached ? 'LIVE' : t('ARCHIVE FALLBACK')} · ${e(result.data.meta.range?.join(' / ') ?? '')}</p><button data-live-play>${t('Play this Sun')}</button>`;
      root.querySelector('[data-live-play]').addEventListener(
        'click',
        () =>
          start({
            seed: crypto.randomUUID(),
            mode: fresh || cached ? 'live' : 'normal',
            ...(fresh || cached ? { sourceData: result.data } : {}),
            difficulty: 'Commander',
            crewIds: ['ria', 'dom', 'aiko', 'tunde'],
            liveStatus: result.status,
          }),
        { signal },
      );
      button.disabled = false;
    },
    { signal },
  );
}
export async function shareText(root, text, { copyOnly = false } = {}) {
  const status = root.querySelector('.share-status');
  try {
    if (navigator.share && !copyOnly)
      await navigator.share({ title: 'SHELTER CALL', text });
    else {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = t('Copied. Send it to a friend.');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    let field = root.querySelector('.share-text');
    if (!field) {
      field = document.createElement('textarea');
      field.className = 'share-text';
      field.readOnly = true;
      field.setAttribute('aria-label', t('Share result'));
      root.append(field);
    }
    field.value = text;
    field.focus();
    field.select();
    if (status) status.textContent = t('Copy the selected text to share.');
  }
}
