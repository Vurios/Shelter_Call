import { PALETTE as P, CREW_STYLE } from '../../art/palette.js';
import { phrase, t } from '../../i18n/index.js';
import { itemIcon } from '../../art/items.js';

/** Illustrated field-map view. Projection changes no controls or physical state. */
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
  const images = new Map();
  function illustration(path) {
    if (!images.has(path)) {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/${path}.svg`;
      images.set(path, image);
    }
    const image = images.get(path);
    return image.complete && image.naturalWidth ? image : null;
  }
  Object.keys(CREW_STYLE).forEach((id) => illustration(`portraits/${id}-calm`));
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    scale =
      Math.min(width, height) / (view * (width / height < 0.8 ? 0.75 : 1));
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
  function shadow(x, z, radius, opacity = 0.25) {
    const p = project(x, z);
    context.beginPath();
    context.ellipse(
      p.x + radius * scale * 0.25,
      p.y + 2,
      radius * scale,
      radius * scale * 0.35,
      -0.2,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `rgba(16,29,42,${opacity})`;
    context.fill();
  }
  function panel(x, y, w, h, color, radius = 4) {
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = P.ink;
    context.lineWidth = 1.5;
    context.stroke();
  }
  function habitat(station) {
    const p = project(station.x, station.z),
      unit = scale;
    shadow(station.x, station.z, 1.8);
    context.save();
    context.translate(p.x, p.y);
    if (station.id === 'rover-bay') {
      for (const x of [-1.15, 0.75])
        panel(x * unit, -0.65 * unit, 0.4 * unit, 1.05 * unit, P.ink);
      panel(-1.2 * unit, -1.8 * unit, 2.4 * unit, 1.9 * unit, P.paper, 6);
      panel(-0.85 * unit, -1.5 * unit, 1.7 * unit, 0.8 * unit, P.blue);
    } else {
      panel(-1.55 * unit, -1.5 * unit, 3.1 * unit, 1.7 * unit, P.regolith, 5);
      panel(-1.55 * unit, -2 * unit, 3.1 * unit, 1.55 * unit, P.paper, 8);
      panel(
        -1.25 * unit,
        -1.75 * unit,
        2.5 * unit,
        0.28 * unit,
        station.id === 'greenhouse' ? P.leaf : P.amber,
        2,
      );
      for (const x of [-0.95, 0.15])
        panel(x * unit, -1.14 * unit, 0.8 * unit, 0.5 * unit, P.blue, 2);
      if (station.id === 'comms') {
        context.strokeStyle = P.ink;
        context.beginPath();
        context.moveTo(0.7 * unit, -2 * unit);
        context.lineTo(0.7 * unit, -2.8 * unit);
        context.stroke();
        panel(0.3 * unit, -3 * unit, 0.8 * unit, 0.2 * unit, P.amber, 2);
      }
    }
    context.restore();
    label(
      station.id === 'rover-bay'
        ? 'Rover'
        : station.id[0].toUpperCase() + station.id.slice(1),
      station.x,
      station.z - 2.35,
    );
  }
  function astronaut(body, player, reducedMotion) {
    const elevation = (body.y || 0) * (reducedMotion ? 0.15 : 1);
    const p = project(body.x, body.z);
    const unit = scale * (player ? 1.05 : 0.9);
    const id = player ? 'pip' : body.id;
    const color = P[CREW_STYLE[id].color];
    const step =
      !reducedMotion && Math.hypot(body.vx || 0, body.vz || 0) > 0.12
        ? Math.sin(visualTime * 7) * 0.12
        : 0;
    shadow(body.x, body.z, 0.7 + elevation * 0.2, 0.3 / (1 + elevation));
    context.save();
    context.translate(p.x, p.y - elevation * scale * 0.7);
    if (player && !reducedMotion && visualTime < landUntil)
      context.scale(1.05, 0.95);
    panel(
      -0.47 * unit,
      -0.5 * unit + step * unit,
      0.4 * unit,
      0.5 * unit,
      P.ink,
      3,
    );
    panel(
      0.07 * unit,
      -0.5 * unit - step * unit,
      0.4 * unit,
      0.5 * unit,
      P.ink,
      3,
    );
    panel(-0.55 * unit, -1.32 * unit, 1.1 * unit, 0.94 * unit, P.paper, 5);
    panel(-0.67 * unit, -1.26 * unit, 0.25 * unit, 0.72 * unit, color, 3);
    panel(0.42 * unit, -1.26 * unit, 0.25 * unit, 0.72 * unit, color, 3);
    panel(-0.25 * unit, -0.91 * unit, 0.5 * unit, 0.26 * unit, color, 2);
    const portrait = illustration(`portraits/${id}-calm`);
    if (portrait)
      context.drawImage(
        portrait,
        15,
        6,
        130,
        114,
        -0.71 * unit,
        -2.25 * unit,
        1.42 * unit,
        1.25 * unit,
      );
    else {
      panel(-0.6 * unit, -2.18 * unit, 1.2 * unit, 1.1 * unit, P.white, 8);
      panel(-0.46 * unit, -1.98 * unit, 0.92 * unit, 0.6 * unit, P.ink, 5);
    }
    context.restore();
    if (player) {
      const angle = Math.atan2(
        body.vz || Math.cos(body.heading),
        body.vx || Math.sin(body.heading),
      );
      context.save();
      context.translate(p.x, p.y + 3);
      context.rotate(angle);
      context.beginPath();
      context.moveTo(unit * 1.08, 0);
      context.lineTo(unit * 0.62, -unit * 0.2);
      context.lineTo(unit * 0.62, unit * 0.2);
      context.closePath();
      context.fillStyle = P.amber;
      context.fill();
      context.restore();
    }
    label(
      player ? 'YOU' : body.name,
      body.x,
      body.z - elevation * 0.7 - 2.4,
      player ? P.paper : P.white,
    );
  }
  function render(state, delta, { reducedMotion = false } = {}) {
    visualTime += delta;
    labels.length = 0;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 3);
    const follow = width / height < 0.8 ? 0.7 : 0.35;
    center.x += (state.player.x * follow - center.x) * ease;
    center.z += (state.player.z * follow - center.z) * ease;
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
    for (const crater of state.craters) {
      const p = project(crater.x, crater.z),
        r = crater.scale * 1.3 * scale;
      context.beginPath();
      context.ellipse(p.x, p.y, r, r * 0.68, -0.2, 0, Math.PI * 2);
      context.fillStyle = '#6c8290';
      context.fill();
      context.strokeStyle = '#adc0c6';
      context.lineWidth = 2;
      context.stroke();
      context.beginPath();
      context.ellipse(
        p.x + r * 0.1,
        p.y + r * 0.15,
        r * 0.72,
        r * 0.35,
        -0.2,
        0,
        Math.PI * 2,
      );
      context.fillStyle = '#536c7b';
      context.fill();
    }
    const layers = [];
    for (const rock of state.rocks)
      layers.push({
        z: rock.z,
        draw() {
          const p = project(rock.x, rock.z),
            r = rock.scale * scale;
          shadow(rock.x, rock.z, rock.scale);
          context.beginPath();
          context.moveTo(p.x - r, p.y);
          context.lineTo(p.x - r * 0.65, p.y - r * 0.85);
          context.lineTo(p.x + r * 0.35, p.y - r * 1.15);
          context.lineTo(p.x + r, p.y - r * 0.3);
          context.lineTo(p.x + r * 0.7, p.y + r * 0.2);
          context.closePath();
          context.fillStyle = '#536c7b';
          context.fill();
          context.strokeStyle = P.ink;
          context.lineWidth = 1;
          context.stroke();
          context.beginPath();
          context.moveTo(p.x - r * 0.65, p.y - r * 0.85);
          context.lineTo(p.x, p.y - r * 0.45);
          context.lineTo(p.x + r * 0.35, p.y - r * 1.15);
          context.strokeStyle = '#adc0c6';
          context.stroke();
        },
      });
    for (const station of state.stations)
      layers.push({ z: station.z, draw: () => habitat(station) });
    layers.push({
      z: 0,
      draw() {
        const p = project(0, 0);
        shadow(0, 0, 1.9);
        panel(
          p.x - 1.65 * scale,
          p.y - 1.9 * scale,
          3.3 * scale,
          2 * scale,
          P.regolith,
          8,
        );
        panel(
          p.x - 1.1 * scale,
          p.y - 1.95 * scale,
          2.2 * scale,
          1.9 * scale,
          P.amber,
          6,
        );
        panel(
          p.x - 0.73 * scale,
          p.y - 1.5 * scale,
          1.46 * scale,
          1.55 * scale,
          P.ink,
          5,
        );
        panel(
          p.x - 0.4 * scale,
          p.y - 1.3 * scale,
          0.8 * scale,
          1.2 * scale,
          P.paper,
          3,
        );
        label('HATCH', 0, -2.35, P.paper);
      },
    });
    for (const item of state.items)
      if (item.status === 'outside')
        layers.push({
          z: item.z,
          draw() {
            const p = project(item.x, item.z),
              size = Math.max(14, scale * (item.slots === 2 ? 1.1 : 0.9));
            shadow(item.x, item.z, 0.5);
            panel(p.x - size / 2, p.y - size, size, size, P.paper, 3);
            const icon = illustration(`icons/${itemIcon(item.type)}`);
            if (icon)
              context.drawImage(
                icon,
                p.x - size * 0.4,
                p.y - size * 0.9,
                size * 0.8,
                size * 0.8,
              );
            if (
              !['food', 'water'].includes(item.type) &&
              state.target &&
              Math.hypot(item.x - state.target.x, item.z - state.target.z) < 0.9
            )
              label(
                item.type === 'dosimeter' ? 'Dose' : item.type,
                item.x,
                item.z - 1.3,
              );
          },
        });
    for (const crew of state.crew)
      if (crew.status !== 'saved')
        layers.push({
          z: crew.z,
          draw: () => astronaut(crew, false, reducedMotion),
        });
    layers.push({
      z: state.player.z,
      draw: () => astronaut(state.player, true, reducedMotion),
    });
    layers.sort((a, b) => a.z - b.z).forEach((layer) => layer.draw());
    const hatch = project(0, 0);
    if (
      hatch.x < 38 ||
      hatch.x > width - 38 ||
      hatch.y < 26 ||
      hatch.y > height - 26
    ) {
      const angle = Math.atan2(hatch.y - height / 2, hatch.x - width / 2);
      const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
      context.font = 'bold 12px "Atkinson Hyperlegible", sans-serif';
      context.textAlign = 'center';
      const x = Math.max(40, Math.min(width - 40, hatch.x)),
        y = Math.max(26, Math.min(height - 26, hatch.y));
      panel(x - 36, y - 15, 72, 24, P.amber, 5);
      context.fillStyle = P.ink;
      context.fillText(
        `${arrows[(Math.round(angle / (Math.PI / 4)) + 8) % 8]} ${t('HATCH')}`,
        x,
        y + 1,
      );
    }
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
