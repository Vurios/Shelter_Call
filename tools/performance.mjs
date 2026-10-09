import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const url = process.argv[2] || 'https://shelter-call.pages.dev/';
const output = process.argv[3] || 'playwright-report/performance/mobile';
await mkdir(output.slice(0, output.lastIndexOf('/')), { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    'node_modules/lighthouse/cli/index.js',
    url,
    '--chrome-flags=--headless',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=json',
    '--output=html',
    `--output-path=${output}`,
    '--quiet',
  ],
  { encoding: 'utf8', stdio: 'pipe' },
);
if (result.status !== 0)
  throw new Error(result.stderr || result.stdout || 'Lighthouse failed');
const report = JSON.parse(await readFile(`${output}.report.json`, 'utf8'));
const summary = {
  url: report.finalDisplayedUrl,
  fetched: report.fetchTime,
  lighthouse: report.lighthouseVersion,
  scores: Object.fromEntries(
    Object.entries(report.categories).map(([key, value]) => [
      key,
      value.score * 100,
    ]),
  ),
  interactionMs: report.audits.interactive.numericValue,
  lcpMs: report.audits['largest-contentful-paint'].numericValue,
  blockingMs: report.audits['total-blocking-time'].numericValue,
  throttling: report.configSettings.throttling,
  passed:
    report.categories.performance.score >= 0.85 &&
    report.audits.interactive.numericValue < 3000,
};
await writeFile(
  `${output}.summary.json`,
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
