import { getShiftView, act, resolveShift } from '../../core/api.js';
import { createAudio } from '../../audio/index.js';
import { localize, phrase, t } from '../../i18n/index.js';
import { renderJournal, TASK_LABELS, forecastCard } from './view.js';
import './style.css';

/** The journal owns presentation, never hidden engine fields or survival rules. */
export function mountShelter({
  run,
  onExit,
  onReplay,
  onComplete,
  onSave,
  journal = {},
  settings = {},
} = {}) {
  const app = document.querySelector('#app');
  app.innerHTML =
    '<main class="shelter-screen"><div class="journal-page"></div><p class="journal-announcement" role="status" aria-live="polite"></p><p class="journal-sound-caption" aria-live="off"></p></main>';
  const root = app.querySelector('.shelter-screen');
  const page = root.querySelector('.journal-page');
  const announcement = root.querySelector('.journal-announcement');
  const lifecycle = new AbortController();
  const audio = createAudio({
    onCaption: (text) => {
      root.querySelector('.journal-sound-caption').textContent = phrase(text);
    },
  });
  let view = getShiftView(run),
    sound = settings.sound === true,
    disposed = false,
    turnTimer;
  const selection = { crew: null, item: null, recipient: view.crew[0].id };
  audio.setSettings({ master: settings.volume ?? 0.55, mute: !sound });
  const slots =
    Array.isArray(journal.slots) && journal.slots.length === 8
      ? journal.slots.map((id) => (typeof id === 'string' ? id : null))
      : Array(8).fill(null);
  let logs = Array.isArray(journal.logs)
    ? journal.logs.filter(
        (row) =>
          row &&
          typeof row.text === 'string' &&
          ['REAL', 'GAME'].includes(row.source),
      )
    : [];
  let coachStep = Number.isInteger(journal.coachStep) ? journal.coachStep : 0;
  const classroomSeen = new Set(
    Array.isArray(journal.classroomSeen)
      ? journal.classroomSeen.filter((id) => typeof id === 'string')
      : [],
  );
  let classroomPending = null;
  const coachLines = [
    '① Tap a crew card, then a task. Outside work brings supplies; shelter cuts GAME dose.',
    '② Tap a supply on the shelf, then Put in wall. If you have none, ice drill or salvage can bring some.',
    '③ Read the radio forecast before you finish a shift. No radio? Watch symptoms and your dosimeter, if saved.',
  ];
  function announce(text) {
    announcement.textContent = phrase(text);
  }
  function syncSlots() {
    const ids = new Set(view.wall.map((i) => i.id));
    const occupied = new Set();
    slots.forEach((id, index) => {
      if (!ids.has(id) || occupied.has(id)) slots[index] = null;
      else occupied.add(id);
    });
    view.wall.forEach((item) => {
      if (!slots.includes(item.id)) slots[slots.indexOf(null)] = item.id;
    });
    if (!view.wall.concat(view.pantry).some((i) => i.id === selection.item))
      selection.item = null;
  }
  function render({ flip = false } = {}) {
    if (disposed) return;
    if (view.phase === 'ending' && onComplete) {
      onSave?.({ slots, logs, coachStep, classroomSeen: [...classroomSeen] });
      dispose();
      onComplete(run);
      return;
    }
    const focusKey = document.activeElement?.dataset.key;
    const oldDialog = page.querySelector('dialog[open]');
    const dialogScroll = oldDialog?.scrollTop ?? 0;
    syncSlots();
    page.innerHTML = renderJournal(view, selection, slots, logs, sound);
    if (run.mode === 'live' || run.liveStatus) {
      const badge = document.createElement('p');
      badge.className = 'mission-source';
      badge.textContent =
        run.mode === 'live' ? 'LIVE / NASA DONKI' : t('ARCHIVE FALLBACK');
      page.querySelector('.journal-header').after(badge);
    }
    if (view.interrupt?.kind === 'forecast') {
      const card = view.forecastCards.find(
        (row) => row.donkiId === view.interrupt.donkiId,
      );
      if (card)
        page.querySelector('.classroom-prediction').innerHTML =
          forecastCard(card);
    }
    if (view.interrupt?.kind === 'forecast')
      classroomSeen.add(view.interrupt.donkiId);
    classroomPending =
      run.classroom && !view.resolving && !view.interrupt && !view.pendingEvent
        ? view.forecastCards.find((card) => !classroomSeen.has(card.donkiId))
        : null;
    if (classroomPending)
      page.insertAdjacentHTML(
        'beforeend',
        `<dialog class="journal-dialog classroom-vote" aria-labelledby="decision-heading"><p class="journal-eyebrow">${t('CLASSROOM / REAL FORECAST')}</p><h2 id="decision-heading">${t('CLASS VOTE: shelter or keep working?')}</h2><p>${t('Read the forecast together. Shelter brings crew inside; keeping tasks preserves your current plan.')}</p>${forecastCard(classroomPending)}<div class="decision-buttons"><button data-class-vote="shelter">${t('Shelter the crew')}</button><button data-class-vote="work">${t('Keep current tasks')}</button></div></dialog>`,
      );
    if (
      settings.tutorial &&
      view.day === 1 &&
      coachStep < coachLines.length &&
      !view.pendingEvent &&
      !view.interrupt
    ) {
      const coach = document.createElement('aside');
      coach.className = 'day-coach';
      coach.innerHTML = `<p>${t(coachLines[coachStep])}</p><button type="button" data-action="coach-next" data-key="coach-next">${t(coachStep === 2 ? 'Got it' : 'Next tip')}</button><button type="button" data-action="coach-skip" data-key="coach-skip">${t('Skip coaching')}</button>`;
      page.querySelector('.journal-header').after(coach);
    }
    localize(page);
    root.dataset.phase = view.phase;
    root.dataset.day = view.day;
    root.dataset.shift = view.shift;
    root.dataset.shiftIndex = view.shiftIndex;
    root.dataset.shield = view.shield;
    root.dataset.resolving = view.resolving;
    // Item controls are disabled too when a decision blocks engine actions.
    if (
      view.resolving ||
      view.pendingEvent ||
      view.interrupt ||
      view.phase !== 'shelter'
    )
      page
        .querySelectorAll(
          '[data-item], [data-slot], [data-crew], .item-actions button, select',
        )
        .forEach((el) => {
          el.disabled = true;
        });
    const dialog = page.querySelector('dialog');
    if (dialog) {
      dialog.showModal();
      dialog.scrollTop = dialogScroll;
      dialog.addEventListener('cancel', (event) => event.preventDefault(), {
        signal: lifecycle.signal,
      });
    }
    const focus = focusKey
      ? [...page.querySelectorAll('[data-key]')].find(
          (el) =>
            el.dataset.key === focusKey &&
            !el.disabled &&
            (!dialog || dialog.contains(el)),
        )
      : null;
    focus?.focus({ preventScroll: true });
    if (flip) {
      page.classList.remove('page-turn');
      void page.offsetWidth;
      page.classList.add('page-turn');
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => page.classList.remove('page-turn'), 650);
    }
    audio.setShield(view.shield);
    onSave?.({
      slots: [...slots],
      logs: structuredClone(logs),
      coachStep,
      classroomSeen: [...classroomSeen],
    });
  }
  function refresh(before, text, flip = false) {
    view = getShiftView(run);
    render({ flip });
    root.classList.remove('shield-up', 'shield-down', 'dose-rising');
    if (before.shield !== view.shield)
      root.classList.add(
        view.shield > before.shield ? 'shield-up' : 'shield-down',
      );
    if (view.crew.some((crew, index) => crew.dose > before.crew[index]?.dose))
      root.classList.add('dose-rising');
    if (
      settings.haptics &&
      document.documentElement.dataset.motion !== 'reduced' &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches &&
      before.shield !== view.shield
    )
      navigator.vibrate?.(10);
    if (text) announce(text);
    else if (wallMeal(before, view))
      announce(
        `Oops, we ate part of the wall! A gap opened. Shield ${before.shield > view.shield ? `fell from ${Math.round(before.shield * 100)}% to` : 'stays at'} ${Math.round(view.shield * 100)}%.`,
      );
    else if (before.shield > view.shield)
      announce(
        `Wall changed. Shield is now ${Math.round(view.shield * 100)}%.`,
      );
  }
  function wallMeal(before, after) {
    const remaining = new Set(after.wall.concat(after.pantry).map((i) => i.id));
    return before.wall.some(
      (i) => ['food', 'water'].includes(i.type) && !remaining.has(i.id),
    );
  }
  function action(value, text) {
    const before = view;
    try {
      act(run, value);
      refresh(before, text);
      return true;
    } catch (error) {
      announce(error.message);
      return false;
    }
  }
  function finishShift() {
    const before = view;
    try {
      if (!view.resolving) logs = [];
      const resolved = resolveShift(run);
      const after = getShiftView(run);
      // A blind crew cannot read unreceived flare/forecast records. The engine
      // retains them for Reveal; only an actual dosimeter onset is visible here.
      logs.push(
        ...resolved.filter((row) =>
          row.text.startsWith('MODEL')
            ? after.electron
            : row.source !== 'REAL' ||
              after.radio ||
              (after.dosimeter && row.text === 'particles.'),
        ),
      );
      refresh(before, null, getShiftView(run).shiftIndex !== before.shiftIndex);
      if (view.interrupt) {
        if (view.interrupt.class) audio.alarm(view.interrupt.class);
        else
          audio.play(
            view.interrupt.kind === 'forecast' ||
              view.interrupt.kind === 'model'
              ? 'radio'
              : 'storm',
          );
        announce(
          view.interrupt.kind === 'model'
            ? 'MODEL early warning. Prediction, not a detection.'
            : view.interrupt.class
              ? `Rush back: ${view.interrupt.class} flare. Choose recall or keep working.`
              : 'Particles detected. Choose recall or keep working.',
        );
      } else {
        audio.play('page');
        if (!wallMeal(before, view) && before.shield <= view.shield)
          announce(
            `Shift complete. Day ${view.day}, ${view.shift}. Food ${view.food}, water ${view.water}.`,
          );
      }
    } catch (error) {
      announce(error.message);
    }
  }
  function moveItem(to, slot = null) {
    if (!selection.item) {
      announce('Choose a supply first.');
      return;
    }
    const id = selection.item;
    if (view.wall.some((i) => i.id === id) && to === 'wall') return;
    if (action({ type: 'moveItem', itemId: id, to }, null)) {
      if (to === 'wall' && slot != null) {
        const previous = slots.indexOf(id);
        slots[previous] = null;
        slots[slot] = id;
        render();
      }
      audio.play('drop');
      announce(
        `${to === 'wall' ? 'Wall filled' : 'Supply moved to shelf'}. Shield ${Math.round(view.shield * 100)}%.`,
      );
    }
  }
  page.addEventListener(
    'toggle',
    (event) => {
      if (event.target.classList.contains('source-stamp') && event.target.open)
        audio.play('radio');
    },
    { capture: true, signal: lifecycle.signal },
  );
  page.addEventListener(
    'change',
    (event) => {
      if (event.target.id === 'item-recipient')
        selection.recipient = event.target.value;
    },
    { signal: lifecycle.signal },
  );
  page.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.classVote && classroomPending) {
        classroomSeen.add(classroomPending.donkiId);
        if (button.dataset.classVote === 'shelter')
          for (const crew of view.crew.filter(
            (crew) => crew.status !== 'medevac',
          ))
            act(run, { type: 'assignCrew', crewId: crew.id, task: 'shelter' });
        view = getShiftView(run);
        render();
        page.querySelector('[data-action="end"]')?.focus();
      } else if (button.dataset.crew) {
        selection.crew = button.dataset.crew;
        render();
        announce(
          `Selected ${selection.crew === 'bolt' ? 'BOLT' : view.crew.find((c) => c.id === selection.crew).name}. Choose a task.`,
        );
      } else if (button.dataset.task) {
        if (
          action(
            {
              type: 'assignCrew',
              crewId: selection.crew,
              task: button.dataset.task,
            },
            `Task set: ${TASK_LABELS[button.dataset.task]}.`,
          )
        )
          audio.play('tap');
      } else if (button.hasAttribute('data-item')) {
        if (button.dataset.item) {
          selection.item = button.dataset.item;
          render();
          announce('Supply selected. Move it or use it below the shelf.');
        } else moveItem('wall', Number(button.dataset.slot));
      } else if (button.dataset.choice != null) {
        const choice = Number(button.dataset.choice);
        const pending = view.pendingEvent;
        if (
          action(
            { type: 'chooseEvent', eventId: pending.id, choice },
            `${pending.text} ${pending.choices[choice]}`,
          )
        ) {
          logs.push({
            source: 'GAME',
            text: `${pending.text} ${pending.choices[choice]}`,
          });
          render();
          page.querySelector('[data-action="end"]')?.focus();
        }
      } else {
        switch (button.dataset.action) {
          case 'coach-next':
            coachStep++;
            render();
            page.querySelector('[data-action="coach-next"]')?.focus();
            break;
          case 'coach-skip':
            coachStep = 3;
            render();
            page.querySelector('h1')?.focus();
            break;
          case 'end':
            finishShift();
            break;
          case 'move':
            moveItem(
              view.wall.some((i) => i.id === selection.item)
                ? 'pantry'
                : 'wall',
            );
            break;
          case 'use': {
            const item = view.wall
              .concat(view.pantry)
              .find((i) => i.id === selection.item);
            if (!item) break;
            const wallFood =
              view.wall.some((i) => i.id === item.id) &&
              ['water', 'food'].includes(item.type);
            if (
              action(
                {
                  type: ['water', 'food'].includes(item.type)
                    ? 'consume'
                    : 'useItem',
                  itemId: item.id,
                  crewId: selection.recipient,
                },
                wallFood
                  ? null
                  : `${item.name} used. Supplies and crew update now; daily meals settle at midnight.`,
              )
            )
              audio.play('tap');
            break;
          }
          case 'recall':
          case 'keep':
            if (
              action({
                type:
                  button.dataset.action === 'recall'
                    ? 'recallAll'
                    : 'keepWorking',
              })
            )
              finishShift();
            break;
          case 'sound':
            sound = !sound;
            if (sound)
              void audio
                .unlock()
                .then(() => {
                  if (!disposed && sound) {
                    audio.setSettings({ mute: false });
                    audio.setTheme('shelter');
                  }
                })
                .catch(() => {
                  sound = false;
                  render();
                  announce('Sound unavailable. All warnings stay visible.');
                });
            else {
              audio.setSettings({ mute: true });
              audio.stopAll();
            }
            render();
            break;
          case 'exit':
            dispose();
            onExit?.();
            break;
          case 'replay':
            dispose();
            onReplay?.();
            break;
        }
      }
    },
    { signal: lifecycle.signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        sound = false;
        audio.stopAll();
        render();
      }
    },
    { signal: lifecycle.signal },
  );
  window.addEventListener('pagehide', () => dispose(), {
    signal: lifecycle.signal,
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    lifecycle.abort();
    clearTimeout(turnTimer);
    page.querySelector('dialog')?.close();
    void audio.dispose();
  }
  render();
  if (disposed) return dispose;
  page.querySelector('h1').focus({ preventScroll: true });
  announce(
    `Day ${view.day}, ${view.shift}. Choose crew tasks and fill the wall before finishing the shift.`,
  );
  if (view.resolving && !view.interrupt && !view.pendingEvent) finishShift();
  return dispose;
}
