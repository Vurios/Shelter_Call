import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const output = process.argv[3] || 'docs/overhaul/after';
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
async function ready(page, checkpoint, settings = {}) {
  await page.goto(base);
  await page.evaluate(
    ({ checkpoint, settings }) => {
      localStorage.setItem(
        'shelter-call.mission.v1',
        JSON.stringify(checkpoint),
      );
      localStorage.setItem(
        'shelter-call.settings.v1',
        JSON.stringify({ tutorial: false, ...settings }),
      );
    },
    { checkpoint, settings },
  );
  await page.reload();
  await page.locator('.habitat-room').waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function state(page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run,
  );
}
try {
  for (const [width, height] of [
    [1280, 720],
    [1920, 1080],
    [360, 640],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 600,
      isMobile: width < 600,
    });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (['error', 'warning'].includes(m.type())) errors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    const checkpoint = JSON.parse(
      await readFile(
        `docs/overhaul/before/checkpoint-${width}x${height}.json`,
        'utf8',
      ),
    );
    await ready(page, checkpoint, { graphics: 'high' });
    await page.waitForFunction(
      () => document.querySelector('.habitat-room')?.dataset.renderer === '3d',
    );
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${output}/room-${width}x${height}.png` });
    // Replay exactly the baseline's deterministic, public planning actions.
    for (const [id, task] of [
      ['ria', 'greenhouse'],
      ['dom', 'solar'],
      ['aiko', 'drill'],
      ['tunde', 'drill'],
    ]) {
      await page.locator(`[data-crew="${id}"]`).click();
      await page.locator(`[data-task="${task}"]`).click();
    }
    await page.locator('[data-inspector="wall"]').click();
    for (let slot = 0; slot < 8; slot++) {
      const item = page.locator(
        '[data-key="pantry-water"], [data-key="pantry-food"]',
      );
      if (await item.count()) {
        await item.first().click();
        await page.locator(`[data-slot="${slot}"]`).click();
      }
    }
    const planned = await state(page);
    assert.equal(
      planned.rng,
      checkpoint.run.rng,
      'Planning must not consume RNG',
    );
    assert.equal(
      planned.now,
      checkpoint.run.now,
      'Planning must not advance time',
    );
    await page.locator('[data-inspector="crew"]').click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${output}/04-journal-${width}x${height}.png`,
    });
    await page.screenshot({
      path: `${output}/04-journal-${width}x${height}-full.png`,
      fullPage: true,
    });
    await page.locator('[data-inspector="wall"]').click();
    await page.locator('.wall-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/wall-${width}x${height}.png` });
    await page.locator('[data-inspector="radio"]').click();
    await page.locator('.journal-radio').first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${output}/05-forecast-${width}x${height}.png`,
    });
    const metrics = await page
      .locator('.habitat-webgl')
      .evaluate((el) => ({ ...el.dataset }));
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'No overflow',
    );
    assert(Number(metrics.drawCalls) < 220, 'Interior draw-call budget');
    assert.deepEqual(errors, []);
    report.push({
      width,
      height,
      metrics,
      errors,
      seed: planned.seed,
      now: planned.now,
      rng: planned.rng,
      shieldSlots: planned.wall.length,
    });
    await context.close();
    console.log(JSON.stringify(report.at(-1)));
  }
  // Deliberate fallback and accessibility views use the same original mission save.
  const checkpoint = JSON.parse(
    await readFile('docs/overhaul/before/checkpoint-360x640.json', 'utf8'),
  );
  for (const [name, settings, viewport] of [
    [
      'illustrated',
      { graphics: 'illustrated', flat: true },
      { width: 360, height: 640 },
    ],
    [
      'filipino-large',
      {
        graphics: 'illustrated',
        flat: true,
        language: 'fil',
        textSize: 'largest',
        motion: 'reduced',
      },
      { width: 390, height: 844 },
    ],
    [
      'zoom-200',
      { graphics: 'illustrated', flat: true },
      { width: 640, height: 360 },
    ],
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: true }),
      page = await context.newPage();
    await ready(page, checkpoint, settings);
    // 640 CSS px is the effective layout viewport for a 1280px screen at 200% zoom.
    await page.locator('[data-inspector="wall"]').click();
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    );
    assert.equal(await page.locator('.habitat-webgl canvas').count(), 0);
    await context.close();
  }
  await writeFile(
    `${output}/capture.json`,
    JSON.stringify({ base, report }, null, 2) + '\n',
  );
} finally {
  await browser.close();
}
