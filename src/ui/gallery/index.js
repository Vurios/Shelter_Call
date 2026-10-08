import { PALETTE, CREW_STYLE } from '../../art/palette.js';
import { CREW } from '../../core/config.js';
import { createAudio, SOUND_CUES, THEMES } from '../../audio/index.js';
import { mountModels } from './models.js';
import './style.css';

const base = import.meta.env.BASE_URL;
const assetURL = (path) => `${base}${path}`;
const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const picture = (asset) =>
  `<figure class="art-card"><img src="${assetURL(asset.path)}" alt="${escape(asset.name)}" loading="lazy" width="160" height="160"><figcaption>${escape(asset.name)}</figcaption></figure>`;

export async function mountGallery() {
  const response = await fetch(assetURL('assets/manifest.json'));
  if (!response.ok) throw new Error('The asset list could not load.');
  const assets = await response.json();
  document.title = 'Art & sound journal · SHELTER CALL';
  document.querySelector('#app').innerHTML = `
    <main id="top" class="gallery">
      <header class="gallery-header"><a class="back-link" href="${base}">← Back to mission setup</a><p class="eyebrow">SHELTER CALL / FIELD NOTES 04</p><h1>Small crew.<br>Big Moon.</h1><p class="gallery-intro">A warm little home on a cold world.<br>Meet the crew, turn the pages, and try the sounds.</p><img class="hero-plant" src="${assetURL('assets/plant/proud.svg')}" alt="Kamote, our proud sweet-potato plant" width="160" height="160"><p class="kit-summary">${assets.counts.models} models · ${assets.counts.icons} icons · ${(assets.totalBytes / 1_000_000).toFixed(2)} MB of art & fonts</p></header>
      <nav class="gallery-nav" aria-label="Gallery sections">${['models', 'portraits', 'icons', 'endings', 'materials', 'sounds'].map((id) => `<a href="#${id}">${id === 'materials' ? 'Paper & color' : id[0].toUpperCase() + id.slice(1)}</a>`).join('')}</nav>
      <section id="models" class="journal-section"><div class="section-title"><div><p class="folio">01 / THE OUTPOST</p><h2>Pocket-size Moon explorers</h2></div><button id="rotation" aria-pressed="false" type="button">Pause rotation</button></div><p id="model-status" class="section-note" role="status">Loading the model kit…</p>
      ${['Crew', 'Stations', 'Supplies', 'Companions & terrain']
        .map(
          (category) =>
            `<h3>${category}</h3><div class="model-grid">${assets.models
              .filter((model) => model.category === category)
              .map(
                (model) =>
                  `<article class="model-card" data-model="${model.id}" data-model-path="${assetURL(model.path)}" data-model-state="loading"><div class="model-window" role="img" aria-label="3D preview of ${escape(model.name)}"></div><h4>${escape(model.name)}</h4>${model.id.startsWith('crew-') ? `<p>${CREW.find((crew) => `crew-${crew.id}` === model.id).trait} · ${CREW_STYLE[model.id.slice(5)].accent}</p>` : ''}</article>`,
              )
              .join('')}</div>`,
        )
        .join('')}</section>
      <section id="portraits" class="journal-section"><p class="folio">02 / FAMILIAR FACES</p><h2>Every mood belongs here</h2><p class="section-note">Color and shape both tell you who's who.</p>${CREW.map(
        (crew) =>
          `<div class="crew-row"><h3>${crew.name} <span>${crew.trait} · ${CREW_STYLE[crew.id].accent}</span></h3><div class="portrait-grid">${assets.portraits
            .filter((portrait) => portrait.crew === crew.id)
            .map(picture)
            .join('')}</div></div>`,
      ).join(
        '',
      )}<h3>Small companions</h3><div class="plant-grid">${[assets.portraits.find((portrait) => portrait.id === 'bolt'), ...assets.plant].map(picture).join('')}</div></section>
      <section id="icons" class="journal-section"><p class="folio">03 / SIMPLE SIGNS</p><h2>A shape for every job</h2><p class="section-note">Danger has a triangle, stripes, and a label. The REAL symbol below is an icon sample.</p><div class="icon-grid">${assets.icons.map((icon) => `<figure class="icon-card"><svg aria-hidden="true" viewBox="0 0 32 32"><use href="${assetURL('assets/icons/sprite.svg')}#${icon.id}"/></svg><figcaption>${escape(icon.name)}</figcaption></figure>`).join('')}</div></section>
      <section id="endings" class="journal-section"><p class="folio">04 / HOMEWARD STORIES</p><h2>Ten kind ways to come home</h2><div class="ending-grid">${assets.illustrations.map(picture).join('')}</div><div class="almanac-sample"><img src="${assetURL('assets/almanac-frame.svg')}" alt="Empty Almanac card frame with space for a verified event" width="280" height="360"><div><h3>A place for real records</h3><p>This blank frame holds future Sun Almanac cards. Actual dates and records come from the verified dataset.</p><p>Art, sound, and the lunar setting are GAME presentation.</p></div></div></section>
      <section id="materials" class="journal-section"><p class="folio">05 / PAPER & LIGHT</p><h2>Cold rock. Warm windows.</h2><div class="palette-grid">${Object.entries(
        PALETTE,
      )
        .map(
          ([name, color]) =>
            `<div class="swatch" style="--swatch:${color};--swatch-ink:${name === 'ink' ? PALETTE.paper : PALETTE.ink}"><strong>${name}</strong><code>${color}</code></div>`,
        )
        .join(
          '',
        )}</div><div class="type-samples"><article><h3>Atkinson Hyperlegible</h3><p>Bring water. Check the radio. Help your crew.</p><p lang="fil">Kumusta, kaibigan! Tubig, pagkain, at pahinga. Ñ ñ · Ng ng · 0123456789</p><p><strong>Clear numbers: 1 I l · 0 O · 6 8 9</strong></p></article><article class="handwriting"><h3>Patrick Hand</h3><p>Our little Moon journal</p><p lang="fil">Magandang umaga! Kumusta, Kamote? Ñ ñ</p></article></div><div class="texture-grid">${assets.textures.map(picture).join('')}<figure class="art-card"><img src="${assetURL('assets/app-icon.svg')}" alt="Original shelter app icon" width="160" height="160"><figcaption>App icon · our warm doorway</figcaption></figure><figure class="art-card"><img src="${assetURL('assets/icon-maskable.png')}" alt="Maskable shelter app icon" width="160" height="160"><figcaption>Maskable icon</figcaption></figure></div></section>
      <section id="sounds" class="journal-section"><p class="folio">06 / LISTEN CLOSELY</p><h2>Little sounds, gentle company</h2><p class="section-note">Sound starts only when you press a button. Music and alarms are GAME sounds.</p><div class="audio-settings">${['master', 'music', 'sfx'].map((name) => `<label>${name === 'sfx' ? 'SFX' : name[0].toUpperCase() + name.slice(1)} volume<input id="volume-${name}" type="range" min="0" max="100" value="${{ master: 55, music: 30, sfx: 60 }[name]}" data-volume="${name}"></label>`).join('')}<label class="mute-label"><input id="mute" type="checkbox">Mute all sound</label><button id="stop-audio" type="button">Stop all sounds</button></div><p id="sound-caption" class="sound-caption" role="status" aria-live="polite">Quiet for now. Pick a sound below.</p><h3>Music loops</h3><div class="sound-grid">${THEMES.map((theme) => `<button type="button" data-theme="${theme.id}" aria-pressed="false">${theme.name}</button>`).join('')}</div><div class="audio-mapping"><label>GAME timer: <output id="timer-value">60 seconds</output><input id="demo-timer" type="range" min="0" max="60" value="60"></label><label>GAME shield: <output id="shield-value">90%</output><input id="demo-shield" type="range" min="0" max="90" value="90"></label><button id="timer-ticks" type="button" aria-pressed="false">Try timer ticks</button></div><h3>Sound effects</h3><div class="sound-grid">${SOUND_CUES.map((cue) => `<button type="button" data-sound="${cue.id}">${cue.name}</button>`).join('')}</div></section>
      <footer class="gallery-footer"><p>Original project art & audio. Fonts: Atkinson Hyperlegible and Patrick Hand, SIL OFL 1.1.</p><a href="${base}">Back to mission setup</a><a href="#top">Back to top ↑</a></footer>
    </main>`;
  const audio = createAudio({
    onCaption: (caption) => {
      const label = document.querySelector('#sound-caption');
      if (label.textContent !== caption) label.textContent = caption;
    },
  });
  const themeButtons = [...document.querySelectorAll('[data-theme]')];
  const tickButton = document.querySelector('#timer-ticks');
  const showError = (error) => {
    document.querySelector('#sound-caption').textContent =
      `Sound is unavailable: ${error.message}`;
  };
  function markThemes() {
    themeButtons.forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.theme === audio.getStatus().theme),
      ),
    );
  }
  document.querySelectorAll('[data-sound]').forEach((button) =>
    button.addEventListener('click', async () => {
      try {
        await audio.unlock();
        audio.play(button.dataset.sound);
      } catch (error) {
        showError(error);
      }
    }),
  );
  themeButtons.forEach((button) =>
    button.addEventListener('click', async () => {
      try {
        await audio.unlock();
        audio.setTheme(
          audio.getStatus().theme === button.dataset.theme
            ? null
            : button.dataset.theme,
        );
        markThemes();
      } catch (error) {
        showError(error);
      }
    }),
  );
  document.querySelectorAll('[data-volume]').forEach((input) =>
    input.addEventListener('input', () =>
      audio.setSettings({
        [input.dataset.volume]: Number(input.value) / 100,
      }),
    ),
  );
  document.querySelector('#mute').addEventListener('change', (event) => {
    audio.setSettings({ mute: event.target.checked });
    document.querySelector('#sound-caption').textContent = event.target.checked
      ? 'All sound muted. Captions stay on.'
      : 'Sound unmuted.';
  });
  function stop() {
    audio.stopAll();
    markThemes();
    tickButton.setAttribute('aria-pressed', 'false');
    document.querySelector('#sound-caption').textContent =
      'All sounds stopped.';
  }
  document.querySelector('#stop-audio').addEventListener('click', stop);
  document.querySelector('#demo-timer').addEventListener('input', (event) => {
    audio.setTimer(Number(event.target.value));
    tickButton.disabled = Number(event.target.value) === 0;
    document.querySelector('#timer-value').textContent =
      `${event.target.value} seconds`;
    if (Number(event.target.value) === 0) {
      audio.stopAll();
      markThemes();
      tickButton.setAttribute('aria-pressed', 'false');
    }
  });
  document.querySelector('#demo-shield').addEventListener('input', (event) => {
    audio.setShield(Number(event.target.value) / 100);
    document.querySelector('#shield-value').textContent =
      `${event.target.value}%`;
  });
  tickButton.addEventListener('click', async () => {
    try {
      if (tickButton.getAttribute('aria-pressed') === 'true') stop();
      else {
        await audio.unlock();
        audio.startTicks();
        tickButton.setAttribute('aria-pressed', 'true');
      }
    } catch (error) {
      showError(error);
    }
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const rotate = document.querySelector('#rotation');
  let paused = motion.matches;
  function labelRotation() {
    rotate.textContent = paused ? 'Resume rotation' : 'Pause rotation';
    rotate.setAttribute('aria-pressed', String(paused));
  }
  labelRotation();
  const previews = await mountModels(
    [...document.querySelectorAll('[data-model]')],
    { reducedMotion: motion, status: document.querySelector('#model-status') },
  );
  rotate.addEventListener('click', () => {
    paused = !paused;
    previews.setPaused(paused);
    labelRotation();
  });
  const onMotion = () => {
    paused = motion.matches;
    previews.setPaused(paused);
    labelRotation();
  };
  motion.addEventListener('change', onMotion);
  const onVisibility = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onVisibility);
  // Available to devtools and focused browser checks; no core state is exposed.
  window.galleryAudio = audio;
  document.querySelector('.gallery').dataset.ready = 'true';
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      stop();
      previews.setPaused(true);
      return;
    }
    previews.dispose();
    void audio.dispose();
    motion.removeEventListener('change', onMotion);
    document.removeEventListener('visibilitychange', onVisibility);
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) previews.setPaused(paused);
  });
}
