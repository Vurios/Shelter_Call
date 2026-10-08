import { writeFileSync, mkdirSync } from 'node:fs';
import { writeReport } from './balance-report.mjs';
import { Worker } from 'node:worker_threads';
import { BOTS, runBot } from './bots.mjs';
import {
  CONFIG,
  STARTING_CONFIG,
  ITEM_TYPES,
  DIFFICULTIES,
} from '../src/core/config.js';
const median = (values) => {
  const s = values.slice().sort((a, b) => a - b);
  return (
    (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2
  );
};
const samples =
  Number(process.argv[process.argv.indexOf('--runs') + 1]) || 5000;
const quick = process.argv.includes('--quick');
const summary = (rows) => ({
  runs: rows.length,
  winRate: rows.filter((r) => r.win).length / rows.length,
  medevacRate:
    rows.filter((r) => ['Early Ride Home', 'Snack Attack'].includes(r.ending))
      .length / rows.length,
  scienceLegendRate:
    rows.filter((r) => r.ending === 'Science Legend').length / rows.length,
  score: rows.reduce((n, r) => n + r.score, 0) / rows.length,
  science: median(rows.map((r) => r.science)),
  dose: median(rows.map((r) => r.totalDose)),
  shifts: median(rows.map((r) => r.shifts)),
  scramble: median(rows.map((r) => r.seconds)),
  endings: Object.fromEntries(
    [...new Set(rows.map((r) => r.ending))]
      .sort()
      .map((e) => [e, rows.filter((r) => r.ending === e).length]),
  ),
});
const rowsFor = (bot, difficulty, config = null, omit = null) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./simulate-worker.mjs', import.meta.url),
      { workerData: { samples, bot, difficulty, config, omit } },
    );
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Simulation worker exit ${code}`));
    });
  });
async function batch(keys, work) {
  const output = {};
  for (let offset = 0; offset < keys.length; offset += 4)
    await Promise.all(
      keys.slice(offset, offset + 4).map(async (key) => {
        output[key] = await work(key);
        console.log(`Finished: ${key}`);
      }),
    );
  return Object.fromEntries(keys.map((key) => [key, output[key]]));
}
const result = {
  samples,
  seedPrefix: 'balance:',
  score:
    '100 for win + 25 per crew home + min(100, science*2) - total GAME dose*0.2',
  loadout:
    'All pickups saved in a multi-trip scramble proxy; item ablations remove ONE instance of each type. Paired item checks use the Cautious good-play policy. Crew: Ria, Dom, Aiko, Tunde.',
  config: CONFIG,
  difficultySettings: DIFFICULTIES,
  itemDefinitions: ITEM_TYPES,
  startingConfig: STARTING_CONFIG,
  final: {},
  before: {},
  items: {},
};
for (const difficulty of Object.keys(DIFFICULTIES)) {
  console.log(`${difficulty}: ${samples} runs per bot`);
  result.final[difficulty] = await batch(BOTS, async (bot) =>
    summary(await rowsFor(bot, difficulty)),
  );
}
if (!quick) {
  console.log('Starting configuration: Commander');
  result.before = await batch(BOTS, async (bot) =>
    summary(await rowsFor(bot, 'Commander', STARTING_CONFIG)),
  );
  const base = result.final.Commander.Cautious.winRate;
  console.log('Paired item checks: Cautious');
  result.items = await batch(Object.keys(ITEM_TYPES), async (item) => {
    const value = summary(await rowsFor('Cautious', 'Commander', null, item));
    return { ...value, benefitPoints: 100 * (base - value.winRate) };
  });
}
const c = result.final.Commander;
const variety = Array.from({ length: 1000 }, (_, i) =>
  runBot({
    seed: `variety:${i}`,
    bot: BOTS[i % BOTS.length],
    omit: i % 7 === 0 ? 'radio' : null,
    skeleton: i % 17 === 0,
  }),
);
result.variety = summary(variety);
result.targets = {
  alwaysShelter:
    c.AlwaysShelter.winRate >= 0.6 && c.AlwaysShelter.scienceLegendRate < 0.05,
  neverShelter: c.NeverShelter.medevacRate >= 0.7,
  trustForecast:
    c.TrustForecast.winRate >= 0.45 && c.TrustForecast.winRate <= 0.65,
  score:
    c.TrustForecast.score >
    Math.max(c.AlwaysShelter.score, c.NeverShelter.score),
  variety: Object.keys(result.variety.endings).length >= 6,
  length: c.TrustForecast.shifts >= 20 && c.TrustForecast.shifts <= 28,
  scramble: c.TrustForecast.scramble >= 30 && c.TrustForecast.scramble <= 60,
  difficulties:
    result.final.Cadet.TrustForecast.winRate > c.TrustForecast.winRate &&
    result.final['Flight Director'].TrustForecast.winRate <
      c.TrustForecast.winRate,
  items: quick
    ? null
    : Object.values(result.items).every((r) => r.benefitPoints <= 25),
  blindLuck: quick ? null : result.items.radio.winRate >= 0.05,
  radioStrongest: quick
    ? null
    : result.items.radio.benefitPoints >=
      Math.max(
        ...Object.entries(result.items)
          .filter(([key]) => key !== 'radio')
          .map(([, r]) => r.benefitPoints),
      ),
};
console.log(JSON.stringify(result.targets));
mkdirSync('docs/balance', { recursive: true });
writeFileSync(
  `docs/balance/${quick ? 'exploratory' : 'results'}.json`,
  JSON.stringify(result, null, 2) + '\n',
);
if (!quick) writeReport(result);
