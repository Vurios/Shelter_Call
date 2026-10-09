import showcase from '../../public/data/showcase.json' with { type: 'json' };
import { windowData } from '../core/data.js';
import { t } from '../i18n/index.js';
import { escape as e } from '../ui/shelter/view.js';

const windowId = showcase.find((row) => row.key === 'best_judge').windowId;
export const judgeSetup = Object.freeze({
  seed: 'shelter-call-judge-2024',
  mode: 'judge',
  difficulty: 'Cadet',
  crewIds: ['ria', 'dom', 'aiko', 'tunde'],
  windowId,
  classroom: false,
});

/** Presentation only: the tour uses ordinary controls and unchanged GAME rules. */
export function judgeGuide(stage, { compact = false } = {}) {
  const sep = windowData(windowId).sep;
  if (compact) return `<p class="judge-inline">${t('judge.short')}</p>`;
  const lines = {
    intro: 'judge.intro',
    scramble: 'judge.scramble',
    shelter: 'judge.shelter',
    ending: 'judge.ending',
    reveal: 'judge.reveal',
  };
  return `<aside class="judge-guide" aria-label="${t('Judge guide')}"><strong>${t('JUDGE TOUR · about 3 minutes')}</strong><p>${t(lines[stage])}</p>${stage === 'reveal' ? `<a href="#judge-closing">${t('Jump to the data audit')}</a>` : ''}<details><summary>${t('The verified case')}</summary><p>REAL · NASA DONKI · ${e(sep.id)}</p><p>${t('judge.timing', { onset: sep.onset, minutes: sep.countdownMin, alert: sep.alertTime })}</p><p>${t('judge.proxy')}</p></details></aside>`;
}

export function judgeClosing() {
  // Audited against data-pipeline/REPORT.md, fetched 2026-10-08. These are
  // archive-quality gates, not counts of events experienced by this mission.
  return `<section id="judge-closing" class="judge-closing"><h2>${t('Real records. Your call.')}</h2><p>${t('judge.stats')}</p><p>${t('judge.limits')}</p><a href="https://github.com/Vurios/Shelter_Call/blob/main/data-pipeline/REPORT.md">${t('Read the data audit')}</a></section>`;
}
