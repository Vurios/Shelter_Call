import { writeFileSync } from 'node:fs';
export function writeReport(result) {
  const table = (data) =>
    '| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |\n|---|---:|---:|---:|---:|---:|---|\n' +
    Object.entries(data)
      .map(
        ([bot, r]) =>
          `| ${bot} | ${(r.winRate * 100).toFixed(1)}% | ${r.score.toFixed(1)} | ${r.science.toFixed(1)} | ${r.dose.toFixed(1)} | ${r.shifts} | ${Object.entries(
            r.endings,
          )
            .map(([e, n]) => e + ': ' + n)
            .join(', ')} |`,
      )
      .join('\n');
  writeFileSync(
    'tools/balance-report.md',
    `# Headless balance report\n\nReproduce: npm run sim (${result.samples} paired seeds per bot per difficulty, no network/browser).\n\n${result.loadout}\n\nFixed GAME score: ${result.score}. Bots consume filtered views; no observed arrival or future event feeds their decisions. Starting dose/duration/science/supply values and the 90-second timer cap are reproduced in the before table; final GAME config is stored alongside. Both configuration tables use the corrected UTC-day/resupply rules and EVA flare interrupts; the starting table is not a replay of the historical engine. The scramble proxy does not establish achievable 3D pickup capacity. NASA records and associations are unchanged.\n\n` +
      Object.entries(result.final)
        .map(([d, data]) => `## ${d}\n\n${table(data)}\n`)
        .join('\n') +
      `\n## Starting GAME configuration (Commander)\n\n${table(result.before)}\n\n## Paired item ablations\n\n| Removed type | Win without | Benefit with (points) |\n|---|---:|---:|---:|\n` +
      Object.entries(result.items)
        .map(
          ([key, r]) =>
            `| ${key} | ${(r.winRate * 100).toFixed(1)}% | ${r.benefitPoints.toFixed(1)} |`,
        )
        .join('\n') +
      `\n\n## Acceptance\n\n` +
      acceptance(result) +
      `\n\nVariety protocol: 1,000 separate seeds, six policies in rotation, no-radio every seventh run and one-person scramble every seventeenth run. Endings: ${Object.keys(result.variety.endings).join(', ')}. Full figures and exact config: [results.json](../docs/balance/results.json).\n`,
  );
}

function acceptance(result) {
  const c = result.final.Commander,
    t = result.targets,
    pct = (x) => (x * 100).toFixed(1) + '%',
    f = (x) => (x ? 'PASS' : 'UNRESOLVED');
  const rows = [
    [
      'Shelter-only survival / Science Legend',
      '>=60% / <5%',
      pct(c.AlwaysShelter.winRate) +
        ' / ' +
        pct(c.AlwaysShelter.scienceLegendRate),
      t.alwaysShelter,
    ],
    [
      'NeverShelter medevac',
      '>=70%',
      pct(c.NeverShelter.medevacRate),
      t.neverShelter,
    ],
    [
      'TrustForecast survival',
      '45-65%',
      pct(c.TrustForecast.winRate),
      t.trustForecast,
    ],
    [
      'TrustForecast mean score',
      'Higher than both extremes',
      c.TrustForecast.score.toFixed(1) +
        ' vs ' +
        c.AlwaysShelter.score.toFixed(1) +
        ' / ' +
        c.NeverShelter.score.toFixed(1),
      t.score,
    ],
    [
      'Distinct endings / 1,000 variety runs',
      '>=6',
      Object.keys(result.variety.endings).length,
      t.variety,
    ],
    ['Commander median shifts', '20-28', c.TrustForecast.shifts, t.length],
    [
      'Commander median scramble seconds',
      '30-60',
      c.TrustForecast.scramble,
      t.scramble,
    ],
    [
      'Difficulty survival (Cadet / Commander / Flight Director)',
      'Cadet easier; Director harder',
      [
        result.final.Cadet.TrustForecast.winRate,
        c.TrustForecast.winRate,
        result.final['Flight Director'].TrustForecast.winRate,
      ]
        .map(pct)
        .join(' / '),
      t.difficulties,
    ],
    [
      'Largest single-item win benefit',
      '<=25 percentage points',
      Math.max(
        ...Object.values(result.items).map((i) => i.benefitPoints),
      ).toFixed(1) + ' points',
      t.items,
    ],
    [
      'No-radio good-play survival',
      '>=5%',
      pct(result.items.radio.winRate),
      t.blindLuck,
    ],
    [
      'Radio strongest item benefit',
      'At least every other type',
      result.items.radio.benefitPoints.toFixed(1) + ' points',
      t.radioStrongest,
    ],
  ];
  return (
    '| Target | Goal | Measured | Result |\n|---|---|---|---|\n' +
    rows
      .map(
        ([name, goal, value, pass]) =>
          `| ${name} | ${goal} | ${value} | ${f(pass)} |`,
      )
      .join('\n')
  );
}
