import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as current from '../src/core/api.js';
import {
  getPlanPreview,
  getItemPreview,
  getEventPreviews,
} from '../src/core/preview.js';

// Replay a physically collected baseline save through both real engine versions.
// Preview calls happen only on the new side, before every committed action.
const baseline = '8237f366668ecfd9a93a4d4f52d29ea512f54377';
const directory = resolve('playwright-report', `parity-${baseline}`);
const files = execFileSync(
  'git',
  [
    'ls-tree',
    '-r',
    '--name-only',
    baseline,
    'src/core',
    'src/data',
    'public/data/episodes.json',
  ],
  { encoding: 'utf8' },
)
  .trim()
  .split(/\r?\n/);
for (const file of files) {
  const target = resolve(directory, file);
  assert(target.startsWith(directory + sep));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    execFileSync('git', ['show', `${baseline}:${file}`], {
      maxBuffer: 10 * 1024 * 1024,
    }),
  );
}
const previous = await import(
  pathToFileURL(resolve(directory, 'src/core/api.js'))
);
const checkpoint = JSON.parse(
  await readFile('docs/overhaul/before/checkpoint-1280x720.json', 'utf8'),
);
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const results = [];
for (const policy of ['recallAll', 'keepWorking']) {
  const before = structuredClone(checkpoint.run),
    after = structuredClone(checkpoint.run),
    transcript = [];
  function step(action) {
    const snapshot = structuredClone(after);
    getPlanPreview(after);
    getEventPreviews(after);
    for (const item of [...after.pantry, ...after.wall])
      getItemPreview(after, item.id, after.crew[0].id);
    assert.deepEqual(
      after,
      snapshot,
      'Previews preserve the entire saved state',
    );
    previous.act(before, action);
    current.act(after, action);
    assert.deepEqual(after, before, `Identical state after ${action.type}`);
    assert.deepEqual(
      current.getShiftView(after),
      previous.getShiftView(before),
    );
    transcript.push({ action, stateHash: hash(after) });
  }
  for (const [crewId, task] of [
    ['ria', 'greenhouse'],
    ['dom', 'solar'],
    ['aiko', 'drill'],
    ['tunde', 'drill'],
  ])
    step({ type: 'assignCrew', crewId, task });
  for (const item of after.pantry
    .filter((i) => ['water', 'food'].includes(i.type))
    .slice(0, 8))
    step({ type: 'moveItem', itemId: item.id, to: 'wall' });
  step({ type: 'consume', itemId: after.wall[0].id, crewId: after.crew[0].id });
  for (let n = 0; n < 200 && after.phase === 'shelter'; n++) {
    if (after.pendingEvent)
      step({ type: 'chooseEvent', eventId: after.pendingEvent.id, choice: 1 });
    else if (after.interrupt) step({ type: policy });
    else step({ type: 'endShift' });
  }
  assert.equal(after.phase, 'ending');
  assert.deepEqual(current.buildReveal(after), previous.buildReveal(before));
  results.push({
    policy,
    actions: transcript.length,
    ending: current.checkEnding(after),
    finalHash: hash(after),
    transcript,
  });
}
await writeFile(
  'docs/overhaul/parity.json',
  JSON.stringify(
    {
      baseline,
      seed: checkpoint.run.seed,
      exactStateAndRevealParity: true,
      results,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    results.map(({ policy, actions, ending, finalHash }) => ({
      policy,
      actions,
      ending,
      finalHash,
    })),
  ),
);
