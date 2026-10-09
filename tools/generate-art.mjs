import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { CREW, ITEM_TYPES, TASKS } from '../src/core/config.js';
import { ENDINGS } from '../src/core/endings.js';
import { createModel, MODEL_IDS } from '../src/art/models.js';
import {
  PALETTE as P,
  CREW_STYLE,
  MOODS,
  PLANT_MOODS,
} from '../src/art/palette.js';

// Node has Blob but not FileReader. Exporter only needs these two operations.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
  async readAsDataURL(blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
    this.onloadend?.();
  }
};
const directory = 'public/assets';
const manifest = {
  version: 1,
  provenance: 'Original project art except licensed fonts',
  models: [],
  portraits: [],
  plant: [],
  illustrations: [],
  textures: [],
  icons: [],
  files: [],
};
const svg = (body, size = '160 160', background = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size}">${background}<g stroke="${P.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
async function save(path, body) {
  await mkdir(`${directory}/${path.split('/').slice(0, -1).join('/')}`, {
    recursive: true,
  });
  await writeFile(`${directory}/${path}`, body);
}
const slug = (name) => name.toLowerCase().replaceAll(' ', '-');

const BADGES = {
  ria: '<path d="M19 8Q3 6 7 23Q23 23 19 8Z"/><path d="m9 21 7-9" fill="none"/>',
  dom: '<path d="m5 9 9 5 9-5M5 18l9 5 9-5" fill="none"/>',
  aiko: '<path d="M14 23 5 14C-1 5 8 1 14 8C20 1 29 5 23 14Z"/>',
  tunde: '<path d="m14 3 11 11-11 11L3 14Z"/>',
  mara: '<path d="M5 23V16h4v7Zm7 0V10h4v13Zm7 0V3h4v20Z"/>',
  iggy: '<path d="m5 4 19 10L5 24l5-10Z"/>',
  sol: '<path d="m8 3 12 0 7 11-7 11H8L1 14Z"/>',
  pip: '<rect x="4" y="4" width="20" height="20" rx="3"/><path d="M8 2v5m12-5v5M8 22v5m12-5v5M2 8h5m15 0h5M2 20h5m15 0h5" fill="none"/>',
};
function expression(mood) {
  const eyes =
    mood === 'tired'
      ? '<path d="m58 77 10 2m25-2 10 2" fill="none"/>'
      : '<ellipse cx="63" cy="78" rx="3" ry="5" fill="' +
        P.ink +
        '"/><ellipse cx="98" cy="78" rx="3" ry="5" fill="' +
        P.ink +
        '"/>';
  const mouth = {
    calm: 'M75 94q6 4 12 0',
    happy: 'M69 92q12 17 24 0Z',
    worried: 'M74 100q7-9 14 0',
    tired: 'M77 97h10',
  }[mood];
  return `${eyes}<path d="${mouth}" fill="${mood === 'happy' ? P.paper : 'none'}"/>${mood === 'worried' ? '<path d="m57 64 12 5m23 0 12-5" fill="none"/>' : ''}`;
}
function portrait(crew, mood) {
  const style = CREW_STYLE[crew.id];
  const color = P[style.color];
  const hair = {
    ria: '<ellipse cx="105" cy="32" rx="15" ry="13"/><path d="M39 67q2-34 42-30q30 0 39 27q-32-18-81 3Z"/>',
    dom: '<path d="M39 65q3-30 42-28q28 0 38 28l-15-13-15 5-14-7-16 7Z"/>',
    aiko: '<path d="M38 94V62q0-30 43-27q42 1 42 30v29l-13 5V62q-20 3-39-11q-10 14-21 14v34Z"/>',
    tunde:
      '<path d="M40 58q-8-16 9-19q4-16 20-9q12-12 24 0q18-4 19 10q18 0 9 20l-14-6-13 5-13-6-17 7-12-7Z"/>',
    mara: '<path d="M39 70q-3-36 39-35q40-1 43 30q-26-6-38-20q-17 20-44 25Z"/>',
    iggy: '<path d="M39 69q1-26 24-33l15-14 4 15 20-14-1 18 18-7-6 28q-32-17-74 7Z"/>',
    sol: '<path d="M39 63q4-29 43-29q33 0 39 30q-42-8-82-1Z"/><path d="M66 91q8-9 14-1q8-8 15 1q-8 8-15 1q-8 6-14-1Z"/>',
    pip: '<path d="M39 69q0-25 25-33l17-15 3 16 19-8-3 14 19 18q-33-11-80 8Z"/>',
  }[crew.id];
  const glasses = ['dom', 'mara'].includes(crew.id)
    ? '<g fill="none"><rect x="50" y="69" width="25" height="20" rx="6"/><rect x="86" y="69" width="25" height="20" rx="6"/><path d="M75 76h11"/></g>'
    : '';
  const gear =
    crew.id === 'mara'
      ? '<path d="M124 74v20l-19 2" fill="none"/><rect x="99" y="91" width="10" height="7" rx="3"/>'
      : crew.id === 'iggy'
        ? '<path d="M43 54h77" stroke-width="9" stroke="#ec9384"/><rect x="60" y="43" width="38" height="14" rx="4" fill="#67bbe0"/>'
        : '';
  return svg(
    `<path d="M22 159v-20q0-27 58-27t58 27v20" fill="${color}"/><path d="M43 125v34m74-34v34" stroke="#fff2d5" stroke-width="9"/><rect x="59" y="111" width="42" height="15" rx="6" fill="${P.ink}"/><ellipse cx="80" cy="72" rx="61" ry="61" fill="${P.white}"/><path d="M75 11h12v14H75z" fill="${color}"/><ellipse cx="80" cy="76" rx="48" ry="43" fill="${P.ink}"/><ellipse cx="80" cy="79" rx="42" ry="37" fill="${style.skin}"/><g fill="${style.hair}">${hair}</g><path d="M34 60q1-14 10-20" stroke="${P.white}" stroke-width="5" fill="none"/>${expression(mood)}${glasses}${gear}<g transform="translate(105 128) scale(.75)" fill="${P.ink}" stroke-width="1.5">${BADGES[crew.id]}</g><rect x="58" y="135" width="31" height="19" rx="3" fill="#fff2d5"/><path d="M64 142h12m-12 6h18" stroke-width="2"/>`,
  );
}
function plant(mood) {
  const tilt = mood === 'thirsty' || mood === 'worried' ? 15 : 0;
  const face = {
    sprout: 'M71 119q9 6 18 0',
    content: 'M71 119q9 6 18 0',
    cheerful: 'M69 116q11 18 22 0Z',
    thirsty: 'M77 122h7',
    worried: 'M72 123q8-7 16 0',
    proud: 'M68 117q12 11 24 0',
  }[mood];
  return svg(
    `<path d="M43 96h74l-9 51H52Z" fill="${P.copper}"/><rect x="39" y="89" width="82" height="14" rx="5" fill="${P.amber}"/><g transform="rotate(${tilt} 80 92)"><path d="M80 92V42" stroke="${P.leaf}" stroke-width="6" fill="none"/><path d="M79 76Q42 80 39 44q33-8 40 32ZM82 66q0-40 37-35q2 33-37 35Z" fill="${P.leaf}"/>${mood !== 'sprout' ? '<path d="M80 49Q58 30 73 12q25 1 7 37Z" fill="' + P.leaf + '"/>' : ''}</g><path d="${face}" fill="${mood === 'cheerful' ? P.paper : 'none'}"/><circle cx="65" cy="111" r="2" fill="${P.ink}"/><circle cx="96" cy="111" r="2" fill="${P.ink}"/>${mood === 'proud' ? '<path d="m126 16 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="' + P.amber + '"/>' : ''}${mood === 'thirsty' ? '<path d="M132 64q-12 16 0 17q12-1 0-17Z" fill="' + P.blue + '"/>' : ''}`,
  );
}
const ICONS = {
  water:
    '<path d="M16 4Q3 20 10 26q6 5 12-1Q29 19 16 4Z"/><path d="M11 20q0 3 3 4"/>',
  food: '<rect x="5" y="6" width="22" height="22" rx="4"/><path d="M10 12h12M10 18h8M10 24h12"/>',
  radio:
    '<rect x="4" y="12" width="24" height="16" rx="3"/><path d="m8 12 13-8M8 18h7M8 23h7"/><circle cx="23" cy="21" r="2"/>',
  dosimeter:
    '<rect x="8" y="3" width="16" height="26" rx="4"/><path d="M11 8h10v7H11Zm2 13h6"/>',
  seeds:
    '<path d="M16 28V14M16 18Q4 17 4 7q12 0 12 11Zm0-7Q17 2 28 3q0 11-12 12Z"/>',
  repair: '<path d="M20 4q-8 0-6 9L4 23l5 5 11-11q9 1 8-9l-6 6-4-4Z"/>',
  med: '<rect x="3" y="10" width="26" height="18" rx="4"/><path d="M11 10V5h10v5M16 23l-6-5q-2-6 6-3q8-3 6 3Z"/>',
  battery:
    '<rect x="7" y="7" width="18" height="22" rx="3"/><path d="M12 7V3h8v4m-3 4-5 8h5l-2 6 6-9h-5Z"/>',
  guitar:
    '<path d="m22 4 5 3-8 12q3 8-4 10q-7 2-11-4q-4-6 3-10q2-2 5 0Z"/><circle cx="12" cy="22" r="3"/>',
  game: '<rect x="5" y="5" width="22" height="22" rx="5"/><circle cx="11" cy="11" r="1"/><circle cx="21" cy="21" r="1"/><circle cx="16" cy="16" r="1"/>',
  bolt: '<rect x="4" y="9" width="24" height="16" rx="4"/><path d="M16 9V3M9 25v4m14-4v4"/><circle cx="10" cy="17" r="2"/><circle cx="22" cy="17" r="2"/>',
  shelter: '<path d="M3 28V16q1-13 13-13t13 13v12ZM12 28V17h8v11"/>',
  greenhouse:
    '<path d="M3 28V13L16 3l13 10v15ZM16 28V15m0 7Q6 22 7 14q9 0 9 8Zm0-4q0-9 9-8q0 8-9 8Z"/>',
  solar:
    '<path d="m7 13-4 14h26l-4-14ZM16 13v14M5 20h22M16 9V3m-6 6L6 5m16 4 4-4"/>',
  drill: '<path d="M5 28V4h22v24M16 6v21m-5-13 10 3m-10 2 10 3m-10 2 10 3"/>',
  salvage: '<path d="M4 28h24M7 23l3-13 7 1 6 13ZM18 7l3-4 7 3-2 5Z"/>',
  science:
    '<path d="M11 3h10M13 3v12L4 26q-1 3 4 3h16q5 0 4-3l-9-11V3M9 23h14"/>',
  power: '<path d="M18 3 5 19h10l-2 11 14-18H17Z"/>',
  morale:
    '<circle cx="16" cy="16" r="12"/><path d="M10 20q6 7 12 0M11 12v2m10-2v2"/>',
  shield: '<path d="m16 3 12 5v8q-1 9-12 14Q5 25 4 16V8ZM10 16l4 4 8-9"/>',
  dose: '<path d="m16 3 14 26H2ZM16 12v7m0 4v1"/><path d="M8 25h3m11 0h3"/>',
  crew: '<circle cx="16" cy="11" r="8"/><path d="M3 29q0-11 13-11t13 11M11 10h10"/>',
  plant:
    '<path d="M7 23h18l-3 7H10ZM16 23V9m0 6Q3 15 4 4q13 0 12 11Zm0-4Q16 1 28 3q0 9-12 8Z"/>',
  'tier-0': '<circle cx="16" cy="16" r="12"/><path d="M10 16l4 4 8-9"/>',
  'tier-1': '<path d="m16 3 14 26H2ZM16 12v9"/>',
  'tier-2': '<path d="m16 3 14 26H2ZM13 12v9m6-9v9"/>',
  'tier-3': '<path d="m16 3 14 26H2ZM10 12v9m6-9v9m6-9v9"/>',
  sound: '<path d="M3 12h6l8-7v22l-8-7H3Zm19-3q10 7 0 14m-1-10q4 3 0 6"/>',
  mute: '<path d="M3 12h6l8-7v22l-8-7H3Zm19-1 7 10m0-10-7 10"/>',
  real: '<rect x="2" y="6" width="28" height="20" rx="4"/><path d="M7 16l4 4 8-9m4 1v8"/>',
};
for (const crew of CREW)
  ICONS[`trait-${crew.id}`] =
    `<g transform="translate(2 2)">${BADGES[crew.id]}</g>`;
for (const [id, body] of Object.entries(ICONS)) {
  await save(
    `icons/${id}.svg`,
    svg(body.replaceAll('fill="none"', ''), '32 32').replace(
      `<g stroke="${P.ink}"`,
      `<g fill="none" stroke="currentColor"`,
    ),
  );
  manifest.icons.push({
    id,
    name: id.startsWith('trait-')
      ? CREW.find((c) => c.id === id.slice(6)).trait
      : ITEM_TYPES[id]?.name || id.replaceAll('-', ' '),
    path: `assets/icons/${id}.svg`,
  });
}
await save(
  'icons/sprite.svg',
  `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(ICONS)
    .map(
      ([id, body]) =>
        `<symbol id="${id}" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></symbol>`,
    )
    .join('')}</svg>\n`,
);

for (const id of MODEL_IDS) {
  const model = createModel(id);
  const binary = await new GLTFExporter().parseAsync(model, {
    binary: true,
    onlyVisible: true,
  });
  await save(`models/${id}.glb`, Buffer.from(binary));
  const name = id.startsWith('crew-')
    ? CREW.find((c) => c.id === id.slice(5)).name
    : id.startsWith('item-')
      ? ITEM_TYPES[id.slice(5)].name
      : id.replace('station-', '').replaceAll('-', ' ');
  manifest.models.push({
    id,
    name,
    path: `assets/models/${id}.glb`,
    category: id.startsWith('crew-')
      ? 'Crew'
      : id.startsWith('station-')
        ? 'Stations'
        : id.startsWith('item-')
          ? 'Supplies'
          : 'Companions & terrain',
  });
  model.traverse((node) => {
    node.geometry?.dispose();
    if (node.material) node.material.dispose();
  });
}
for (const crew of CREW)
  for (const mood of MOODS) {
    const path = `portraits/${crew.id}-${mood}.svg`;
    await save(path, portrait(crew, mood));
    manifest.portraits.push({
      id: `${crew.id}-${mood}`,
      name: `${crew.name} · ${mood}`,
      crew: crew.id,
      mood,
      path: `assets/${path}`,
    });
  }
await save(
  'portraits/bolt.svg',
  svg(
    `<rect x="27" y="41" width="106" height="70" rx="18" fill="${P.white}"/><rect x="39" y="58" width="82" height="39" rx="8" fill="${P.ink}"/><circle cx="59" cy="76" r="6" fill="${P.blue}"/><circle cx="101" cy="76" r="6" fill="${P.blue}"/><path d="M70 88h20" stroke="${P.blue}"/><path d="M115 41V18"/><circle cx="115" cy="14" r="7" fill="${P.coral}"/><rect x="42" y="113" width="76" height="40" rx="8" fill="${P.amber}"/><path d="M68 135h24"/>`,
  ),
);
manifest.portraits.push({
  id: 'bolt',
  name: 'BOLT · ready',
  path: 'assets/portraits/bolt.svg',
});
for (const mood of PLANT_MOODS) {
  await save(`plant/${mood}.svg`, plant(mood));
  manifest.plant.push({
    id: mood,
    name: `Kamote · ${mood}`,
    path: `assets/plant/${mood}.svg`,
  });
}

// Kind ending scenes: no deaths, mock NASA dates, or actual agency patches.
const stars =
  '<path d="m44 35 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm252 12 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="' +
  P.amber +
  '" stroke="none"/>';
const terrain = `<path d="M0 180Q70 152 139 177t221-2v65H0Z" fill="${P.regolith}"/><ellipse cx="70" cy="219" rx="26" ry="6" fill="${P.ink}" stroke="none"/>`;
const habitat = (x = 115, y = 70) =>
  `<g transform="translate(${x} ${y})"><path d="M0 110V62Q0 0 65 0t65 62v48Z" fill="${P.white}"/><path d="M49 110V59q16-29 32 0v51Z" fill="${P.amber}"/><circle cx="28" cy="59" r="10" fill="${P.amber}"/><circle cx="103" cy="59" r="10" fill="${P.amber}"/></g>`;
const astronaut = (x, y, color = P.leaf, scale = 1) =>
  `<g transform="translate(${x} ${y}) scale(${scale})"><rect x="-19" y="31" width="38" height="40" rx="13" fill="${color}"/><path d="M-10 71v14m20-14v14" stroke-width="10"/><circle cy="15" r="26" fill="${P.white}"/><rect x="-18" y="3" width="36" height="26" rx="12" fill="${P.blue}"/><path d="M-7 15v1m14-1v1"/><path d="M-18 42l-16 14m52-14 16 14" stroke="${color}" stroke-width="12"/></g>`;
const scenes = {
  'Mission Complete': `${habitat()}${astronaut(67, 140, P.leaf, 0.75)}${astronaut(287, 140, P.amber, 0.75)}<path d="M153 78h54v22h-54Z" fill="${P.leaf}"/><path d="m171 89 7 6 14-13" fill="none"/>`,
  'Science Legend': `${habitat(22, 85)}<g transform="translate(225 70)"><path d="M-15 20h30m-24 0v47l-30 47q-4 14 14 14h50q18 0 14-14L9 67V20" fill="${P.paper}"/><path d="M-29 96h58l14 18q3 7-8 7h-70q-11 0-8-7Z" fill="${P.blue}"/><circle cx="-4" cy="102" r="4" fill="${P.white}"/><circle cx="13" cy="91" r="4" fill="${P.leaf}"/></g>`,
  'Kamote Kingdom': `${habitat(25, 75)}<g transform="translate(155 35) scale(1.1)">${plant('proud').match(/<g stroke=[\s\S]*<\/g>/)[0]}</g>`,
  'Early Ride Home': `<path d="m100 166 20-35h120l20 35" fill="${P.amber}"/><rect x="129" y="55" width="102" height="106" rx="36" fill="${P.white}"/><circle cx="180" cy="95" r="23" fill="${P.blue}"/><path d="M122 195h116" stroke="${P.amber}" stroke-dasharray="6 8"/>${astronaut(70, 146, P.white, 0.7)}<path d="M44 124q-8-11-17-3" fill="none"/>`,
  'Lights Out': `${habitat()}<path d="M151 170v-28h19v28" fill="${P.ink}"/><path d="m160 132-9-10m9 10 9-10"/>${astronaut(67, 140, P.amber, 0.75)}<path d="m85 173 45-21-2 42Z" fill="${P.amber}" stroke="none"/>`,
  'Snack Attack': `<rect x="50" y="127" width="260" height="65" rx="16" fill="${P.copper}"/><ellipse cx="180" cy="131" rx="94" ry="18" fill="${P.paper}"/><path d="M114 128q3-37 27-31q24-8 29 29M180 127q3-36 28-27q26-5 27 26" fill="${P.amber}"/><path d="M138 106v11m69-9v11"/>${astronaut(54, 48, P.copper, 0.65)}${astronaut(298, 48, P.coral, 0.65)}`,
  'Forecast Whisperer': `${habitat(15, 83)}<rect x="177" y="84" width="145" height="91" rx="12" fill="${P.paper}"/><path d="M191 146q18-35 35-12t33-16t46-19" stroke="${P.ink}" fill="none"/><path d="m197 97 9 9 17-20" fill="none"/>${astronaut(260, 157, P.violet, 0.55)}`,
  'Blind Luck': `${habitat()}${astronaut(65, 143, P.regolith, 0.7)}<path d="m269 135 15-9 15 9v28l-15 9-15-9Z" fill="${P.paper}"/><circle cx="284" cy="143" r="3" fill="${P.ink}"/><circle cx="278" cy="156" r="3" fill="${P.ink}"/><circle cx="291" cy="161" r="3" fill="${P.ink}"/>`,
  'Skeleton Crew': `${habitat(165, 68)}${astronaut(89, 127, P.regolith, 0.85)}<rect x="107" y="164" width="42" height="27" rx="8" fill="${P.amber}"/><path d="M119 176h17m-28-18q20-23 41 0" fill="none"/>`,
  'Close Call': `${habitat(165, 75)}${astronaut(110, 130, P.coral, 0.85)}<path d="m126 173 34-3m-98 18 24-2m-37 11 35-4" fill="none"/><path d="m260 35 6 12 14 2-10 9 3 14-13-7-13 7 3-14-10-9 14-2Z" fill="${P.amber}"/>`,
};
for (const name of ENDINGS) {
  const path = `endings/${slug(name)}.svg`;
  await save(
    path,
    svg(
      `${stars}${terrain}${scenes[name]}`,
      '360 240',
      `<rect width="360" height="240" rx="18" fill="${P.ink}"/>`,
    ),
  );
  manifest.illustrations.push({ id: slug(name), name, path: `assets/${path}` });
}
await save(
  'almanac-frame.svg',
  svg(
    `<rect x="8" y="8" width="264" height="344" rx="12" fill="${P.paper}"/><path d="M27 53h225M27 263h225M27 297h150M27 321h122" stroke="${P.regolith}"/><rect x="28" y="74" width="224" height="164" rx="8" fill="none" stroke-dasharray="4 6"/><path d="m202 20 54 9-4 28-54-10Z" fill="${P.amber}"/>`,
    '280 360',
  ),
);
for (const [id, body, size] of [
  [
    'grid',
    `<path d="M0 0H32V32H0Z" stroke="${P.regolith}" stroke-width=".5" fill="none" opacity=".4"/>`,
    '32 32',
  ],
  [
    'tape',
    `<path d="m2 5 9-4 69 2 8-2 11 6-4 7 4 11-9 5-72-2-13 3 2-9-6-7Z" fill="${P.amber}" stroke="none"/><path d="M15 6v18M82 5v19" stroke="${P.paper}" stroke-width="1" opacity=".6"/>`,
    '100 32',
  ],
  [
    'stickers',
    `<path d="m32 4 7 18 19 7-19 7-7 19-7-19-19-7 19-7Z" fill="${P.amber}"/><path d="M88 9q26-10 27 11q-3 27-28 25Q71 32 88 9Z" fill="${P.leaf}"/><path d="M88 35 105 15" fill="none"/>`,
    '128 64',
  ],
]) {
  await save(`textures/${id}.svg`, svg(body, size));
  manifest.textures.push({ id, name: id, path: `assets/textures/${id}.svg` });
}
const appIcon = svg(
  `<path d="M34 116V79q0-42 46-42t46 42v37Z" fill="${P.paper}"/><path d="M66 116V86q0-24 28 0v30Z" fill="${P.amber}"/><circle cx="51" cy="79" r="6" fill="${P.amber}"/><circle cx="109" cy="79" r="6" fill="${P.amber}"/><path d="M25 122h110" stroke="${P.regolith}"/><path d="m113 21 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="${P.amber}" stroke="none"/>`,
  '160 160',
  `<rect width="160" height="160" rx="32" fill="${P.ink}"/>`,
);
await save('app-icon.svg', appIcon);
await writeFile('public/favicon.svg', appIcon);

// Manifest uses content hashes, never clock dates or unstable Three UUIDs.
async function inventory(dir = directory) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await inventory(file);
    else if (entry.name !== 'manifest.json') {
      const bytes = await readFile(file);
      manifest.files.push({
        path: file.replace('public/', ''),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        provenance: file.includes('/fonts/')
          ? 'SIL OFL 1.1; see CREDITS.md'
          : 'Original project art',
      });
    }
  }
}
await inventory();
manifest.totalBytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
manifest.counts = {
  crew: CREW.length,
  models: MODEL_IDS.length,
  icons: manifest.icons.length,
  portraits: manifest.portraits.length,
  plantMoods: PLANT_MOODS.length,
  endings: ENDINGS.length,
  tasks: TASKS.length,
};
if (manifest.totalBytes >= 15_000_000)
  throw new Error('Art exceeds the 15 MB budget.');
await save('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Art: ${manifest.counts.models} models, ${manifest.counts.portraits} portraits, ${manifest.counts.icons} icons; ${manifest.totalBytes.toLocaleString()} bytes.`,
);
