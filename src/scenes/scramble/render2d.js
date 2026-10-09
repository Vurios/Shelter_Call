import { PALETTE as P, CREW_STYLE } from '../../art/palette.js';
import { phrase, t } from '../../i18n/index.js';

/** The same scene state, with an inexpensive top-down canvas. */
export function create2DRenderer(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scramble-canvas';
  canvas.setAttribute(
    'aria-label',
    t('Lunar outpost. Tap a point to hop there.'),
  );
  canvas.tabIndex = 0;
  host.prepend(canvas);
  const context = canvas.getContext('2d');
  const textScale =
    parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  let width = 1,
    height = 1,
    scale = 1,
    view = 30;
  const center = { x: 0, z: 0 };
  const labels = [];
  let visualTime = 0,
    waveStarted = -Infinity,
    landUntil = 0;
  const dust = [];
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    scale = Math.min(width, height) / view;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const project = (x, z) => ({
    x: width / 2 + (x - center.x) * scale,
    y: height / 2 + (z - center.z) * scale,
  });
  function circle(x, z, radius, fill, stroke) {
    const p = project(x, z);
    context.beginPath();
    context.arc(p.x, p.y, radius * scale, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 2;
      context.stroke();
    }
  }
  function label(text, x, z, color = P.white) {
    labels.push({ text, x, z, color });
  }
  function render(state, delta, { reducedMotion = false } = {}) {
    visualTime += delta;
    labels.length = 0;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 3);
    center.x += (state.player.x * 0.35 - center.x) * ease;
    center.z += (state.player.z * 0.35 - center.z) * ease;
    context.fillStyle = P.ink;
    context.fillRect(0, 0, width, height);
    circle(0, 0, 23, P.regolith);
    if (!reducedMotion) {
      for (const particle of dust)
        if (visualTime - particle.at < 0.5)
          circle(
            particle.x + particle.dx * (visualTime - particle.at),
            particle.z + particle.dz * (visualTime - particle.at),
            0.05,
            P.paper,
          );
      if (visualTime - waveStarted < 1.6) {
        const point = project(0, 0);
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          (1 + (visualTime - waveStarted) * 18) * scale,
          0,
          Math.PI * 2,
        );
        context.strokeStyle = P.blue;
        context.lineWidth = 3;
        context.stroke();
      }
    }
    for (const crater of state.craters)
      circle(crater.x, crater.z, crater.scale * 1.3, '#6c8290', '#758c99');
    for (const rock of state.rocks) circle(rock.x, rock.z, rock.scale, P.ink);
    for (const station of state.stations) {
      circle(station.x, station.z, 1.3, '#d3dee3', P.ink);
      label(
        station.id === 'rover-bay'
          ? 'Rover'
          : station.id[0].toUpperCase() + station.id.slice(1),
        station.x,
        station.z - 1.6,
      );
    }
    circle(0, 0, 1.65, P.amber, P.paper);
    label('HATCH', 0, -2, P.paper);
    for (const item of state.items)
      if (item.status === 'outside') {
        circle(
          item.x,
          item.z,
          item.slots === 2 ? 0.36 : 0.25,
          item.type === 'water'
            ? P.blue
            : item.type === 'food'
              ? P.paper
              : P.leaf,
          P.ink,
        );
        if (
          !['food', 'water'].includes(item.type) &&
          state.target &&
          Math.hypot(item.x - state.target.x, item.z - state.target.z) < 0.9
        )
          label(
            item.type === 'dosimeter' ? 'Dose' : item.type,
            item.x,
            item.z - 0.55,
          );
      }
    for (const crew of state.crew)
      if (crew.status !== 'saved') {
        const height = reducedMotion ? crew.y * 0.15 : crew.y;
        circle(crew.x, crew.z, 0.6 + height * 0.2, '#101d2a44');
        circle(
          crew.x,
          crew.z - height * 0.7,
          0.53,
          P[CREW_STYLE[crew.id].color],
          P.ink,
        );
        label(crew.name, crew.x, crew.z - 0.85);
      }
    const playerHeight = reducedMotion ? state.player.y * 0.15 : state.player.y;
    circle(
      state.player.x,
      state.player.z,
      0.8 + playerHeight * 0.25,
      '#101d2a66',
    );
    circle(
      state.player.x,
      state.player.z - playerHeight * 0.7,
      0.72 *
        (reducedMotion
          ? 1
          : visualTime < landUntil
            ? 1.12
            : 1 + Math.min(0.08, state.player.y * 0.05)),
      P.white,
      P.amber,
    );
    const p = project(state.player.x, state.player.z - playerHeight * 0.7);
    context.fillStyle = P.ink;
    context.fillRect(p.x - 6, p.y - 3, 12, 6);
    label('YOU', state.player.x, state.player.z - 1.2, P.paper);
    if (state.target) {
      const target = project(state.target.x, state.target.z);
      context.strokeStyle = P.paper;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(target.x, target.y, 7, 0, Math.PI * 2);
      context.stroke();
    }
    const occupied = [];
    const priority = (text) =>
      text === 'YOU'
        ? 0
        : text === 'HATCH'
          ? 1
          : state.crew.some((c) => c.name === text)
            ? 2
            : 3;
    labels.sort((a, b) => priority(a.text) - priority(b.text));
    context.font = `bold ${12 * textScale}px "Atkinson Hyperlegible", sans-serif`;
    context.textAlign = 'center';
    context.lineWidth = 4;
    context.strokeStyle = P.ink;
    for (const entry of labels) {
      const text = phrase(entry.text);
      const point = project(entry.x, entry.z),
        size = context.measureText(text).width + 8;
      const offset = [0, -17, 17, -34].find((dy) => {
        const box = {
          left: point.x - size / 2,
          right: point.x + size / 2,
          top: point.y + dy - 14,
          bottom: point.y + dy + 3,
        };
        if (
          box.left < 0 ||
          box.right > width ||
          box.top < 0 ||
          box.bottom > height
        )
          return false;
        if (
          occupied.some(
            (other) =>
              box.left < other.right + 2 &&
              box.right > other.left - 2 &&
              box.top < other.bottom + 2 &&
              box.bottom > other.top - 2,
          )
        )
          return false;
        occupied.push(box);
        return true;
      });
      if (offset === undefined) continue;
      context.strokeText(text, point.x, point.y + offset);
      context.fillStyle = entry.color;
      context.fillText(text, point.x, point.y + offset);
    }
  }
  return {
    canvas,
    render,
    effects(events) {
      for (const event of events) {
        if (event.kind === 'storm') waveStarted = visualTime;
        if (event.kind === 'land') {
          landUntil = visualTime + 0.18;
          dust.splice(0, Math.max(0, dust.length - 24));
          for (let i = 0; i < 6; i++)
            dust.push({
              at: visualTime,
              x: event.x,
              z: event.z,
              dx: Math.cos((i * Math.PI) / 3),
              dz: Math.sin((i * Math.PI) / 3),
            });
        }
      }
    },
    point(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - width / 2) / scale + center.x,
        z: (clientY - rect.top - height / 2) / scale + center.z,
      };
    },
    direction(x, z) {
      return { x, z };
    },
    zoom(factor) {
      view = Math.max(18, Math.min(38, view * factor));
      resize();
    },
    metrics() {
      return {
        calls: 1,
        triangles: 0,
        pixelRatio: Math.min(devicePixelRatio, 1.5),
      };
    },
    dispose() {
      observer.disconnect();
      canvas.remove();
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}
