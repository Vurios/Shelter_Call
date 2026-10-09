import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const dir = process.argv[3] || 'docs/submission';
await mkdir(dir, { recursive: true });
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/chromium',
  ].find(existsSync);
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: 'playwright-report/gameplay-video',
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) errors.push(m.text());
  });
  const started = Date.now();
  await page.goto(`${base}/?judge=1`);
  await page.locator('[data-judge-start]').click();
  await page.waitForFunction(
    () => document.querySelector('.scramble-screen')?.dataset.ready === 'true',
  );
  // Recording a short actual browser run, not an edited animation or fixture.
  await page.locator('#supply-type').selectOption('radio');
  for (let n = 0; n < 35; n++) {
    if (
      await page
        .getByRole('button', { name: 'Put down Sun Watch radio', exact: true })
        .count()
    )
      break;
    const bag = page.locator('.carry-slots button');
    if (await bag.count()) await bag.last().click();
    await page.locator('#find-supply').click();
    await page.waitForTimeout(150);
  }
  assert(
    await page
      .getByRole('button', { name: 'Put down Sun Watch radio', exact: true })
      .count(),
    'Actual radio pickup',
  );
  await page.locator('[data-crew="ria"]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-crew="ria"]')?.disabled,
  );
  await page.locator('#home').click();
  await page.waitForFunction(
    () => document.querySelector('#close-hatch')?.disabled === false,
  );
  await page.locator('#close-hatch').click();
  await page.locator('#continue-shelter').click();
  await page.locator('.shelter-screen[data-phase="shelter"]').waitFor();
  await page.locator('.habitat-room').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.locator('[data-inspector="radio"]').click();
  await page.locator('.forecast-card').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  let shifts = 0;
  for (
    ;
    shifts < 40 && (await page.locator('.shelter-screen').count());
    shifts++
  ) {
    if (await page.locator('[data-choice="0"]').count())
      await page.locator('[data-choice="0"]').click();
    await page.locator('[data-action="end"]').click();
    while (await page.locator('[data-action="recall"]').count())
      await page.locator('[data-action="recall"]').click();
  }
  await page.locator('[data-reveal]').click();
  await page.locator('.timeline-panel').scrollIntoViewIfNeeded();
  await page.locator('#reveal-scrub').focus();
  await page.keyboard.press('End');
  const remaining = 25000 - (Date.now() - started);
  if (remaining > 0) await page.waitForTimeout(remaining);
  const elapsedMs = Date.now() - started;
  const ending = await page.locator('.ending-card h1').innerText();
  assert.deepEqual(errors, []);
  await context.close();
  await video.saveAs(`${dir}/gameplay.webm`);
  await writeFile(
    `${dir}/video.json`,
    JSON.stringify(
      {
        base,
        elapsedMs,
        shifts,
        ending,
        physicalRoute:
          'radio, Ria, hatch; remaining crew exposed by the ordinary early-close rule',
        errors,
        edited: false,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ elapsedMs, shifts, ending, errors }));
} finally {
  await browser.close();
}
