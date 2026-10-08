import { createRun, getScrambleSetup } from './core/api.js';
import strings from './i18n/en.json';
import { createAudio } from './audio/index.js';
import './ui/styles/main.css';

const route = new URLSearchParams(location.search);
if (route.get('scramble') === '1') {
  void openScramble();
} else if (route.get('gallery') === '1') {
  document.querySelector('#app').innerHTML =
    '<p class="loading-gallery" role="status">Opening the art journal…</p>';
  import('./ui/gallery/index.js')
    .then(({ mountGallery }) => mountGallery())
    .catch(() => {
      document.querySelector('#app').innerHTML =
        `<main class="title-screen"><h1>Journal unavailable</h1><p>Please reload to try again.</p><a href="${import.meta.env.BASE_URL}">Back to mission setup</a></main>`;
    });
} else {
  mountTitle();
}

function mountTitle() {
  const lifecycle = new AbortController();
  document.querySelector('#app').innerHTML = `
  <main class="title-screen">
    <div class="outpost-mark" aria-hidden="true"><span></span></div>
    <p class="eyebrow">${strings.eyebrow}</p>
    <h1>${strings.title}</h1>
    <p class="tagline">${strings.tagline}</p>
    <p class="description">${strings.description}</p>
    <div class="title-actions"><button type="button" id="play-scramble">Play scramble</button><button type="button" aria-expanded="false" aria-controls="mission-setup">${strings.button}</button></div>
    <section id="mission-setup" class="mission-setup" aria-label="Mission setup" hidden></section>
    <div class="title-tools"><a href="${import.meta.env.BASE_URL}?gallery=1">Open the art & sound journal</a><button id="title-sound" type="button" aria-pressed="false">Play title music</button></div>
    <footer><p class="status">${strings.status}</p><p class="notice">${strings.notice}</p></footer>
  </main>
`;

  const button = document.querySelector('[aria-controls="mission-setup"]');
  button.addEventListener('click', () => {
    const setup = getScrambleSetup(
      createRun({ seed: 'preview', mode: 'judge' }),
    );
    const panel = document.querySelector('#mission-setup');
    panel.innerHTML = `
    <p class="fixture-label">${strings.fixture}</p>
    <dl>
      <div><dt>${strings.realTimer}</dt><dd>${setup.realMinutes} minutes</dd></div>
      <div><dt>${strings.timer}</dt><dd>${setup.seconds} seconds</dd></div>
      <div><dt>${strings.crew}</dt><dd>${setup.crewSpawns.length}</dd></div>
      <div><dt>${strings.items}</dt><dd>${setup.itemSpawns.length}</dd></div>
      <div><dt>${strings.window}</dt><dd>12 days</dd></div>
    </dl>
    <p>${strings.next}</p>
  `;
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  const audio = createAudio();
  document.querySelector('#play-scramble').addEventListener('click', () => {
    lifecycle.abort();
    void audio.dispose();
    void openScramble();
  });
  const soundButton = document.querySelector('#title-sound');
  soundButton.addEventListener('click', async () => {
    try {
      await audio.unlock();
      const playing = audio.getStatus().theme === 'title';
      audio.setTheme(playing ? null : 'title');
      soundButton.setAttribute('aria-pressed', String(!playing));
      soundButton.textContent = playing
        ? 'Play title music'
        : 'Stop title music';
    } catch {
      soundButton.textContent = 'Sound unavailable';
    }
  });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && audio) {
        audio.stopAll();
        soundButton.setAttribute('aria-pressed', 'false');
        soundButton.textContent = 'Play title music';
      }
    },
    { signal: lifecycle.signal },
  );
  window.addEventListener(
    'pagehide',
    (event) => {
      if (event.persisted) {
        audio?.stopAll();
        soundButton.setAttribute('aria-pressed', 'false');
        soundButton.textContent = 'Play title music';
      } else void audio?.dispose();
    },
    { signal: lifecycle.signal },
  );
}

async function openScramble() {
  const app = document.querySelector('#app');
  app.innerHTML =
    '<p class="loading-gallery" role="status">Opening the lunar outpost…</p>';
  try {
    const { mountScramble } = await import('./scenes/scramble/index.js');
    mountScramble({ onExit: mountTitle });
  } catch {
    app.innerHTML = `<main class="title-screen"><h1>Outpost unavailable</h1><p>Please reload to try again.</p><a href="/">Back to title</a></main>`;
  }
}
