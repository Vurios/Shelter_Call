import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CREW, ITEM_TYPES, TASKS } from '../src/core/config.js';
import { ENDINGS } from '../src/core/endings.js';
import { PALETTE } from '../src/art/palette.js';
import { MODEL_IDS } from '../src/art/models.js';

const manifest = JSON.parse(
  await readFile('public/assets/manifest.json', 'utf8'),
);
const ids = (entries) => new Set(entries.map((entry) => entry.id));
assert.equal(ids(manifest.models).size, MODEL_IDS.length);
MODEL_IDS.forEach((id) => assert(ids(manifest.models).has(id), id));
assert.equal(manifest.illustrations.length, ENDINGS.length);
assert.deepEqual(
  manifest.illustrations.map((entry) => entry.name),
  ENDINGS,
);
assert.equal(manifest.plant.length, 6);
assert.equal(manifest.portraits.length, CREW.length * 4 + 1);
for (const id of [
  ...Object.keys(ITEM_TYPES),
  ...TASKS,
  'dose',
  'shield',
  'power',
  'morale',
  'crew',
  'plant',
  'real',
  ...[0, 1, 2, 3].map((n) => `tier-${n}`),
  ...CREW.map((crew) => `trait-${crew.id}`),
])
  assert(ids(manifest.icons).has(id), id);
let total = 0;
for (const file of manifest.files) {
  const bytes = await readFile(`public/${file.path}`);
  assert.equal(file.bytes, bytes.length, file.path);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    file.sha256,
    file.path,
  );
  total += bytes.length;
}
assert.equal(total, manifest.totalBytes);
assert(
  total + (await readFile('public/assets/manifest.json')).length < 15_000_000,
);
for (const entry of manifest.models) {
  const bytes = await readFile(`public/${entry.path}`);
  const array = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const gltf = await new GLTFLoader().parseAsync(array, '');
  assert.equal(gltf.scene.children[0].name, entry.id);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  assert(Math.abs(bounds.min.y) < 0.00001, `${entry.id} ground pivot`);
  let triangles = 0;
  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      triangles += node.geometry.attributes.position.count / 3;
      assert(node.geometry.attributes.normal);
      assert.equal(node.material.map, null);
    }
  });
  assert(triangles < 6000, `${entry.id} polygon budget (${triangles})`);
  assert(triangles > 0);
}
function luminance(hex) {
  const rgb = hex
    .match(/[0-9a-f]{2}/gi)
    .map((byte) => parseInt(byte, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const contrast = Object.entries(PALETTE)
  .filter(([id]) => id !== 'ink')
  .map(([id, hex]) => [
    id,
    (luminance(hex) + 0.05) / (luminance(PALETTE.ink) + 0.05),
  ]);
assert(contrast.every(([, ratio]) => ratio >= 4.5));

// Read actual TrueType cmap format 4/12 mappings, rather than trust CSS fallbacks.
function hasGlyph(bytes, point) {
  const tables = bytes.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < tables; i++) {
    const offset = 12 + i * 16;
    if (bytes.toString('ascii', offset, offset + 4) === 'cmap')
      cmap = bytes.readUInt32BE(offset + 8);
  }
  assert(cmap, 'Font needs a cmap');
  for (let i = 0; i < bytes.readUInt16BE(cmap + 2); i++) {
    const table = cmap + bytes.readUInt32BE(cmap + 4 + i * 8 + 4),
      format = bytes.readUInt16BE(table);
    if (format === 12) {
      for (let j = 0; j < bytes.readUInt32BE(table + 12); j++) {
        const group = table + 16 + j * 12,
          start = bytes.readUInt32BE(group),
          end = bytes.readUInt32BE(group + 4);
        if (
          point >= start &&
          point <= end &&
          bytes.readUInt32BE(group + 8) + point - start !== 0
        )
          return true;
      }
    } else if (format === 4 && point <= 65535) {
      const count = bytes.readUInt16BE(table + 6) / 2;
      const ends = table + 14,
        starts = ends + count * 2 + 2,
        deltas = starts + count * 2,
        ranges = deltas + count * 2;
      for (let j = 0; j < count; j++) {
        const start = bytes.readUInt16BE(starts + j * 2),
          end = bytes.readUInt16BE(ends + j * 2);
        if (point < start || point > end) continue;
        const range = bytes.readUInt16BE(ranges + j * 2),
          delta = bytes.readInt16BE(deltas + j * 2);
        const glyph =
          range === 0
            ? (point + delta) & 65535
            : bytes.readUInt16BE(ranges + j * 2 + range + (point - start) * 2);
        if (glyph !== 0) return true;
      }
    }
  }
  return false;
}
for (const font of [
  'AtkinsonHyperlegible-Regular.ttf',
  'AtkinsonHyperlegible-Bold.ttf',
  'PatrickHand-Regular.ttf',
]) {
  const bytes = await readFile(`public/assets/fonts/${font}`);
  for (const char of 'Kumusta, kaibigan! Magandang umaga. Tubig pagkain pahinga Ññ Ng 0123456789')
    assert(hasGlyph(bytes, char.codePointAt(0)), `${font}: ${char}`);
}
console.log(
  JSON.stringify(
    {
      bytes: total,
      counts: manifest.counts,
      minimumContrast: Math.min(...contrast.map(([, ratio]) => ratio)),
      fonts: 'Filipino sample glyphs verified',
    },
    null,
    2,
  ),
);
