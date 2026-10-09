import { illustratedRoom } from '../../scenes/shelter/illustrated.js';
import { t } from '../../i18n/index.js';

/** Scene lifetime is independent of journal DOM replacement and engine lifetime. */
export function createHabitat(settings) {
  const host = document.createElement('div');
  host.className = 'habitat-room';
  const drawing = document.createElement('div');
  drawing.className = 'habitat-illustration';
  const stage = document.createElement('div');
  stage.className = 'habitat-webgl';
  host.append(drawing, stage);
  host.dataset.renderer = 'illustrated';
  const hotspots = document.createElement('div');
  hotspots.className = 'room-hotspots';
  hotspots.innerHTML = `<button type="button" data-room-inspector="wall" data-key="room-wall">${t('Supplies')}</button><button type="button" data-room-inspector="radio" data-key="room-radio">${t('Sun Watch')}</button>`;
  host.append(hotspots);
  let scene,
    disposed = false,
    latest,
    signature;
  const reduced =
    settings.motion === 'reduced' ||
    (settings.motion !== 'full' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches);
  const illustrated = settings.flat || settings.graphics === 'illustrated';
  if (!illustrated)
    import('../../scenes/shelter/room3d.js')
      .then(({ createRoom }) => {
        if (disposed) return;
        scene = createRoom(stage, {
          quality: settings.graphics ?? 'auto',
          reducedMotion: reduced,
          onLoss: () => {
            scene?.dispose();
            scene = null;
            drawing.hidden = false;
            host.dataset.renderer = 'illustrated';
          },
        });
        if (latest) scene.update(latest.view, latest.slots);
        drawing.hidden = true;
        host.dataset.renderer = '3d';
      })
      .catch(() => {
        scene?.dispose();
        scene = null;
        drawing.hidden = false;
        host.dataset.renderer = 'illustrated';
      });
  return {
    arrange(page, view, slots, tab) {
      latest = { view, slots: [...slots] };
      const nextSignature = JSON.stringify([
        view.crew,
        view.wall,
        view.pantry,
        view.power,
        view.plant,
        view.broken,
        view.morale,
        view.boltTask,
        slots,
      ]);
      if (signature !== nextSignature) {
        drawing.innerHTML = illustratedRoom(view, slots);
        scene?.update(view, slots);
        signature = nextSignature;
      }
      host.dataset.outside = view.crew.filter(
        (crew) => crew.status !== 'medevac' && crew.assignment !== 'shelter',
      ).length;
      const columns = page.querySelector('.journal-columns'),
        crew = page.querySelector('.crew-panel');
      const taskBoard = crew.querySelector('.task-board');
      taskBoard.after(
        crew.querySelector('.meter-note'),
        crew.querySelector('.section-note'),
      );
      const strip = page.querySelector('.crew-board'),
        log = page.querySelector('.shift-log');
      const wall = page.querySelector('.wall-panel'),
        radios = [...page.querySelectorAll('.journal-radio')];
      const layout = document.createElement('div');
      layout.className = 'habitat-layout';
      const left = document.createElement('section');
      left.className = 'habitat-main';
      left.setAttribute('aria-label', t('Living shelter'));
      const roomTitle = document.createElement('div');
      roomTitle.className = 'habitat-caption';
      roomTitle.innerHTML = `<strong>${t('LUNAR FIELD STATION')}</strong><span>${t('A small home. A shared plan.')}</span>`;
      left.append(roomTitle, host, strip);
      const inspector = document.createElement('aside');
      inspector.className = 'habitat-inspector';
      inspector.setAttribute('aria-label', t('Shelter inspector'));
      const nav = document.createElement('nav');
      nav.className = 'inspector-tabs';
      nav.setAttribute('aria-label', t('Shelter tools'));
      nav.innerHTML = [
        ['crew', 'Crew'],
        ['wall', 'Supplies'],
        ['radio', 'Sun Watch'],
        ['log', 'Journal'],
      ]
        .map(
          ([id, label]) =>
            `<button type="button" data-inspector="${id}" data-key="inspector-${id}" aria-pressed="${tab === id}" aria-controls="inspector-${id}">${t(label)}</button>`,
        )
        .join('');
      inspector.append(nav);
      const panels = { crew: [crew], wall: [wall], radio: radios, log: [log] };
      for (const [id, content] of Object.entries(panels)) {
        const panel = document.createElement('div');
        panel.className = 'inspector-content';
        panel.id = `inspector-${id}`;
        panel.hidden = id !== tab;
        content.forEach((el) => panel.append(el));
        inspector.append(panel);
      }
      layout.append(left, inspector);
      columns.replaceWith(layout);
    },
    metrics: () => scene?.metrics(),
    dispose() {
      disposed = true;
      scene?.dispose();
      scene = null;
      host.remove();
    },
  };
}
