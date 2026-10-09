import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const dir = process.argv[3] || 'docs/submission';
const sizes = process.argv[4]
  ? process.argv[4].split(',').map((size) => size.split('x').map(Number))
  : [
      [1280, 720],
      [360, 640],
    ];
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
const results = [];
try {
  for (const [width, height] of sizes) {
    const name = process.argv[4]
      ? `${width}x${height}`
      : width === 360
        ? 'mobile'
        : 'desktop';
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 600,
      isMobile: width < 600,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        errors.push(message.text());
    });
    async function shot(id, target) {
      if (target)
        await page
          .locator(target)
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      else await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${dir}/${id}-${name}.png`,
        animations: 'disabled',
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow ${id}`,
      );
      assert(
        await page
          .locator('img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
        `Image ${id}`,
      );
    }
    await page.goto(base);
    await page.locator('[data-play]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await shot('01-title');
    await page.goto(`${base}/?judge=1`);
    await page.locator('[data-judge-start]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.scramble-screen')?.dataset.ready === 'true',
    );
    await shot('02-scramble');
    // Actual control route. Full bags are deposited/dropped, never replaced
    // with an injected fixture or a hand-authored winning game state.
    for (const type of ['radio', 'seeds']) {
      await page.locator('#supply-type').selectOption(type);
      const label = type === 'radio' ? 'Sun Watch radio' : 'Seed cartridge';
      for (let n = 0; n < 30; n++) {
        if (
          await page
            .getByRole('button', { name: `Put down ${label}`, exact: true })
            .count()
        )
          break;
        const carried = page.locator('.carry-slots button');
        if (await carried.count()) await carried.last().click();
        await page.locator('#find-supply').click();
        await page.waitForTimeout(250);
      }
      assert(
        await page
          .getByRole('button', { name: `Put down ${label}`, exact: true })
          .count(),
        `Physical ${type} pickup`,
      );
      await page.locator('#home').click();
      await page.waitForFunction(
        () => document.querySelector('#close-hatch')?.disabled === false,
      );
    }
    for (const id of ['ria', 'dom', 'aiko', 'tunde']) {
      const button = page.locator(`[data-crew="${id}"]`);
      if (await button.isEnabled()) await button.click();
      await page.waitForFunction(
        (id) => document.querySelector(`[data-crew="${id}"]`)?.disabled,
        id,
      );
      await page.locator('#home').click();
      await page.waitForFunction(
        (id) =>
          document
            .querySelector(`[data-crew="${id}"]`)
            ?.textContent.includes('Inside'),
        id,
      );
    }
    await page.locator('#close-hatch').click();
    await page.locator('#continue-shelter').waitFor();
    await shot('03-hatch');
    const run = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run,
      );
    const physical = (await run()).scrambleResult;
    await page.locator('#continue-shelter').click();
    await page.locator('.shelter-screen[data-phase="shelter"]').waitFor();
    await writeFile(
      `${dir}/checkpoint-${name}.json`,
      await page.evaluate(() =>
        localStorage.getItem('shelter-call.mission.v1'),
      ),
    );
    for (const [id, task] of [
      ['ria', 'greenhouse'],
      ['dom', 'solar'],
      ['aiko', 'drill'],
      ['tunde', 'drill'],
    ]) {
      await page.locator(`[data-crew="${id}"]`).click();
      await page.locator(`[data-task="${task}"]`).click();
    }
    for (let slot = 0; slot < 8; slot++) {
      const supply = page.locator(
        '[data-key="pantry-water"], [data-key="pantry-food"]',
      );
      if (await supply.count()) {
        await supply.first().click();
        await page.locator(`[data-slot="${slot}"]`).click();
      }
    }
    await shot('04-journal', '.crew-panel');
    await page.screenshot({
      path: `${dir}/04-journal-${name}-full.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.locator('.forecast-card').first().waitFor();
    await shot('05-forecast', '.journal-radio');
    const forecasts = await page.locator('.forecast-card').count();
    const footer = await page.locator('.journal-footer').boundingBox();
    assert(
      footer && footer.y + footer.height <= height - 40,
      'Finish shift clears announcement',
    );
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
    await page.locator('.reveal-screen').waitFor();
    await shot('06-reveal', '.timeline-panel');
    assert(
      await page.locator('.real-panel').evaluate((el) => el.open),
      'Judge real panel open',
    );
    await shot('07-real', '.real-panel summary');
    await page.screenshot({
      path: `${dir}/07-real-${name}-full.png`,
      fullPage: true,
      animations: 'disabled',
    });
    results.push({
      width,
      physical,
      forecasts,
      shifts,
      ending: await page.locator('.ending-card h1').innerText(),
      errors,
    });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      JSON.stringify({
        width,
        shifts,
        forecasts,
        saved: physical.crewSaved.length,
        errors,
      }),
    );
  }
  await writeFile(
    `${dir}/capture.json`,
    JSON.stringify({ base, results }, null, 2) + '\n',
  );
} finally {
  await browser.close();
}
