import { escape } from '../../ui/shelter/view.js';
import { itemIcon } from '../../art/items.js';

/** Detached public view only. This is also the immediate/loading and context-loss view. */
export function illustratedRoom(view, slots) {
  const supplies = slots.map((id) => view.wall.find((item) => item.id === id));
  return `<svg viewBox="0 0 960 560" role="img" aria-label="Lunar shelter, crew and supply wall" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="room-wall" x2="0" y2="1"><stop stop-color="#243d50"/><stop offset="1" stop-color="#526975"/></linearGradient><linearGradient id="room-floor" x2="0" y2="1"><stop stop-color="#edb96f"/><stop offset="1" stop-color="#bd8965"/></linearGradient><radialGradient id="room-glow"><stop stop-color="#fff2d5" stop-opacity=".25"/><stop offset="1" stop-color="#fff2d5" stop-opacity="0"/></radialGradient></defs>
  <path fill="#101d2a" d="M0 0h960v560H0z"/><path fill="#344b5b" d="M0 250 90 210 190 255 320 174 490 250 640 214 800 275 960 230V560H0z"/>
  <path fill="url(#room-wall)" stroke="#8297a4" stroke-width="14" d="M96 342V162L170 73H774L862 151V344Z"/>
  <path fill="url(#room-floor)" stroke="#101d2a" stroke-width="12" d="M96 340H862L924 487 819 530H137L43 483Z"/>
  <path d="M172 80v261m148-261v261m318-261v261m134-261v261M112 393h771M83 459h818M243 344l-47 177m511-177 54 177" fill="none" stroke="#101d2a" stroke-width="5" opacity=".35"/>
  <ellipse cx="470" cy="256" rx="280" ry="190" fill="url(#room-glow)"/>
  <path d="M122 188q0-40 40-40h48q40 0 40 40v154H122z" fill="#101d2a" stroke="#edb96f" stroke-width="9"/><rect x="144" y="179" width="82" height="114" rx="32" fill="#526975"/><path d="M185 182v111m-25-58h50" stroke="#8297a4" stroke-width="6"/>
  <ellipse cx="469" cy="137" rx="93" ry="47" fill="#101d2a" stroke="#edb96f" stroke-width="10"/><path d="m397 155 41-29 36 19 39-43 35 54" fill="#8297a4"/><circle cx="500" cy="116" r="11" fill="#67bbe0"/>
  <path d="M724 240h102l21 114H702z" fill="#101d2a" stroke="#8297a4" stroke-width="6"/><rect x="733" y="251" width="80" height="44" rx="5" fill="${view.radio && view.power > 0 ? '#86cda1' : '#526975'}"/><path d="m742 275 13-9 14 12 16-20 17 11" fill="none" stroke="#101d2a" stroke-width="4"/>
  ${supplies.map((item, i) => `<g transform="translate(${287 + (i % 4) * 83} ${209 + Math.floor(i / 4) * 63})"><rect width="75" height="57" rx="7" fill="#101d2a" stroke="#8297a4" stroke-width="3"/>${item ? `<rect x="5" y="5" width="65" height="47" rx="5" fill="${item.type === 'water' ? '#67bbe0' : '#fff2d5'}"/><image href="/assets/icons/${itemIcon(item.type)}.svg" x="18" y="10" width="39" height="36"/>` : '<path d="m25 19 24 20m0-20-24 20" stroke="#8297a4" stroke-width="3"/>'}</g>`).join('')}
  ${view.crew
    .map((crew, i) => {
      const away = crew.assignment !== 'shelter';
      const x = 245 + i * 143;
      return `<g opacity="${crew.status === 'medevac' ? '.25' : 1}" transform="translate(${x} ${away ? 5 : 0})"><ellipse cx="0" cy="477" rx="57" ry="15" fill="#101d2a" opacity=".24"/><rect x="-31" y="432" width="25" height="46" rx="10" fill="#101d2a"/><rect x="7" y="432" width="25" height="46" rx="10" fill="#101d2a"/><image href="/assets/portraits/${crew.id}-${crew.status === 'rad-sick' || crew.hunger || crew.thirst ? 'tired' : view.morale < 3 ? 'worried' : 'calm'}.svg" x="-63" y="318" width="126" height="126"/><title>${escape(crew.name)}: ${escape(crew.assignment)}</title></g>`;
    })
    .join('')}
  ${view.wall.concat(view.pantry).some((item) => item.type === 'seeds') ? '<image href="/assets/plant/content.svg" x="766" y="335" width="96" height="105"/>' : ''}
  ${view.boltTask != null ? '<image href="/assets/portraits/bolt.svg" x="104" y="370" width="88" height="94"/>' : ''}
  </svg>`;
}
