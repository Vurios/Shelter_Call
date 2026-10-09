import { createRun, buildReveal } from '../core/api.js';
import { CREW } from '../core/config.js';
import { ENDINGS } from '../core/endings.js';
import { collect } from '../core/collections.js';
import { createStorage } from './storage.js';
import { t, setLanguage } from '../i18n/index.js';
import { escape as e } from '../ui/shelter/view.js';
import { endingCard, endingSlug, mountReveal } from '../ui/reveal/index.js';
import { createAudio } from '../audio/index.js';
import { ACHIEVEMENTS, encodeSeed, shareResult } from './replay.js';
import { claimDaily, completeDaily } from './daily.js';
import {
  mountDaily,
  mountSeedCode,
  mountHistoric,
  mountLive,
  shareText,
} from './replay-menus.js';
import { mountAlmanac, sourceCards } from '../ui/almanac/index.js';
import { validLiveArchive } from '../data/live.js';
import { judgeSetup, judgeGuide, judgeClosing } from './judge.js';
import '../ui/styles/app.css';
import '../ui/styles/feedback.css';

const store = createStorage();
const route = new URLSearchParams(location.search);
let settings = store.settings();
let progress = store.progress();
let current = store.mission();
let disposeScreen = () => {};
let screenGeneration = 0;
let appStarted = false;
let difficulty = current?.run.difficulty ?? 'Commander';
let crewIds = current?.run.crew.map((crew) => crew.id) ?? [
  'ria',
  'dom',
  'aiko',
  'tunde',
];
const newSeed = () => crypto.randomUUID();
export function applySettings() {
  setLanguage(settings.language);
  document.documentElement.dataset.textSize =
    settings.classroom || current?.run.classroom
      ? 'largest'
      : settings.textSize;
  document.documentElement.dataset.motion = settings.motion;
}
export const getSettings = () => ({ ...settings });
const missionSettings = () =>
  current?.run.mode === 'judge' ? { ...settings, tutorial: false } : settings;
function leave() {
  disposeScreen();
  disposeScreen = () => {};
  screenGeneration++;
}
function save(screen = current?.screen, journal = current?.journal ?? {}) {
  if (!current) return;
  current.screen = screen;
  current.journal = { ...current.journal, ...journal };
  store.saveMission(current.run, screen, current.journal);
}
function sourceBadge(root) {
  if (!current || (current.run.mode !== 'live' && !current.run.liveStatus))
    return;
  const badge = document.createElement('p');
  badge.className = 'mission-source';
  badge.textContent =
    current.run.mode === 'live' ? 'LIVE / NASA DONKI' : t('ARCHIVE FALLBACK');
  const scrambleHeader = root.querySelector('.scramble-header > div');
  if (scrambleHeader) scrambleHeader.append(badge);
  else root.querySelector('header, h1')?.after(badge);
}
function shell(title, content, { focus = true } = {}) {
  leave();
  document.querySelector('#app').innerHTML =
    `<main class="app-screen"><header class="app-header"><span>SHELTER CALL / ${t('MOON JOURNAL')}</span><button data-nav="title">${t('Title')}</button></header><h1 tabindex="-1">${t(title)}</h1>${content}</main>`;
  const root = document.querySelector('.app-screen');
  const lifecycle = new AbortController();
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('[data-nav]');
      if (button) menu(button.dataset.nav);
    },
    { signal: lifecycle.signal },
  );
  disposeScreen = () => lifecycle.abort();
  if (focus) root.querySelector('h1').focus();
  window.scrollTo(0, 0);
  return { root, signal: lifecycle.signal };
}
function title() {
  const { root, signal } = shell(
    'SHELTER CALL',
    `<div class="title-hero"><img class="title-outpost" src="/assets/icon-512.png" alt=""><div><p class="hero-line">${t('A warm shelter. A real Sun. Your call.')}</p><p>${t('Gather your crew. Build a wall from supplies. Read verified NASA records and choose when to go outside.')}</p></div></div><div class="app-actions title-primary"><button data-play>${t('Play')}</button>${current ? `<button data-continue>${t('Continue mission')} · ${t(current.run.difficulty)}</button>` : ''}</div><label class="difficulty-choice">${t('Difficulty')}<select id="difficulty">${['Cadet', 'Commander', 'Flight Director'].map((name) => `<option value="${name}" ${difficulty === name ? 'selected' : ''}>${t(name)}</option>`).join('')}</select></label><p id="difficulty-hint" class="quiet-copy"></p><nav class="menu-grid" aria-label="${t('Main menu')}">${[
      ['daily', 'Daily Sun'],
      ['almanac', 'Sun Almanac'],
      ['endings', 'Endings'],
      ['how', 'How it works'],
      ['settings', 'Settings'],
      ['credits', 'Credits'],
      ['seed', 'Play a friend’s Sun'],
      ['historic', 'Historic Storms'],
      ['live', 'Live Sun'],
      ['classroom', 'Classroom mode'],
    ]
      .map(([id, label]) => `<button data-nav="${id}">${t(label)}</button>`)
      .join(
        '',
      )}</nav><div class="title-tools"><button data-practice>${t('Practice again')}</button><button data-music aria-pressed="false">${t('Play title music')}</button><a href="/?gallery=1">${t('Open the art & sound journal')}</a></div><p class="quiet-copy">${t('REAL records. GAME survival rules. No one dies; an early ride home brings care.')}</p>${store.isBlocked() ? `<p role="status">${t('Storage is unavailable. You can play; this tab keeps your progress until it closes.')}</p>` : ''}`,
  );
  root.classList.add('game-title');
  root.querySelector('.app-header button').remove();
  const updateHint = () => {
    root.querySelector('#difficulty-hint').textContent = t(
      `difficulty.${difficulty}`,
    );
  };
  updateHint();
  root.querySelector('#difficulty').addEventListener(
    'change',
    (event) => {
      difficulty = event.target.value;
      updateHint();
    },
    { signal },
  );
  root.querySelector('[data-play]').addEventListener(
    'click',
    () => {
      if (current?.run.phase === 'shelter' || current?.run.phase === 'scramble')
        confirmReplace();
      else draft();
    },
    { signal },
  );
  root
    .querySelector('[data-continue]')
    ?.addEventListener('click', resume, { signal });
  root
    .querySelector('[data-practice]')
    .addEventListener('click', () => practice(title), { signal });
  const audio = createAudio();
  audio.setSettings({ master: settings.volume });
  const oldDispose = disposeScreen;
  disposeScreen = () => {
    oldDispose();
    void audio.dispose();
  };
  const button = root.querySelector('[data-music]');
  button.addEventListener(
    'click',
    async () => {
      try {
        await audio.unlock();
        if (signal.aborted) return;
        const playing = audio.getStatus().theme === 'title';
        audio.setTheme(playing ? null : 'title');
        button.setAttribute('aria-pressed', String(!playing));
        button.textContent = t(
          playing ? 'Play title music' : 'Stop title music',
        );
      } catch {
        if (!signal.aborted) button.textContent = t('Sound unavailable');
      }
    },
    { signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        audio.stopAll();
        button.setAttribute('aria-pressed', 'false');
        button.textContent = t('Play title music');
      }
    },
    { signal },
  );
}
function confirmReplace(next = draft) {
  const { root, signal } = shell(
    'Start a new mission?',
    `<p>${t('Your current mission will be replaced. Your collected endings stay safe.')}</p><div class="app-actions"><button data-new>${t('Start new mission')}</button><button data-continue>${t('Continue current mission')}</button></div>`,
  );
  root
    .querySelector('[data-new]')
    .addEventListener('click', () => next(), { signal });
  root
    .querySelector('[data-continue]')
    .addEventListener('click', resume, { signal });
}
function draft() {
  if (difficulty === 'Cadet') {
    crewIds = ['ria', 'dom', 'aiko', 'tunde'];
    return briefing();
  }
  const selected = new Set(crewIds);
  const { root, signal } = shell(
    'Pick your four',
    `<p>${t('Four friends. Eight useful talents. Tap a card to add or remove it.')}</p><p class="draft-count" role="status"></p><div class="draft-grid">${CREW.map((crew) => `<button data-draft="${crew.id}" aria-pressed="${selected.has(crew.id)}"><img src="/assets/portraits/${crew.id}-calm.svg" alt=""><strong>${crew.name}</strong><span>${t(crew.trait)}</span><small>${t(`trait.${crew.id}`)}</small></button>`).join('')}</div><div class="app-actions"><button data-briefing>${t('Meet at the hatch')} →</button></div>`,
  );
  function update() {
    root.querySelector('.draft-count').textContent = t('{count} of 4 chosen', {
      count: selected.size,
    });
    root.querySelector('[data-briefing]').disabled = selected.size !== 4;
    root.querySelectorAll('[data-draft]').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(selected.has(button.dataset.draft)),
      );
      button.disabled =
        !selected.has(button.dataset.draft) && selected.size === 4;
    });
  }
  update();
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('[data-draft]');
      if (button) {
        if (selected.has(button.dataset.draft))
          selected.delete(button.dataset.draft);
        else if (selected.size < 4) selected.add(button.dataset.draft);
        update();
      }
    },
    { signal },
  );
  root.querySelector('[data-briefing]').addEventListener(
    'click',
    () => {
      crewIds = [...selected];
      briefing();
    },
    { signal },
  );
}
function briefing(setup) {
  current = {
    run: createRun({
      seed: route.get('seed') || newSeed(),
      difficulty,
      crewIds,
      classroom: settings.classroom,
      ...(setup ?? {}),
    }),
    screen: 'scramble',
    journal: {},
  };
  current.run.dailyDate = setup?.dailyDate ?? null;
  current.run.liveStatus = setup?.liveStatus ?? null;
  save();
  const { root, signal } = shell(
    'One rule: the Sun is real.',
    `<div class="briefing-art"><img src="/assets/icons/solar.svg" alt=""><span>→</span><img src="/assets/icons/shelter.svg" alt=""></div><p class="hero-line">${t('The records are real. The survival rules are a GAME.')}</p><ol class="briefing-steps"><li>${t('Find crew and supplies. Return to the hatch to save them.')}</li><li>${t('In the journal, assign tasks and put supplies in your wall.')}</li><li>${t('Read the radio. Recall crew when you choose. Eat your wall carefully!')}</li></ol><p class="quiet-copy" id="briefing-count"></p><div class="app-actions"><button data-start>${t('Skip briefing · let’s go')}</button><button data-skip-tutorial>${t('Skip practice and coaching')}</button></div>`,
  );
  let seconds = 15;
  sourceBadge(root);
  const update = () => {
    root.querySelector('#briefing-count').textContent = t(
      'Starting in {seconds} seconds',
      { seconds },
    );
  };
  const start = () =>
    settings.tutorial ? practice(() => scramble()) : scramble();
  const timer = setInterval(() => {
    if (document.hidden) return;
    seconds--;
    update();
    if (seconds <= 0) start();
  }, 1000);
  const old = disposeScreen;
  disposeScreen = () => {
    old();
    clearInterval(timer);
  };
  update();
  root
    .querySelector('[data-start]')
    .addEventListener('click', start, { signal });
  root.querySelector('[data-skip-tutorial]').addEventListener(
    'click',
    () => {
      settings.tutorial = false;
      store.saveSettings(settings);
      scramble();
    },
    { signal },
  );
}
async function practice(next) {
  leave();
  const generation = screenGeneration;
  document.querySelector('#app').innerHTML =
    `<p class="loading-gallery" role="status">${t('Opening practice…')}</p>`;
  const { mountScramble } = await import('../scenes/scramble/index.js');
  if (generation !== screenGeneration) return;
  const run = createRun({ seed: 'practice-map', difficulty: 'Cadet' });
  disposeScreen = mountScramble({
    run,
    practice: true,
    autoStart: true,
    settings,
    onExit: next,
    onComplete: next,
  });
}
async function scramble() {
  leave();
  save('scramble', {});
  const generation = screenGeneration;
  document.querySelector('#app').innerHTML =
    `<p class="loading-gallery" role="status">${t('Opening the lunar outpost…')}</p>`;
  try {
    const { mountScramble } = await import('../scenes/scramble/index.js');
    if (generation !== screenGeneration) return;
    disposeScreen = mountScramble({
      run: current.run,
      autoStart: true,
      settings: missionSettings(),
      onExit: title,
      onSave: () => save('shelter'),
      onComplete: () => shelter(),
    });
    sourceBadge(document.querySelector('.scramble-screen'));
    if (current.run.mode === 'judge')
      document
        .querySelector('.scramble-header')
        .insertAdjacentHTML(
          'afterend',
          judgeGuide('scramble', { compact: true }),
        );
  } catch {
    errorScreen(scramble);
  }
}
async function shelter() {
  leave();
  save('shelter');
  const generation = screenGeneration;
  document.querySelector('#app').innerHTML =
    `<p class="loading-gallery" role="status">${t('Opening the crew journal…')}</p>`;
  try {
    const { mountShelter } = await import('../ui/shelter/index.js');
    if (generation !== screenGeneration) return;
    disposeScreen = mountShelter({
      run: current.run,
      settings: missionSettings(),
      journal: current.journal,
      onExit: title,
      onReplay: playAgain,
      onSave: (journal) =>
        save(current.run.phase === 'ending' ? 'ending' : 'shelter', journal),
      onComplete: ending,
    });
  } catch {
    errorScreen(shelter);
  }
}
function ending() {
  const reveal = buildReveal(current.run);
  const liveCollection = store.readExtra('live-collection');
  const liveIds = Array.isArray(liveCollection?.ids) ? liveCollection.ids : [];
  const missionIds = [
    ...new Set(reveal.timeline.reality.map((row) => row.donkiId)),
  ];
  current.journal.newCards = Array.isArray(current.journal.newCards)
    ? current.journal.newCards.filter((id) => missionIds.includes(id))
    : missionIds.filter(
        (id) => !progress.cards.includes(id) && !liveIds.includes(id),
      );
  const previousAchievements = new Set(progress.achievements);
  progress = collect(progress, reveal, {
    mode: current.run.mode,
    windowId: current.run.windowId,
    dailyDate: current.run.dailyDate,
  });
  store.saveProgress(progress);
  if (current.run.dailyDate)
    completeDaily(
      store,
      current.run.dailyDate,
      reveal,
      shareResult(reveal, current.run),
    );
  if (current.run.sourceData) {
    const collection = store.readExtra('live-collection') ?? {
      archives: [],
      ids: [],
    };
    collection.archives = Array.isArray(collection.archives)
      ? collection.archives.filter(validLiveArchive)
      : [];
    if (!Array.isArray(collection.ids)) collection.ids = [];
    if (
      !collection.archives.some(
        (data) => data.meta.generated === current.run.sourceData.meta.generated,
      )
    )
      collection.archives.push(current.run.sourceData);
    collection.ids = [...new Set(collection.ids.concat(missionIds))];
    store.writeExtra('live-collection', collection);
  }
  save('ending');
  const { root, signal } = shell(
    'Your Moon story',
    `${endingCard(reveal.ending)}<p>${t('The crew is on the way home. Now meet the real Sun behind your mission.')}</p><div class="app-actions"><button data-reveal>${t('Reveal the real dates')} →</button></div>${store.isBlocked() ? `<p role="status">${t('Storage is unavailable. You can play; this tab keeps your progress until it closes.')}</p>` : ''}`,
  );
  sourceBadge(root);
  if (current.run.mode === 'judge')
    root
      .querySelector('h1')
      .after(
        document.createRange().createContextualFragment(judgeGuide('ending')),
      );
  const audio = createAudio();
  audio.setSettings({ master: settings.volume, mute: !settings.sound });
  const old = disposeScreen;
  disposeScreen = () => {
    old();
    void audio.dispose();
  };
  if (settings.sound)
    void audio
      .unlock()
      .then(() => {
        if (!signal.aborted)
          audio.play(
            ['Early Ride Home', 'Lights Out', 'Snack Attack'].includes(
              reveal.ending,
            )
              ? 'ending-bittersweet'
              : 'ending-triumphant',
          );
      })
      .catch(() => {});
  root
    .querySelector('[data-reveal]')
    .addEventListener('click', showReveal, { signal });
  const newAchievements = progress.achievements.filter(
    (name) => !previousAchievements.has(name),
  );
  if (newAchievements.length) {
    const toast = document.createElement('aside');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = t('Achievement unlocked: {name}', {
      name: newAchievements.map((name) => t(name)).join(' / '),
    });
    document.body.append(toast);
    const timeout = setTimeout(() => toast.remove(), 6000),
      old = disposeScreen;
    disposeScreen = () => {
      clearTimeout(timeout);
      toast.remove();
      old();
    };
  }
}
function showReveal() {
  leave();
  save('reveal');
  window.scrollTo(0, 0);
  disposeScreen = mountReveal({
    reveal: buildReveal(current.run),
    crewIds: current.run.crew.map((c) => c.id),
    onExit: title,
    onUnlock: unlocks,
    classroom: current.run.classroom,
    judge: current.run.mode === 'judge',
  });
  if (current.run.mode === 'judge') {
    const root = document.querySelector('.reveal-screen');
    root
      .querySelector('.date-reveal')
      .insertAdjacentHTML('afterend', judgeGuide('reveal'));
    root.insertAdjacentHTML('beforeend', judgeClosing());
  }
  sourceBadge(document.querySelector('.reveal-screen'));
}
function unlocks() {
  const reveal = buildReveal(current.run);
  progress = collect(progress, reveal, {
    mode: current.run.mode,
    windowId: current.run.windowId,
    dailyDate: current.run.dailyDate,
  });
  store.saveProgress(progress);
  save('unlocks');
  const cards = [...new Set(reveal.timeline.reality.map((row) => row.donkiId))];
  const { root, signal } = shell(
    'A page for your Sun Almanac',
    `<div class="unlock-mark">${t('REAL')}</div><p class="hero-line">${t('{newCount} new records; {count} verified records from this mission.', { newCount: current.journal.newCards?.length ?? 0, count: cards.length })}</p><p>${t('Your ending and achievements are saved. Open your Sun Almanac to flip the verified records.')}</p><details><summary>${t('See source IDs')}</summary><ul class="source-id-list">${cards.map((id) => `<li><code>${e(id)}</code></li>`).join('')}</ul></details><h2>${t('Achievements')}</h2><div class="achievement-list">${reveal.achievements.map((name) => `<span>★ ${t(name)}</span>`).join('') || `<p>${t('Every mission teaches a new call.')}</p>`}</div><div class="app-actions"><button data-again>${t('Play again · new Sun')}</button><button data-nav="endings">${t('View endings')}</button></div>`,
  );
  root
    .querySelector('[data-again]')
    .addEventListener('click', playAgain, { signal });
  const previews = document.createElement('div');
  previews.className = 'unlock-cards';
  previews.setAttribute('aria-label', t('Verified records from this mission'));
  previews.innerHTML = cards
    .slice(0, 3)
    .map((id, index) => {
      const row = reveal.timeline.reality.find((event) => event.donkiId === id);
      return `<article class="unlock-card" style="--card-order:${index}"><p class="source-label">REAL · ${t(row.kind)}</p><small>${t(current.journal.newCards?.includes(id) ? 'New record' : 'Already collected')}</small><img src="/assets/icons/${row.kind === 'flare' ? 'solar' : row.kind === 'forecast' ? 'radio' : 'shield'}.svg" alt=""><time>${e(row.utc)} UTC</time><code>${e(id)}</code></article>`;
    })
    .join('');
  root.querySelector('.unlock-mark').after(previews);
  root
    .querySelector('[data-nav="endings"]')
    .insertAdjacentHTML(
      'afterend',
      `<button data-nav="almanac">${t('Open Sun Almanac')}</button>`,
    );
  const code = encodeSeed(current.run),
    text = shareResult(reveal, current.run);
  root.insertAdjacentHTML(
    'beforeend',
    `<section class="share-panel"><h2>${t('Share your Sun')}</h2><p>${t('Friend-code replays are practice. The same setup can have a different ending.')}</p><textarea class="share-text" readonly aria-label="${t('Share result')}">${e(text)}</textarea><div class="app-actions"><button data-share>${t('Share result')}</button>${code ? `<button data-copy-code>${t('Copy seed code')}</button>` : ''}</div><p class="share-status" role="status"></p></section>`,
  );
  root
    .querySelector('[data-share]')
    .addEventListener('click', () => shareText(root, text), { signal });
  root
    .querySelector('[data-copy-code]')
    ?.addEventListener(
      'click',
      () => shareText(root, code, { copyOnly: true }),
      { signal },
    );
}
function playAgain() {
  current = {
    run: createRun({
      seed: newSeed(),
      difficulty: current?.run.difficulty ?? difficulty,
      crewIds: current?.run.crew.map((c) => c.id) ?? crewIds,
      classroom: settings.classroom,
    }),
    screen: 'scramble',
    journal: {},
  };
  void scramble();
}
function resume() {
  if (!current) return title();
  if (current.run.phase === 'scramble') return scramble();
  if (current.run.phase === 'shelter') return shelter();
  if (current.screen === 'reveal') return showReveal();
  if (current.screen === 'unlocks') return unlocks();
  ending();
}
function errorScreen(retry) {
  const { root, signal } = shell(
    'The page needs another try.',
    `<p>${t('Your saved mission is safe. Try opening this page again.')}</p><button data-retry>${t('Try again')}</button>`,
  );
  root
    .querySelector('[data-retry]')
    .addEventListener('click', retry, { signal });
}
function menu(name) {
  if (name === 'title') return title();
  if (name === 'settings') return settingsScreen();
  if (name === 'how') return howScreen();
  if (name === 'endings') return endingsScreen();
  if (name === 'credits') return creditsScreen();
  const hooks = {
    shell,
    store,
    current,
    progress,
    start: startSpecial,
    continueMission: resume,
  };
  if (name === 'daily') return mountDaily(hooks);
  if (name === 'seed') return mountSeedCode(hooks);
  if (name === 'historic') return mountHistoric(hooks);
  if (name === 'live') return mountLive(hooks);
  if (name === 'classroom') {
    settings.classroom = true;
    settings.textSize = 'largest';
    store.saveSettings(settings);
    applySettings();
    return startSpecial({
      seed: newSeed(),
      mode: 'normal',
      difficulty: 'Commander',
      crewIds: ['ria', 'dom', 'mara', 'aiko'],
    });
  }
  if (name === 'almanac') {
    const view = shell('Sun Almanac', '');
    const collection = store.readExtra('live-collection');
    const liveCards = (
      Array.isArray(collection?.archives) ? collection.archives : []
    )
      .filter(validLiveArchive)
      .flatMap((data) => sourceCards(data))
      .filter(
        (card) =>
          Array.isArray(collection.ids) && collection.ids.includes(card.id),
      )
      .map((card) => ({ ...card, live: true }));
    return mountAlmanac({ ...view, progress, liveCards });
  }
  shell(
    name === 'daily' ? 'Daily Sun' : 'Sun Almanac',
    `<img class="placeholder-icon" src="/assets/icons/${name === 'daily' ? 'solar' : 'radio'}.svg" alt=""><p class="hero-line">${t('Coming in the next update.')}</p><p>${t('You can play normal missions now. Your endings and verified source records are already being collected.')}</p><button data-nav="title">${t('Back to title')}</button>`,
  );
}
function startSpecial(setup) {
  const begin = async () => {
    if (setup.mode === 'daily' && !(await claimDaily(store, setup.dailyDate)))
      return menu('daily');
    difficulty = setup.difficulty;
    crewIds = [...setup.crewIds];
    briefing(setup);
  };
  if (current && current.run.phase !== 'ending') confirmReplace(begin);
  else void begin();
}
function endingsScreen() {
  const { root } = shell(
    'Endings',
    `<p>${t('{count} of 10 endings collected', { count: progress.endings.length })}</p><div class="ending-grid">${ENDINGS.map((name) => `<article class="collected-ending ${progress.endings.includes(name) ? 'collected' : 'uncollected'}"><img src="/assets/endings/${endingSlug(name)}.svg" alt=""><span>${progress.endings.includes(name) ? '★' : '◇'} ${t(progress.endings.includes(name) ? 'Collected' : 'Still to discover')}</span><h2>${t(name)}</h2><p>${t(`epilogue.${endingSlug(name)}`)}</p></article>`).join('')}</div><h2>${t('Achievements')}</h2><div class="achievement-list">${progress.achievements.map((name) => `<span>★ ${t(name)}</span>`).join('') || `<p>${t('Every mission teaches a new call.')}</p>`}</div>`,
  );
  root.insertAdjacentHTML(
    'beforeend',
    `<h2>${t('All 12 achievements')}</h2><div class="achievement-grid">${ACHIEVEMENTS.map((name) => `<article class="${progress.achievements.includes(name) ? 'earned' : 'locked'}"><h3>${progress.achievements.includes(name) ? '★' : '◇'} ${t(name)}</h3><p>${t(`achievement.condition.${name}`)}</p><small>${t(progress.achievements.includes(name) ? 'Collected' : 'Still to discover')}</small></article>`).join('')}</div>`,
  );
}
function settingsScreen() {
  const { root, signal } = shell(
    'Settings',
    `<form class="settings-form"><label>${t('Language')}<select name="language"><option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option><option value="fil" ${settings.language === 'fil' ? 'selected' : ''}>Filipino</option></select></label><label>${t('Text size')}<select name="textSize">${['normal', 'large', 'largest'].map((value) => `<option value="${value}" ${settings.textSize === value ? 'selected' : ''}>${t(value)}</option>`).join('')}</select></label><label>${t('Motion')}<select name="motion"><option value="system" ${settings.motion === 'system' ? 'selected' : ''}>${t('Follow device')}</option><option value="reduced" ${settings.motion === 'reduced' ? 'selected' : ''}>${t('Reduce motion')}</option></select></label><label class="check-setting"><input type="checkbox" name="sound" ${settings.sound ? 'checked' : ''}>${t('Sound (captions always available)')}</label><label>${t('Volume')}<input type="range" name="volume" min="0" max="1" step="0.05" value="${settings.volume}"></label><label class="check-setting"><input type="checkbox" name="flat" ${settings.flat ? 'checked' : ''}>${t('Prefer the 2D map')}</label><label class="check-setting"><input type="checkbox" name="tutorial" ${settings.tutorial ? 'checked' : ''}>${t('Show practice and Day 1 coaching')}</label><p>${t('Shapes and labels distinguish events without relying on color. All menus and journal actions work with Tab and Enter. Use arrows or WASD on the map.')}</p><div class="app-actions"><button type="button" data-practice>${t('Practice again')}</button><button type="button" data-nav="title">${t('Done')}</button></div></form><p role="status" class="settings-status"></p>`,
  );
  root
    .querySelector('form')
    .insertAdjacentHTML(
      'afterbegin',
      `<label class="check-setting"><input type="checkbox" name="classroom" ${settings.classroom ? 'checked' : ''}>${t('Classroom votes on forecasts')}</label><label class="check-setting"><input type="checkbox" name="haptics" ${settings.haptics ? 'checked' : ''}>${t('Gentle vibration (supported phones)')}</label>`,
    );
  root.querySelector('form').addEventListener(
    'change',
    (event) => {
      const form = event.currentTarget;
      const focusName = event.target.name;
      settings = {
        language: form.elements.language.value,
        textSize: form.elements.textSize.value,
        motion: form.elements.motion.value,
        sound: form.elements.sound.checked,
        volume: Number(form.elements.volume.value),
        flat: form.elements.flat.checked,
        tutorial: form.elements.tutorial.checked,
        classroom: form.elements.classroom.checked,
        haptics: form.elements.haptics.checked,
      };
      store.saveSettings(settings);
      if (current) {
        current.run.classroom = settings.classroom;
        save();
      }
      applySettings();
      if (focusName === 'language') {
        settingsScreen();
        document.querySelector('[name="language"]').focus();
      }
      document.querySelector('.settings-status').textContent = t(
        store.isBlocked()
          ? 'Settings apply in this tab. Storage is unavailable.'
          : 'Settings saved.',
      );
    },
    { signal },
  );
  root
    .querySelector('[data-practice]')
    .addEventListener('click', () => practice(settingsScreen), { signal });
}
function howScreen() {
  shell(
    'How it works',
    `<div class="how-grid">${[
      [
        'solar',
        'The Sun sends clues',
        'Flares, particle detections and CME forecasts in this game come from NASA DONKI. Predictions can be early, late or wrong.',
      ],
      [
        'radio',
        'A warning can come late',
        'On May 11, 2024, a flare was recorded at 01:10 UTC. Particles were detected at 02:10. The official alert came at 02:30.',
      ],
      [
        'shield',
        'Supplies can be a shelter',
        'Orion’s crew can build a radiation shelter from stowage bags, food, water and supplies. More material around the crew helps protect them.',
      ],
      [
        'water',
        'Shelter takes time',
        'Orion procedures allow about an hour to set up a shelter and up to 24 hours inside. Radiation can rise gradually, like filling a bathtub.',
      ],
      [
        'game',
        'Your Moon story is a GAME',
        'The Moon outpost, crew, dose units, shielding percentages, food and water costs are game approximations. They are not real safety instructions.',
      ],
    ]
      .map(
        ([icon, title, text]) =>
          `<article><img src="/assets/icons/${icon}.svg" alt=""><h2>${t(title)}</h2><p>${t(text)}</p></article>`,
      )
      .join(
        '',
      )}</div><details><summary>${t('Read the research sources')}</summary><ul><li><a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">NASA CCMC · DONKI</a></li><li><a href="https://www.nasa.gov/reference/crew-systems/" target="_blank" rel="noopener">NASA · Orion crew systems</a></li><li><a href="https://science.nasa.gov/missions/artemis/artemis-2/to-protect-artemis-ii-astronauts-nasa-experts-keep-eyes-on-sun/" target="_blank" rel="noopener">NASA · Artemis II shelter procedure</a></li></ul></details>`,
  );
}
function creditsScreen() {
  shell(
    'Credits',
    `<p class="hero-line">${t('An original Moon outpost, made with open tools.')}</p><p>${t('Original art, characters, stories and synthesized music: the SHELTER CALL project. No NASA logos or real astronaut likenesses are used.')}</p><p>${t('Real records: NASA GSFC Moon to Mars Space Weather Analysis Office / CCMC DONKI. This project is not endorsed by NASA.')}</p><p>${t('Fonts: Atkinson Hyperlegible by Braille Institute of America; Patrick Hand by Patrick Wagesreiter. Both use the SIL Open Font License.')}</p><p>${t('Built with Three.js, Vite, vite-plugin-pwa and Workbox (MIT). Tested with Vitest, Playwright (Apache-2.0), Python, Requests, pandas, Matplotlib and pytest.')}</p><a class="app-link" href="https://github.com/Vurios/Shelter_Call/blob/main/CREDITS.md" target="_blank" rel="noopener">${t('Full credits and license sources')}</a>`,
  );
}
export function startApp() {
  applySettings();
  if (route.get('judge') === '1' && current?.run.mode !== 'judge') {
    const { root, signal } = shell(
      'Judge guide',
      `${judgeGuide('intro')}${judgeGuide('scramble')}<button data-judge-start>${t('Start the guided mission')}</button>`,
    );
    root.querySelector('[data-judge-start]').addEventListener(
      'click',
      () => {
        const begin = () => {
          current = {
            run: createRun(judgeSetup),
            screen: 'scramble',
            journal: {},
          };
          applySettings();
          void scramble();
        };
        if (current && current.run.phase !== 'ending') confirmReplace(begin);
        else begin();
      },
      { signal },
    );
  } else if (current) resume();
  else title();
  if (appStarted) return;
  appStarted = true;
  window.addEventListener('pagehide', leave);
  // A cached document retains the disposed DOM. Rebuild from its checkpoint
  // when browser Back restores it, so timers, controls and audio work again.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      applySettings();
      if (current) resume();
      else title();
    }
  });
}

/** Android Back pauses the timed map; other screens return to saved Title. */
export function navigateBack() {
  if (document.querySelector('.game-title')) return false;
  const pause = document.querySelector('.scramble-screen #pause');
  if (pause) {
    const resume = document.querySelector('.scramble-screen #resume');
    if (!resume || !resume.checkVisibility()) pause.click();
    return true;
  }
  title();
  return true;
}
