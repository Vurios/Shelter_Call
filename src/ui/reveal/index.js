import { t, getLanguage } from '../../i18n/index.js';
import { escape as e } from '../shelter/view.js';
import { timelineRows } from './timeline.js';
import './style.css';

export const endingSlug = (name) => name.toLowerCase().replaceAll(' ', '-');
export function endingCard(name) {
  return `<article class="ending-card"><img src="/assets/endings/${endingSlug(name)}.svg" alt="${e(t(name))}"><div><p class="eyebrow">${t('YOUR ENDING · GAME')}</p><h1 tabindex="-1">${t(name)}</h1><p>${t(`epilogue.${endingSlug(name)}`)}</p></div></article>`;
}
const utc = (time) => new Date(time).toISOString().replace('.000Z', 'Z');
export function mountReveal({
  reveal,
  crewIds,
  onUnlock,
  onExit,
  classroom = false,
}) {
  const app = document.querySelector('#app');
  const rows = timelineRows(reveal, crewIds);
  const start = Math.min(
    Date.parse(reveal.dates.start),
    ...rows.filter((row) => row.lane !== 1).map((row) => row.time),
  );
  const end = Date.parse(reveal.dates.end);
  const x = (time) =>
    170 +
    Math.max(0, Math.min(1, (time - start) / Math.max(1, end - start))) * 690;
  const date = new Intl.DateTimeFormat(
    getLanguage() === 'fil' ? 'fil-PH' : 'en',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  ).format(new Date(reveal.dates.start));
  app.innerHTML = `<main class="app-screen reveal-screen"><header class="app-header"><span>SHELTER CALL / ${t('REVEAL')}</span><button data-exit>${t('Title')}</button></header><div class="date-reveal"><p>${t('The Sun was real. Your calls were yours.')}</p><h1 tabindex="-1">${t('This was {date}.', { date })}</h1><p>${e(utc(Date.parse(reveal.dates.start)))} → ${e(utc(end))}</p></div><section class="timeline-panel"><h2>${t('Three stories. One Sun.')}</h2><p>${t('Scrub the journal. Triangles are forecasts, circles are your calls, squares are real events. Dashed rings mark a missed forecast or crew caught outside.')}</p><div class="timeline-scroll"><svg class="reveal-timeline" viewBox="0 0 900 240" role="img" aria-label="${t('Your calls, NASA forecasts and observed events on one UTC timeline')}"><defs><pattern id="forecast-pattern" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#101d2a" stroke-width="1"/></pattern></defs>${['YOUR CALLS', 'NASA FORECAST', 'WHAT HAPPENED'].map((label, lane) => `<text x="8" y="${48 + lane * 70}">${t(label)}</text><path d="M170 ${43 + lane * 70}H860" stroke="#526879"/>`).join('')}${rows
    .map((row) => {
      const px = x(row.time),
        py = 43 + row.lane * 70;
      const shape =
        row.lane === 0
          ? `<circle cx="${px}" cy="${py}" r="5" fill="#67bbe0"/>`
          : row.lane === 1
            ? `<path d="M${px} ${py - 8}l-7 14h14z" fill="#edb96f" stroke="#101d2a"/>`
            : `<rect x="${px - 4}" y="${py - 4}" width="8" height="8" fill="#86cda1"/>`;
      return `${shape}${row.missed || row.caught ? `<circle cx="${px}" cy="${py}" r="11" fill="none" stroke="#fff2d5" stroke-dasharray="3 3" stroke-width="2"/>` : ''}`;
    })
    .join(
      '',
    )}<path id="scrub-cursor" d="M${x(start)} 15V204" stroke="#fff2d5" stroke-width="2"/><text x="170" y="231">${e(utc(start).slice(0, 16))}</text><text x="860" y="231" text-anchor="end">${e(utc(end).slice(0, 16))}</text></svg></div><label class="scrub-label">${t('Journal time (UTC)')}<input id="reveal-scrub" type="range" min="0" max="1000" value="0" step="1" aria-describedby="scrub-readout"></label><p id="scrub-readout" role="status" aria-live="polite"></p><div id="selected-event" class="selected-event"></div><details class="timeline-entries"><summary>${t('Read every timeline entry')} (${rows.length})</summary><div>${rows.map((row, index) => `<button data-row="${index}">${e(utc(row.time))} · ${t(['YOUR CALLS', 'NASA FORECAST', 'WHAT HAPPENED'][row.lane])} · ${t(row.type)}</button>`).join('')}</div></details></section><section class="reveal-stats" aria-label="${t('Mission stats')}">${[
    ['Crew home', reveal.stats.crewHome],
    ['Science', Number(reveal.stats.science.toFixed(1))],
    ['Total GAME dose', Number(reveal.stats.totalDose.toFixed(1))],
    ['Wall supplies eaten', reveal.stats.wallSuppliesConsumed],
    ['Shifts', reveal.stats.shifts],
    [
      'Outguessed / trusted',
      `${reveal.stats.outguessed} / ${reveal.stats.trusted}`,
    ],
  ]
    .map(
      ([label, value]) =>
        `<div><strong>${value}</strong><span>${t(label)}</span></div>`,
    )
    .join(
      '',
    )}</section>${endingCard(reveal.ending)}<details class="real-panel"><summary>${t("What's real?")}</summary><h2>${t('REAL · NASA DONKI records')}</h2><p>${t('NASA near-Earth records are used as a timing proxy for the Moon. This is not a radiation safety tool.')}</p><ul>${reveal.timeline.reality.map((row) => `<li><strong>REAL · ${t(row.kind)}</strong> <time>${e(row.utc)} UTC</time><code>${e(row.donkiId)}</code></li>`).join('')}${reveal.timeline.nasaForecast.map((row) => `<li><strong>REAL · ${t('forecast')}</strong><code>${e(row.donkiId)}</code><span>${t('Issued UTC')}: ${e(row.issued)}</span><span>${t('Predicted UTC')}: ${e(row.predicted)}</span><span>${t('Observed UTC')}: ${row.actual ? e(row.actual) : t('No matched arrival in the archive')}</span><small>${t('An arrival after your journal closed is archive context, not an event you experienced.')}</small></li>`).join('')}</ul><h2>${t('GAME · approximations')}</h2><ul>${reveal.approximations.map((line) => `<li>${t(line)}</li>`).join('')}</ul></details><div class="app-actions"><button data-unlock>${t('Open Almanac unlocks')} →</button><button data-exit>${t('Title')}</button></div></main>`;
  const root = app.querySelector('main');
  if (classroom)
    root.insertAdjacentHTML(
      'beforeend',
      `<section class="classroom-questions"><h2>${t('Talk about your Sun')}</h2><ol><li>${t('Which recorded clue changed your shelter call?')}</li><li>${t('How did a forecast differ from the observed arrival?')}</li><li>${t('What happened when supplies were used from the wall? Which parts were GAME rules?')}</li></ol></section>`,
    );
  if (!reveal.timeline.nasaForecast.length) {
    const note = document.createElement('p');
    note.className = 'quiet-copy';
    note.textContent = t(
      'Your journal closed before a CME forecast was issued. No future forecast is shown.',
    );
    root.querySelector('.timeline-panel').append(note);
  }
  const lifecycle = new AbortController();
  const slider = root.querySelector('#reveal-scrub');
  function describe(row) {
    if (!row) return t('The journal begins here.');
    if (row.lane === 0) {
      const call = row.call;
      return `<strong>GAME · ${t(call.type)}</strong><p>${call.crewId ? e(call.crewId.toUpperCase()) + ' · ' : ''}${call.task ? t(call.task) : call.to ? t(call.to) : ''}</p><time>${e(call.utc)} UTC</time>`;
    }
    if (row.lane === 1)
      return `<strong>REAL · ${t('forecast')}</strong><p>${t(row.comparison)}</p><p>${t('Predicted UTC')}: ${e(row.forecast.predicted)}<br>${t('Observed UTC')}: ${row.forecast.actual ? e(row.forecast.actual) : t('No matched arrival in the archive')}</p><code>${e(row.forecast.id)}</code>${row.missed ? `<p>${t('Forecast miss: more than 12 hours early/late, or no matched arrival. GAME comparison; archive hit classification uses ±30 hours.')}</p>` : ''}${row.time < start || row.time > end ? `<p>${t('Prediction lies outside this journal; marker sits at its edge.')}</p>` : ''}`;
    return `<strong>REAL · ${t(row.type)}</strong><p>${row.caught ? t('Crew outside: caught by this event in the GAME rules.') : ['particles', 'shock'].includes(row.type) ? t('Crew behind the wall at this event.') : ''}</p><time>${e(row.event.utc)} UTC</time><code>${e(row.event.donkiId)}</code>`;
  }
  function scrub(index = null) {
    const time = start + (Number(slider.value) / 1000) * (end - start);
    root.querySelector('#scrub-cursor').setAttribute('d', `M${x(time)} 15V204`);
    const row =
      index == null
        ? rows.reduce(
            (best, current) =>
              !best ||
              Math.abs(current.time - time) < Math.abs(best.time - time)
                ? current
                : best,
            null,
          )
        : rows[index];
    root.querySelector('#scrub-readout').textContent =
      `${utc(time)} · ${t('Nearest entry')}: ${row ? t(row.type) : t('None')}`;
    slider.setAttribute('aria-valuetext', utc(time));
    root.querySelector('#selected-event').innerHTML = describe(row);
  }
  slider.addEventListener('input', () => scrub(), { signal: lifecycle.signal });
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('button');
      if (button?.hasAttribute('data-row')) {
        const index = Number(button.dataset.row);
        slider.value = Math.round(
          Math.max(
            0,
            Math.min(1, (rows[index].time - start) / Math.max(1, end - start)),
          ) * 1000,
        );
        scrub(index);
        root
          .querySelector('#selected-event')
          .scrollIntoView({ block: 'nearest' });
      }
      if (button?.hasAttribute('data-unlock')) onUnlock();
      if (button?.hasAttribute('data-exit')) onExit();
    },
    { signal: lifecycle.signal },
  );
  scrub();
  root.querySelector('h1').focus();
  return () => lifecycle.abort();
}
