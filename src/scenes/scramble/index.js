import { itemIcon } from '../../art/items.js';
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
} from '../../core/api.js';
import { SCRAMBLE_CONFIG as C, ITEM_TYPES } from '../../core/config.js';
import { createAudio } from '../../audio/index.js';
import { localize, phrase, t } from '../../i18n/index.js';
import { create2DRenderer } from './render2d.js';
import {
  createScramble,
  startScramble,
  setTarget,
  updateScramble,
  usedSlots,
  dropCarried,
  finishScramble,
} from './logic.js';
import './style.css';

/** Scramble owns input/render/audio lifetime. Core owns the resulting mission. */
export function mountScramble({
  onExit,
  seed: initialSeed,
  run: mission,
  onSave,
  onComplete,
  autoStart = false,
  practice = false,
  settings = {},
} = {}) {
  const app = document.querySelector('#app');
  const params = new URLSearchParams(location.search);
  const seed =
    initialSeed || params.get('seed') || crypto.randomUUID().slice(0, 8);
  app.innerHTML = `<main class="scramble-screen" data-phase="ready" data-ready="false">
    <header class="scramble-header"><div><p class="eyebrow">LUNAR OUTPOST / SCRAMBLE</p><h1>One small hop.</h1><p id="source-timer">Gather crew. Bring supplies home.</p><p id="clamp-note" hidden></p></div><div class="countdown"><output aria-label="Seconds remaining">—</output><span>SECONDS</span></div></header>
    <div class="scramble-workspace"><section class="scene-panel" aria-label="Outpost map">
      <div class="scene-surface"></div><div class="storm-overlay" aria-hidden="true"></div>
      <div class="map-tools"><button type="button" data-zoom="0.85" aria-label="Zoom in">+</button><button type="button" data-zoom="1.15" aria-label="Zoom out">−</button></div>
      <div class="scramble-overlay"><form class="scramble-briefing"><img src="/assets/icon-192.png" alt="" width="48" height="48"><h2>The Sun sets the clock.</h2><p>Tap a place or use WASD / arrows. Bump crew so they follow you. Return to the glowing hatch to save them and stash supplies.</p><p>Carry 4 slots. Water uses 2. Tap a carried supply to put it down.</p><label>Outpost seed<input name="seed" maxlength="64" required autocomplete="off"></label><div class="briefing-options"><label>Difficulty<select name="difficulty"><option>Commander</option><option>Cadet</option><option>Flight Director</option></select></label><label class="checkbox"><input name="flat" type="checkbox">Use 2D map</label></div><button type="submit">Start scramble</button></form></div>
      <div class="pause-overlay" hidden><h2>Take a breath.</h2><p>The GAME clock is paused.</p><button type="button" id="resume">Resume scramble</button></div>
      <div class="slow-offer" hidden role="status"><p>This scene is slow here. A 2D map uses the same run.</p><button type="button" id="accept-2d">Switch to 2D mode</button><button type="button" id="keep-3d">Keep 3D</button></div>
      <p class="map-hint">Tap to hop · WASD / arrows · P to pause</p>
    </section><aside class="scramble-board" aria-label="Crew and supplies"><div class="carry-heading"><h2>Carry <span id="slot-count">0 / 4</span></h2><span id="supplies-saved">0 stashed</span></div><div class="carry-slots" aria-label="Carry slots"></div><div class="crew-heading"><h2>Your crew</h2><span id="crew-saved">0 / 4 inside</span></div><div class="crew-finders"></div><div class="supply-finder"><label class="sr-only" for="supply-type">Supply to find</label><select id="supply-type">${Object.entries(
      ITEM_TYPES,
    )
      .map(([id, item]) => `<option value="${id}">${item.name}</option>`)
      .join(
        '',
      )}</select><button type="button" id="find-supply">Find supply</button></div><p class="board-help">Crew follow in a line. Empty slots fill as you pass supplies.</p></aside></div>
    <div class="scramble-caption" role="status" aria-live="polite">Get ready. The timer starts when the map is loaded.</div>
    <footer class="scramble-toolbar"><button type="button" id="home">Hop to hatch</button><button type="button" id="close-hatch" disabled>Close hatch</button><button type="button" id="pause">Pause</button><button type="button" id="switch-renderer">Use 2D</button><button type="button" id="mute" aria-pressed="false">Sound on</button><button type="button" id="exit">Exit</button></footer>
  </main>`;
  const root = app.querySelector('.scramble-screen');
  const host = root.querySelector('.scene-surface');
  const caption = root.querySelector('.scramble-caption');
  const overlay = root.querySelector('.scramble-overlay');
  const pauseOverlay = root.querySelector('.pause-overlay');
  const form = root.querySelector('form');
  form.elements.seed.value = seed;
  if (mission) {
    form.elements.seed.value = mission.seed;
    form.elements.seed.disabled = true;
    form.elements.difficulty.value = mission.difficulty;
    form.elements.difficulty.disabled = true;
  }
  form.elements.flat.checked =
    settings.graphics === 'illustrated' || settings.flat === true;
  const lifecycle = new AbortController();
  const listen = (element, event, callback) =>
    element.addEventListener(event, callback, { signal: lifecycle.signal });
  const deviceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = {
    get matches() {
      return settings.motion === 'reduced' || deviceMotion.matches;
    },
  };
  const audio = createAudio({ onCaption: (text) => say(text) });
  audio.setSettings({
    master: settings.volume ?? 0.55,
    music: settings.music ?? 0.3,
    sfx: settings.sfx ?? 0.6,
    mute: settings.sound === false,
  });
  root
    .querySelector('#mute')
    .setAttribute('aria-pressed', String(settings.sound === false));
  root.querySelector('#mute').textContent = t(
    settings.sound === false ? 'Sound off' : 'Sound on',
  );
  let run,
    state,
    renderer,
    mode = '3d',
    disposed = false,
    paused = false,
    frameId = 0,
    last = 0,
    summaryTimer,
    warning = false,
    slowSeconds = 0,
    frameSeconds = 0,
    frames = 0,
    offered = false,
    rendererBusy = false;
  let quality = settings.graphics === 'low' ? 'low' : 'high';
  const keys = new Set();
  let hudKey = '';
  const say = (text) => {
    if (text) caption.textContent = phrase(text);
    localize(root);
  };
  const sound = (id) => audio.play(id);
  function controllerInput() {
    let x =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let z =
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
      (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    const gamepad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
    if (gamepad) {
      if (Math.abs(gamepad.axes[0] || 0) > 0.2) x = gamepad.axes[0];
      if (Math.abs(gamepad.axes[1] || 0) > 0.2) z = gamepad.axes[1];
    }
    return renderer.direction(x, z);
  }
  async function changeRenderer(next) {
    if (rendererBusy || disposed) return;
    rendererBusy = true;
    keys.clear();
    const wasPaused = paused;
    paused = true;
    audio.stopAll();
    renderer?.dispose();
    renderer = null;
    host.dataset.ready = 'false';
    let fallback = false;
    try {
      if (next === '3d') {
        const { create3DRenderer } = await import('./render3d.js');
        renderer = await create3DRenderer(host, state, { quality });
      } else renderer = create2DRenderer(host);
    } catch {
      fallback = true;
      next = '2d';
      renderer = create2DRenderer(host);
    }
    if (disposed) {
      renderer.dispose();
      renderer = null;
      return;
    }
    mode = next;
    root.dataset.renderer = mode;
    root.dataset.quality = mode === '2d' ? 'illustrated' : quality;
    host.dataset.ready = 'true';
    listen(renderer.canvas, 'pointerdown', (event) => {
      if (state.phase !== 'playing' || paused) return;
      event.preventDefault();
      renderer.canvas.focus({ preventScroll: true });
      const point = renderer.point(event.clientX, event.clientY);
      setTarget(state, point.x, point.z);
    });
    root.querySelector('#switch-renderer').textContent =
      mode === '3d' ? 'Use 2D' : 'Use 3D';
    root.querySelector('.slow-offer').hidden = true;
    slowSeconds = 0;
    frames = 0;
    frameSeconds = 0;
    last = performance.now();
    rendererBusy = false;
    paused = wasPaused;
    renderer.render(state, 0, { reducedMotion: reducedMotion.matches });
    if (fallback) say('3D is unavailable here. Your 2D map is ready.');
    else
      say(
        `${mode === '3d' ? '3D outpost' : '2D map'} ready. Same crew, supplies and timer.`,
      );
    if (state.phase === 'playing' && !paused) {
      audio.setTheme('scramble');
      audio.startTicks();
    }
  }
  function updateHud() {
    root.querySelector('output').textContent = Math.ceil(state.remaining);
    root.dataset.remaining = state.remaining.toFixed(2);
    root.dataset.playerX = state.player.x.toFixed(3);
    root.dataset.playerZ = state.player.z.toFixed(3);
    root.querySelector('#close-hatch').disabled =
      state.phase !== 'playing' ||
      paused ||
      Math.hypot(state.player.x, state.player.z) > C.hatchRadius ||
      state.player.y > C.groundReach;
    const nextKey = [
      ...state.carried,
      ...state.savedItems,
      state.crew.map((c) => c.status).join(','),
      paused,
    ].join('|');
    if (nextKey === hudKey) return;
    hudKey = nextKey;
    root.querySelector('#slot-count').textContent = `${usedSlots(state)} / 4`;
    root.querySelector('#supplies-saved').textContent =
      `${state.savedItems.length} stashed`;
    root.querySelector('#crew-saved').textContent =
      `${state.savedCrew.length} / 4 inside`;
    const slotHtml = [];
    for (const id of state.carried) {
      const item = state.items.find((i) => i.id === id);
      for (let n = 0; n < item.slots; n++)
        slotHtml.push(
          `<button type="button" data-drop="${id}" aria-label="Put down ${item.name}"><img src="/assets/icons/${itemIcon(item.type)}.svg" alt="">${n ? '2 of 2' : item.type === 'dosimeter' ? 'Dose' : item.type}</button>`,
        );
    }
    while (slotHtml.length < C.carrySlots)
      slotHtml.push(
        '<span class="empty-slot" aria-label="Empty carry slot">Empty</span>',
      );
    root.querySelector('.carry-slots').innerHTML = slotHtml.join('');
    root.querySelector('.crew-finders').innerHTML = state.crew
      .map(
        (c) =>
          `<button type="button" data-crew="${c.id}" ${c.status !== 'outside' ? 'disabled' : ''} aria-label="Find ${c.name}"><img src="/assets/portraits/${c.id}-calm.svg" alt=""><span>${c.name}<small>${c.status === 'saved' ? 'Inside' : c.status === 'following' ? 'Following' : 'Find me'}</small></span></button>`,
      )
      .join('');
    if (practice) {
      const saved = state.savedCrew.length > 0;
      const following = state.crew.some((crew) => crew.status === 'following');
      root
        .querySelectorAll('[data-coach]')
        .forEach((button) => button.removeAttribute('data-coach'));
      const target = saved
        ? root.querySelector('#find-supply')
        : following
          ? root.querySelector('#home')
          : root.querySelector('.crew-finders button:not(:disabled)');
      target?.setAttribute('data-coach', 'true');
      root.querySelector('.practice-coach p').textContent = t(
        saved
          ? '↓ Find a supply, then return to the hatch to stash it.'
          : following
            ? '↓ Your friend follows you. Hop to the hatch to save them.'
            : '↓ Tap Find crew or use arrows. Bump a friend so they follow.',
      );
    }
    localize(root);
  }
  function handleEvents() {
    const events = state.events.splice(0);
    renderer.effects(events);
    for (const event of events) {
      const cue = {
        hop: 'hop',
        land: 'land',
        pickup: 'pickup',
        deposit: 'deposit',
        drop: 'drop',
        hatch: 'hatch',
        storm: 'storm',
        saveCrew: 'deposit',
      }[event.kind];
      if (event.kind === 'tag') sound(`crew-${event.crewId}`);
      else if (cue) sound(cue);
      if (event.text) say(event.text);
      if (
        settings.haptics &&
        !reducedMotion.matches &&
        ['pickup', 'tag', 'saveCrew', 'hatch'].includes(event.kind)
      )
        navigator.vibrate?.(12);
      if (event.kind === 'tag') {
        const bubble = document.createElement('span');
        bubble.className = 'crew-tag-bubble';
        bubble.textContent = `✦ ${state.crew.find((crew) => crew.id === event.crewId)?.name ?? ''}`;
        host.append(bubble);
        setTimeout(() => bubble.remove(), 1000);
      }
      if (event.kind === 'pickup') {
        const item = state.items.find((item) => item.type === event.type);
        updateHud();
        const slot = root.querySelector('.carry-slots');
        slot.classList.remove('pickup-pop');
        void slot.offsetWidth;
        slot.classList.add('pickup-pop');
        if (item && !reducedMotion.matches) {
          const map = host.getBoundingClientRect(),
            target =
              slot
                .querySelector(
                  `[data-drop="${state.carried.findLast((id) => state.items.find((row) => row.id === id)?.type === event.type)}"]`,
                )
                ?.getBoundingClientRect() ?? slot.getBoundingClientRect();
          const image = document.createElement('img');
          image.className = 'pickup-flight';
          image.src = `/assets/icons/${itemIcon(item.type)}.svg`;
          image.alt = '';
          const x = map.left + map.width / 2 - 16,
            y = map.top + map.height / 2 - 16;
          image.style.left = `${x}px`;
          image.style.top = `${y}px`;
          image.style.setProperty(
            '--pickup-x',
            `${target.left + target.width / 2 - 16 - x}px`,
          );
          image.style.setProperty(
            '--pickup-y',
            `${target.top + target.height / 2 - 16 - y}px`,
          );
          root.append(image);
          setTimeout(() => image.remove(), 700);
        }
      }
      if (event.kind === 'deposit' || event.kind === 'saveCrew') {
        const pop = document.createElement('span');
        pop.className = 'deposit-pop';
        pop.textContent =
          event.kind === 'saveCrew'
            ? 'Crew inside!'
            : `+${event.types.length} supplies`;
        host.append(pop);
        setTimeout(() => pop.remove(), 900);
        if (event.kind === 'deposit' && !reducedMotion.matches) {
          const map = host.getBoundingClientRect();
          const counter = root
            .querySelector('#supplies-saved')
            .getBoundingClientRect();
          const icon = document.createElement('img');
          icon.className = 'stash-flight';
          icon.src = `/assets/icons/${itemIcon(event.types[0])}.svg`;
          icon.alt = '';
          icon.style.left = `${map.left + map.width / 2 - 20}px`;
          icon.style.top = `${map.top + map.height / 2 - 20}px`;
          icon.style.setProperty(
            '--stash-x',
            `${counter.left + counter.width / 2 - map.left - map.width / 2}px`,
          );
          icon.style.setProperty(
            '--stash-y',
            `${counter.top + counter.height / 2 - map.top - map.height / 2}px`,
          );
          root.append(icon);
          icon.addEventListener('animationend', () => icon.remove(), {
            once: true,
          });
        }
      }
    }
  }
  function frame(now) {
    if (disposed) return;
    const delta = Math.max(0, (now - (last || now)) / 1000);
    last = now;
    if (renderer) {
      if (state.phase === 'playing' && !paused) {
        updateScramble(state, delta, controllerInput());
        audio.setTimer(state.remaining, state.setup.seconds);
        if (!warning && state.remaining <= C.warningSeconds) {
          warning = true;
          root.classList.add('timer-warning');
          sound('countdown-alarm');
          say('Ten seconds. Return to the hatch!');
        }
        handleEvents();
        if (state.phase === 'finished') {
          root.dataset.phase = 'finished';
          root.classList.toggle('hatch-slam', state.result.timeLeft > 0);
          audio.stopAll();
          sound(state.result.timeLeft ? 'hatch' : 'storm');
          root.classList.toggle('storm-arrived', state.result.timeLeft === 0);
          summaryTimer = setTimeout(showResult, 1800);
        }
        if (mode === '3d' && !offered) {
          frameSeconds += delta;
          frames++;
          if (frameSeconds >= 1) {
            const fps = frames / frameSeconds;
            root.dataset.fps = fps.toFixed(1);
            slowSeconds = fps < C.lowFps ? slowSeconds + frameSeconds : 0;
            frames = 0;
            frameSeconds = 0;
            if (slowSeconds >= C.lowFpsSeconds) {
              if (
                (!settings.graphics || settings.graphics === 'auto') &&
                quality === 'high'
              ) {
                quality = 'low';
                renderer.setQuality('low');
                root.dataset.quality = 'low';
                slowSeconds = 0;
                say('Using lighter graphics to keep your hops smooth.');
              } else {
                offered = true;
                root.querySelector('.slow-offer').hidden = false;
                say('A 2D map may run more smoothly here.');
              }
            }
          }
        }
      }
      renderer.render(state, paused ? 0 : delta, {
        reducedMotion: reducedMotion.matches,
      });
      const metrics = renderer.metrics();
      root.dataset.drawCalls = metrics.calls;
      root.dataset.triangles = metrics.triangles;
      root.dataset.pixelRatio = metrics.pixelRatio;
      updateHud();
    }
    frameId = requestAnimationFrame(frame);
  }
  function setPause(next) {
    if (state?.phase !== 'playing' || rendererBusy) return;
    paused = next;
    keys.clear();
    pauseOverlay.hidden = !paused;
    root.querySelector('#pause').textContent = paused ? 'Resume' : 'Pause';
    last = performance.now();
    if (paused) {
      audio.stopAll();
      root.querySelector('#resume').focus();
    } else {
      audio.setTheme('scramble');
      audio.startTicks();
      renderer.canvas.focus({ preventScroll: true });
    }
    say(paused ? 'Paused. Your time is safe.' : 'Ready to hop again.');
  }
  listen(form, 'submit', async (event) => {
    event.preventDefault();
    if (rendererBusy) return;
    const audioReady = audio
      .unlock()
      .catch(() => say('Sound is unavailable. Captions still work.'));
    run =
      mission ??
      createRun({
        seed: form.elements.seed.value.trim() || seed,
        difficulty: form.elements.difficulty.value,
      });
    const setup = getScrambleSetup(run);
    if (practice) {
      setup.seconds = 25;
      setup.source = 'GAME';
      setup.realMinutes = null;
      setup.clampNote = null;
    }
    state = createScramble(setup);
    root.querySelector('#source-timer').textContent =
      `REAL: ${state.setup.realMinutes} min → YOU: ${state.setup.seconds} s`;
    if (practice)
      root.querySelector('#source-timer').textContent = t(
        'GAME practice · 25 seconds · no mission progress changes',
      );
    const note = root.querySelector('#clamp-note');
    note.hidden = !state.setup.clampNote;
    note.textContent = state.setup.clampNote || '';
    if (practice) {
      root.querySelector('.scramble-header h1').textContent = t(
        'A little practice hop.',
      );
      const coach = document.createElement('aside');
      coach.className = 'practice-coach';
      coach.innerHTML = `<p role="status"></p><button type="button" id="skip-practice">${t('Skip practice')}</button>`;
      root.querySelector('.scramble-header').after(coach);
      listen(coach.querySelector('button'), 'click', () => {
        dispose();
        onComplete?.();
      });
    }
    const flat = form.elements.flat.checked;
    overlay.innerHTML =
      '<p role="status">Opening your outpost… The clock is waiting.</p>';
    await changeRenderer(flat ? '2d' : '3d');
    await audioReady;
    if (disposed) return;
    overlay.hidden = true;
    root.dataset.ready = 'true';
    root.dataset.phase = 'playing';
    startScramble(state);
    updateHud();
    audio.setTimer(state.remaining, state.setup.seconds);
    audio.setTheme('scramble');
    audio.startTicks();
    renderer.canvas.focus({ preventScroll: true });
    last = performance.now();
    frameId = requestAnimationFrame(frame);
    say('Go! Gather crew and supplies, then return to the hatch.');
    if (document.hidden) setPause(true);
  });
  listen(root, 'click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.zoom) renderer?.zoom(Number(button.dataset.zoom));
    if (button.dataset.drop && state && !paused)
      dropCarried(state, button.dataset.drop);
    if (button.dataset.crew && state && !paused) {
      const crew = state.crew.find((c) => c.id === button.dataset.crew);
      setTarget(state, crew.x, crew.z);
      say(`Hopping toward ${crew.name}.`);
    }
  });
  listen(root.querySelector('#find-supply'), 'click', () => {
    if (state?.phase !== 'playing' || paused) return;
    const type = root.querySelector('#supply-type').value;
    const item = state.items
      .filter((i) => i.type === type && i.status === 'outside')
      .sort(
        (a, b) =>
          Math.hypot(a.x - state.player.x, a.z - state.player.z) -
          Math.hypot(b.x - state.player.x, b.z - state.player.z),
      )[0];
    if (!item) return say('All of those supplies are picked up already.');
    setTarget(state, item.x, item.z);
    say(
      usedSlots(state) + item.slots > C.carrySlots
        ? 'Bag full: hop to hatch to deposit, or tap a carried supply to put it down. Water takes two slots.'
        : `Hopping toward ${item.name}.`,
    );
  });
  listen(root.querySelector('#home'), 'click', () => {
    if (state?.phase === 'playing' && !paused) {
      setTarget(state, 0, 0);
      say('Heading for the glowing hatch.');
    }
  });
  listen(root.querySelector('#close-hatch'), 'click', () => {
    if (state?.phase === 'playing' && !paused && finishScramble(state, true)) {
      handleEvents();
      root.dataset.phase = 'finished';
      audio.stopAll();
      sound('hatch');
      summaryTimer = setTimeout(showResult, 900);
    }
  });
  listen(root.querySelector('#pause'), 'click', () => setPause(!paused));
  listen(root.querySelector('#resume'), 'click', () => setPause(false));
  listen(root.querySelector('#switch-renderer'), 'click', () => {
    if (state?.phase === 'playing')
      void changeRenderer(mode === '3d' ? '2d' : '3d');
  });
  listen(
    root.querySelector('#accept-2d'),
    'click',
    () => void changeRenderer('2d'),
  );
  listen(root.querySelector('#keep-3d'), 'click', () => {
    root.querySelector('.slow-offer').hidden = true;
  });
  listen(root.querySelector('#mute'), 'click', () => {
    const mute = !audio.getStatus().settings.mute;
    audio.setSettings({ mute });
    const button = root.querySelector('#mute');
    button.setAttribute('aria-pressed', String(mute));
    button.textContent = mute ? 'Sound off' : 'Sound on';
  });
  listen(root.querySelector('#exit'), 'click', () => {
    dispose();
    onExit?.();
  });
  listen(document, 'keydown', (event) => {
    if (
      state?.phase !== 'playing' ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)
    )
      return;
    const key = event.key.toLowerCase();
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
      ].includes(key)
    ) {
      event.preventDefault();
      if (!paused) keys.add(key);
    }
    if ((key === 'p' || key === 'escape') && !event.repeat) {
      event.preventDefault();
      setPause(!paused);
    }
    if (key === 'q' && !paused) dropCarried(state, state.carried.at(-1));
  });
  listen(document, 'keyup', (event) => keys.delete(event.key.toLowerCase()));
  listen(window, 'blur', () => keys.clear());
  listen(document, 'visibilitychange', () => {
    if (document.hidden) setPause(true);
  });
  listen(window, 'pagehide', () => dispose());
  function showResult() {
    if (disposed) return;
    cancelAnimationFrame(frameId);
    renderer?.dispose();
    renderer = null;
    audio.stopAll();
    if (practice) {
      dispose();
      onComplete?.();
      return;
    }
    applyScrambleResult(run, state.result);
    onSave?.(run);
    const counts = {};
    run.pantry.forEach(
      (item) => (counts[item.type] = (counts[item.type] || 0) + 1),
    );
    root.innerHTML = `<section class="scramble-result"><p class="eyebrow">HATCH REPORT / GAME OUTCOMES</p><h1>${state.savedCrew.length === 4 ? 'Together, inside.' : 'The hatch is closed.'}</h1><p class="result-summary">${state.savedCrew.length} of 4 crew saved before the storm · ${state.savedItems.length} supplies stashed</p><div class="result-crew">${run.crew.map((c) => `<article><img src="/assets/portraits/${c.id}-${state.result.crewSaved.includes(c.id) ? 'happy' : 'worried'}.svg" alt="${c.name}"><strong>${c.name}</strong><span>${state.result.crewSaved.includes(c.id) ? 'Saved' : 'Exposed'}</span></article>`).join('')}</div><p>${state.result.crewExposed.length ? 'Crew exposed outside have joined the shelter with a GAME dose bump. Everyone is here.' : 'All your crew reached the hatch before particles arrived.'}</p><ul class="result-supplies">${
      Object.entries(counts)
        .map(
          ([type, count]) =>
            `<li><img src="/assets/icons/${itemIcon(type)}.svg" alt="">${ITEM_TYPES[type].name} × ${count}</li>`,
        )
        .join('') ||
      '<li>No supplies stashed this time. Try a quick trip back to the hatch.</li>'
    }</ul><p class="result-next">Your crew and supplies are inside. Open the journal, fill the wall, and make your first shelter call.</p><div class="result-actions"><button type="button" id="continue-shelter">Open shelter journal</button><button type="button" id="again">New scramble</button><button type="button" id="back-title">Back to title</button></div></section>`;
    root.dataset.phase = 'result';
    root.dataset.crewSaved = state.savedCrew.length;
    root.dataset.itemsSaved = state.savedItems.length;
    root.dataset.corePhase = run.phase;
    root.dataset.timeLeft = state.result.timeLeft.toFixed(2);
    root.querySelector('h1').tabIndex = -1;
    if (run.mode === 'live' || run.liveStatus) {
      const badge = document.createElement('p');
      badge.className = 'mission-source';
      badge.textContent =
        run.mode === 'live' ? 'LIVE / NASA DONKI' : t('ARCHIVE FALLBACK');
      root.querySelector('h1').after(badge);
    }
    root.querySelector('h1').focus();
    if (run.rules.reserve) {
      const reserve = document.createElement('p');
      reserve.textContent = t(
        'Cadet GAME reserve: 4 food and 4 water are already in the shelter. These are not scramble pickups.',
      );
      root.querySelector('.result-next').before(reserve);
    }
    listen(root.querySelector('#continue-shelter'), 'click', async () => {
      if (onComplete) {
        dispose();
        onComplete(run);
        return;
      }
      root.querySelector('#continue-shelter').disabled = true;
      try {
        const { mountShelter } = await import('../../ui/shelter/index.js');
        if (disposed) return;
        dispose();
        mountShelter({
          run,
          onExit,
          onReplay: () => mountScramble({ onExit }),
        });
      } catch {
        if (!disposed) {
          root.querySelector('#continue-shelter').disabled = false;
          root.querySelector('.result-next').textContent =
            'Journal unavailable. Please try opening it again.';
        }
      }
    });
    listen(root.querySelector('#again'), 'click', () => {
      dispose();
      if (onComplete) onExit?.();
      else mountScramble({ onExit });
    });
    listen(root.querySelector('#back-title'), 'click', () => {
      dispose();
      onExit?.();
    });
    localize(root);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    lifecycle.abort();
    cancelAnimationFrame(frameId);
    clearTimeout(summaryTimer);
    renderer?.dispose();
    renderer = null;
    void audio.dispose();
  }
  localize(root);
  if (autoStart) form.requestSubmit();
  return dispose;
}
