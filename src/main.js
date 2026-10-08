import { createRun, getScrambleSetup } from './core/api.js';
import strings from './i18n/en.json';
import './ui/styles/main.css';

document.querySelector('#app').innerHTML = `
  <main class="title-screen">
    <div class="outpost-mark" aria-hidden="true"><span></span></div>
    <p class="eyebrow">${strings.eyebrow}</p>
    <h1>${strings.title}</h1>
    <p class="tagline">${strings.tagline}</p>
    <p class="description">${strings.description}</p>
    <button type="button" aria-expanded="false" aria-controls="mission-setup">${strings.button}</button>
    <section id="mission-setup" class="mission-setup" aria-label="Mission setup" hidden></section>
    <footer><p class="status">${strings.status}</p><p class="notice">${strings.notice}</p></footer>
  </main>
`;

const button = document.querySelector('button');
button.addEventListener('click', () => {
  const setup = getScrambleSetup(createRun({ seed: 'preview', mode: 'judge' }));
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
