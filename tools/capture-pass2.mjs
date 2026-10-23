import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Second-pass evidence: same saved checkpoints and public actions as the first pass.
const base = process.argv[2] || 'http://127.0.0.1:4173';
const output = process.argv[3] || 'docs/overhaul/pass2';
const sizes = (process.argv[4] || '1280x720,1920x1080,360x640,390x844')
  .split(',')
  .map((size) => size.split('x').map(Number));
await mkdir(output, { recursive: true });
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/chromium',
  ].find(existsSync);
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
});
const report = [];
const plan = [
  '[data-room-inspector="wall"]',
  '[data-key^="pantry-"]',
  '[data-action="move"]',
  '[data-key^="pantry-"]',
  '[data-action="move"]',
  '[data-key^="pantry-"]',
  '[data-action="move"]',
  '[data-inspector="crew"]',
  '[data-crew="ria"]',
  '[data-task="greenhouse"]',
  '[data-crew="dom"]',
  '[data-task="solar"]',
];
async function context(width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 600,
    isMobile: width < 600,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return { ctx, page, errors };
}
async function shelter(page, width, height, graphics) {
  const checkpoint = JSON.parse(
    await readFile(
      `docs/overhaul/before/checkpoint-${width}x${height}.json`,
      'utf8',
    ),
  );
  await page.goto(base);
  await page.evaluate(
    ({ checkpoint, graphics }) => {
      localStorage.setItem(
        'shelter-call.mission.v1',
        JSON.stringify(checkpoint),
      );
      localStorage.setItem(
        'shelter-call.settings.v1',
        JSON.stringify({ tutorial: false, graphics }),
      );
    },
    { checkpoint, graphics },
  );
  await page.reload();
  await page.locator('.habitat-room').waitFor();
  await page.evaluate(() => document.fonts.ready);
}
try {
  for (const [width, height] of sizes) {
    const tag = `${width}x${height}`;
    const { ctx, page, errors } = await context(width, height);
    await shelter(page, width, height, 'high');
    await page.waitForFunction(
      () => document.querySelector('.habitat-room')?.dataset.renderer === '3d',
    );
    for (const selector of plan) await page.locator(selector).first().click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${output}/room-${tag}.png` });
    const room = await page.evaluate(() => ({
      ...document.querySelector('.habitat-webgl').dataset,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    await page.locator('[data-action="end"]').click();
    if (await page.locator('[data-action="recall"]').count())
      await page.locator('[data-action="recall"]').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${output}/report-${tag}.png` });
    report.push({ size: tag, room, errors: [...errors] });
    await ctx.close();
  }
  for (const [width, height] of [sizes[0], sizes[2]].filter(Boolean)) {
    const tag = `${width}x${height}`;
    const { ctx, page, errors } = await context(width, height);
    await page.goto(base);
    await page.waitForFunction(() =>
      document.querySelector('.title-landscape.has-stage'),
    );
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${output}/title-${tag}.png` });
    await shelter(page, width, height, 'illustrated');
    for (const selector of plan) await page.locator(selector).first().click();
    await page.screenshot({ path: `${output}/illustrated-${tag}.png` });
    for (const flat of [false, true]) {
      await page.goto(`${base}/?scramble=1&seed=orbit-b`);
      if (flat)
        await page
          .getByRole('checkbox', { name: 'Use 2D map', exact: true })
          .check();
      await page
        .getByRole('button', { name: 'Start scramble', exact: true })
        .click();
      await page
        .locator('.scramble-screen[data-ready="true"]')
        .waitFor({ timeout: 30000 });
      await page.locator('#find-supply').click();
      await page.waitForTimeout(2500);
      await page.screenshot({
        path: `${output}/scramble-${flat ? '2d' : '3d'}-${tag}.png`,
      });
    }
    report.push({ size: tag, screens: 'title/illustrated/scramble', errors });
    await ctx.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/capture.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
