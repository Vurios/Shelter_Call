import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const output = 'docs/overhaul/after/menu';
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
try {
  for (const [width, height] of [
    [1280, 720],
    [360, 640],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (['warning', 'error'].includes(m.type())) errors.push(m.text());
    });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    async function shot(name) {
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'No horizontal overflow',
      );
      await page.screenshot({
        path: `${output}/${name}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
    await shot('title');
    await page.locator('[data-play]').click();
    await page.locator('[data-draft="ria"] img').waitFor();
    await shot('draft');
    await page.locator('[data-nav="title"]').first().click();
    await page.locator('[data-nav="settings"]').click();
    await shot('settings');
    await page.locator('[name="language"]').selectOption('fil');
    await page.locator('[name="textSize"]').selectOption('largest');
    await shot('settings-fil-large');
    assert.deepEqual(errors, []);
    report.push({ width, height, errors });
    await context.close();
  }
  await writeFile(
    `${output}/capture.json`,
    JSON.stringify({ base, report }, null, 2) + '\n',
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
