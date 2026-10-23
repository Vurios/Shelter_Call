import { escape } from '../../ui/shelter/view.js';
import { itemIcon } from '../../art/items.js';

// Same composition as the 3D cutaway: pockets wrap the pod, outside crew stand past the airlock.
const POCKETS = [
  [330, 250, 'back'],
  [455, 250, 'back'],
  [580, 250, 'back'],
  [275, 330, 'side'],
  [635, 330, 'side'],
  [330, 420, 'front'],
  [455, 420, 'front'],
  [580, 420, 'front'],
];
const mood = (crew, view) =>
  crew.status === 'rad-sick' || crew.hunger || crew.thirst
    ? 'tired'
    : view.morale < 3
      ? 'worried'
      : 'calm';
/** Detached public view only. This is also the immediate/loading and context-loss view. */
export function illustratedRoom(view, slots) {
  const supplies = slots.map((id) => view.wall.find((item) => item.id === id));
  const inside = view.crew.filter(
    (c) => c.status !== 'medevac' && c.assignment === 'shelter',
  );
  const outside = view.crew.filter(
    (c) => c.status !== 'medevac' && c.assignment !== 'shelter',
  );
  const share = Math.max(0, Math.min(1, view.shield / 0.9));
  const ring = 2 * Math.PI * 205;
  const low = view.power <= 2;
  const pocket = ([x, y, row], item, i) => {
    const h = row === 'back' ? 74 : row === 'side' ? 58 : 40;
    const body = item
      ? `<rect x="-52" y="${-h}" width="104" height="${h}" rx="16" fill="${item.type === 'water' ? '#9cc7d8' : '#d3bf98'}"/><path d="M-26 ${-h + 4}v${h - 8}M26 ${-h + 4}v${h - 8}" stroke="#5f4b3a" stroke-width="5"/><circle cx="0" cy="${-h - 2}" r="21" fill="#fff2d5"/><image href="/assets/icons/${itemIcon(item.type)}.svg" x="-16" y="${-h - 18}" width="32" height="32"/>`
      : `<path d="M-52 -8h104M-36 -${h}v${h}M36 -${h}v${h}" stroke="#93a8b4" stroke-width="5"/><path d="m-40 -4 16-8m8 8 16-8m8 8 16-8" stroke="#ec9384" stroke-width="6"/>`;
    return `<g transform="translate(${x} ${y})"><title>${item ? `Wall slot ${i + 1}: ${escape(item.name ?? item.type)}` : `Empty wall slot ${i + 1}`}</title><rect x="-58" y="-6" width="116" height="12" rx="4" fill="#22394a"/>${body}</g>`;
  };
  return `<svg viewBox="0 0 960 560" role="img" aria-label="Lunar shelter, crew pod and supply wall" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="room-wall" x2="0" y2="1"><stop stop-color="#4b6271"/><stop offset="1" stop-color="#5d7482"/></linearGradient><linearGradient id="room-floor" x2="0" y2="1"><stop stop-color="#c99a76"/><stop offset="1" stop-color="#a97c5e"/></linearGradient><radialGradient id="room-glow"><stop stop-color="#ffc477" stop-opacity="${low ? 0.12 : 0.32}"/><stop offset="1" stop-color="#ffc477" stop-opacity="0"/></radialGradient></defs>
  <path fill="#0d1823" d="M0 0h960v560H0z"/><path fill="#56636c" d="M0 470 960 450V560H0z"/>
  <path fill="#77838a" d="M150 470V250Q150 70 520 60 890 70 900 250V470Z"/>
  <path fill="url(#room-wall)" d="M185 470V255Q185 105 520 98 860 105 865 255V470Z"/>
  <path d="M300 104v366M520 98v372M740 104v366" stroke="#93a8b4" stroke-width="9" opacity=".7"/>
  <path fill="url(#room-floor)" d="M150 470 185 395H865L900 470Z"/><path d="M150 470H900" stroke="#edb96f" stroke-width="8"/>
  <ellipse cx="455" cy="300" rx="330" ry="210" fill="url(#room-glow)"/>
  <rect x="380" y="112" width="150" height="10" rx="5" fill="${view.power > 0 ? (low ? '#a4825a' : '#ffc477') : '#3b3020'}"/>
  ${low ? '<path d="M195 465H855" stroke="#ec9384" stroke-width="4" stroke-dasharray="14 10"/>' : ''}
  <g transform="translate(205 320)"><circle r="62" fill="#8297a4" stroke="#edb96f" stroke-width="9"/><circle r="26" fill="#243d50"/></g>
  <ellipse cx="455" cy="370" rx="205" ry="78" fill="none" stroke="#243d50" stroke-width="10"/>
  <ellipse cx="455" cy="370" rx="205" ry="78" fill="none" stroke="#edb96f" stroke-width="10" stroke-dasharray="${(share * ring).toFixed(1)} ${ring.toFixed(1)}" pathLength="${ring.toFixed(1)}"/>
  ${POCKETS.slice(0, 5)
    .map((p, i) => pocket(p, supplies[i], i))
    .join('')}
  ${inside
    .map(
      (crew, i) =>
        `<g transform="translate(${455 + (i - (inside.length - 1) / 2) * 92} 0)"><ellipse cx="0" cy="404" rx="44" ry="11" fill="#0d1823" opacity=".3"/><image href="/assets/portraits/${crew.id}-${mood(crew, view)}.svg" x="-50" y="300" width="100" height="100"/><title>${escape(crew.name)}: in shelter</title></g>`,
    )
    .join('')}
  ${POCKETS.slice(5)
    .map((p, i) => pocket(p, supplies[i + 5], i + 5))
    .join('')}
  <g transform="translate(745 300)"><rect x="-60" y="0" width="120" height="70" rx="6" fill="#3a5260"/><rect x="-66" y="-6" width="132" height="10" rx="4" fill="#edb96f"/>${view.radio ? `<rect x="-48" y="-40" width="56" height="34" rx="6" fill="#b8a4da"/><rect x="-40" y="-33" width="40" height="18" rx="3" fill="${view.power > 0 ? '#86cda1' : '#526975'}"/>` : '<rect x="-48" y="-12" width="56" height="8" rx="3" fill="#1b2a36"/><text x="-20" y="-20" font-size="15" text-anchor="middle" fill="#fff2d5">No radio</text>'}${view.dosimeter ? '<rect x="18" y="-30" width="26" height="24" rx="4" fill="#fff2d5"/>' : ''}<title>Sun Watch desk</title></g>
  ${view.wall.concat(view.pantry).some((item) => item.type === 'seeds') ? `<image href="/assets/plant/${view.broken || view.power <= 0 ? 'worried' : view.plant > 5 ? 'proud' : 'content'}.svg" x="790" y="370" width="84" height="92"/>` : ''}
  ${view.boltTask != null ? `<image href="/assets/portraits/bolt.svg" x="${view.boltTask === 'shelter' ? 220 : 40}" y="${view.boltTask === 'shelter' ? 392 : 400}" width="70" height="74"/>` : ''}
  ${outside
    .map(
      (crew, i) =>
        `<g transform="translate(${70 + (i % 2) * 70} ${300 + i * 30})"><ellipse cx="0" cy="108" rx="34" ry="9" fill="#0d1823" opacity=".3"/><image href="/assets/portraits/${crew.id}-${mood(crew, view)}.svg" x="-38" y="30" width="76" height="76"/><circle cx="30" cy="34" r="16" fill="#d6e9ed"/><image href="/assets/icons/${crew.assignment}.svg" x="19" y="23" width="22" height="22"/><title>${escape(crew.name)}: outside</title></g>`,
    )
    .join('')}
  </svg>`;
}
