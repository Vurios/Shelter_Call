import { startApp, applySettings, getSettings } from './app/index.js';
import { t } from './i18n/index.js';
import './ui/styles/main.css';

const route = new URLSearchParams(location.search);
applySettings();
if (route.get('scramble') === '1') {
  const { mountScramble } = await import('./scenes/scramble/index.js');
  mountScramble({ onExit: startApp, settings: getSettings() });
} else if (route.get('gallery') === '1') {
  document.querySelector('#app').innerHTML =
    `<p class="loading-gallery" role="status">${t('Opening the art journal…')}</p>`;
  import('./ui/gallery/index.js')
    .then(({ mountGallery }) => mountGallery())
    .catch(() => {
      document.querySelector('#app').innerHTML =
        `<main class="title-screen"><h1>${t('Journal unavailable')}</h1><p>${t('Please reload to try again.')}</p><a href="/">${t('Back to title')}</a></main>`;
    });
} else {
  startApp();
}
