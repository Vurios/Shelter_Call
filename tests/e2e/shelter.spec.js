import { test, expect } from '@playwright/test';
import { build } from 'vite';

test.setTimeout(110000);
// Serve the same UI/core in an isolated, real-data full-loadout fixture.
// It has no privileged window hooks and is never emitted into production dist.
const built = await build({
  configFile: false,
  publicDir: false,
  logLevel: 'silent',
  build: {
    write: false,
    minify: false,
    lib: {
      entry: 'tests/fixtures/shelter-entry.js',
      formats: ['iife'],
      name: 'ShelterFixture',
    },
  },
});
const output = (Array.isArray(built) ? built[0] : built).output;
const js = output.find((file) => file.type === 'chunk').code;
const css = output
  .filter((file) => file.fileName.endsWith('.css'))
  .map((file) => file.source)
  .join('\n');
async function fixture(page, scenario = '') {
  await page.route('**/__journal_fixture__/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('.js'))
      return route.fulfill({ contentType: 'text/javascript', body: js });
    if (path.endsWith('.css'))
      return route.fulfill({ contentType: 'text/css', body: css });
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="./journal.css"></head><body><div id="app"></div><script type="module" src="./journal.js"></script></body></html>',
    });
  });
  await page.goto(`./__journal_fixture__/index.html?case=${scenario}`);
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-phase',
    'shelter',
  );
}
function observe(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}
async function completeShift(page) {
  const root = page.locator('.shelter-screen');
  const index = await root.getAttribute('data-shift-index');
  await page.locator('[data-action="end"]').click();
  for (let n = 0; n < 100; n++) {
    if (await page.locator('.rush-back').isVisible())
      await page
        .getByRole('button', { name: 'RECALL NOW', exact: true })
        .click();
    else break;
  }
  await expect(root).not.toHaveAttribute('data-shift-index', index);
  if (await page.locator('[data-choice="1"]').isVisible())
    await page.locator('[data-choice="1"]').click();
}
test('journal plays three days (two-day regression), updates wall and uses keyboard', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await fixture(page);
  const root = page.locator('.shelter-screen');
  await expect(page.locator('.crew-card')).toHaveCount(5);
  await expect(page.locator('.wall-slot')).toHaveCount(8);
  await page.locator('[data-key="pantry-water"]').click();
  await page.locator('[data-slot="6"]').click();
  await expect(page.locator('[data-slot="6"]')).toContainText('Water brick');
  const shield = Number(await root.getAttribute('data-shield'));
  expect(shield).toBeGreaterThan(0);
  await page.locator('[data-slot="6"]').click();
  await page.locator('#item-recipient').selectOption('dom');
  await page
    .getByRole('button', { name: 'Drink Water brick', exact: true })
    .click();
  await expect(page.locator('[data-slot="6"]')).toContainText('Gap');
  expect(Number(await root.getAttribute('data-shield'))).toBeLessThan(shield);
  await expect(page.locator('.journal-announcement')).toContainText(
    'we ate part of the wall',
  );
  for (const type of ['water', 'food', 'seeds']) {
    await page.locator(`[data-key="pantry-${type}"]`).click();
    await page
      .getByRole('button', { name: 'Put in wall', exact: true })
      .click();
  }
  await page.locator('[data-crew="ria"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-task="greenhouse"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-crew="ria"]')).toContainText('Greenhouse');
  await page.locator('[data-crew="dom"]').click();
  await page.locator('[data-task="solar"]').click();
  await page.locator('[data-crew="bolt"]').click();
  await page.locator('[data-task="drill"]').click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('journal-viewport.png') });
  await page.screenshot({
    path: testInfo.outputPath('journal-day1.png'),
    fullPage: true,
  });
  for (let shift = 0; shift < 6; shift++) {
    await completeShift(page);
    await expect(root).toHaveAttribute('data-phase', 'shelter');
    await expect(root).toHaveAttribute('data-shift-index', String(shift + 1));
    if (shift === 3) {
      await expect(root).toHaveAttribute('data-day', '3');
      await page.screenshot({
        path: testInfo.outputPath('journal-two-days.png'),
        fullPage: true,
      });
    }
  }
  await expect(root).toHaveAttribute('data-day', '4');
  await expect(page.locator('.shift-log li')).not.toHaveCount(0);
  await expect(page.locator('.forecast-card')).not.toHaveCount(0);
  const stamp = page.locator('.forecast-card .source-stamp').first();
  await stamp.locator('summary').click();
  await expect(stamp).toContainText('Predicted UTC:');
  expect(await stamp.locator('time').textContent()).toMatch(/^2024-/);
  await page.screenshot({
    path: testInfo.outputPath('journal-three-days.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator('button:not(:disabled), summary, select')
      .evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length)
          .every(
            (el) =>
              el.getBoundingClientRect().height >= 44 &&
              el.getBoundingClientRect().width >= 44,
          ),
      ),
  ).toBe(true);
  expect(await page.locator('.journal-header h1').textContent()).not.toMatch(
    /2024|May|UTC/,
  );
  expect(
    await page
      .locator('.journal-page img')
      .evaluateAll((els) =>
        els.every((el) => el.complete && el.naturalWidth > 0),
      ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Title', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fixture title' }),
  ).toBeVisible();
});

test('REAL flare interrupts pause time and recall continues the same shift', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await fixture(page, 'interrupt');
  await page.locator('[data-crew="bolt"]').click();
  await page.locator('[data-task="drill"]').click();
  await page.locator('[data-crew="ria"]').click();
  await page.locator('[data-task="science"]').click();
  await completeShift(page);
  await page.locator('[data-action="end"]').click();
  const dialog = page.locator('.rush-back');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('M8.8 flare');
  await expect(dialog).toContainText('About 2 in 100 M-class');
  const index = await page
    .locator('.shelter-screen')
    .getAttribute('data-shift-index');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-shift-index',
    index,
  );
  await dialog.locator('summary').click();
  await expect(dialog).toContainText('2011-09-25T04:31:00-FLR-001');
  await page.screenshot({ path: testInfo.outputPath('rush-back.png') });
  await page.getByRole('button', { name: 'RECALL NOW', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.shelter-screen')).not.toHaveAttribute(
    'data-shift-index',
    index,
  );
  await expect(page.locator('[data-crew="ria"]')).toContainText('In shelter');
  await expect(page.locator('[data-crew="bolt"]')).toContainText('Ice drill');
  await expect(page.locator('.shift-log')).toContainText('Flare M8.8');
  await fixture(page, 'interrupt');
  await page.locator('[data-crew="ria"]').click();
  await page.locator('[data-task="science"]').click();
  await completeShift(page);
  await page.locator('[data-action="end"]').click();
  await page.getByRole('button', { name: 'KEEP WORKING', exact: true }).click();
  await expect(page.locator('.rush-back')).not.toBeVisible();
  await expect(page.locator('[data-crew="ria"]')).toContainText('Science walk');
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-shift-index',
    '2',
  );
  expect(errors).toEqual([]);
});

test('blind journal hides instruments, respects reduced motion and closes at a real ending', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fixture(page, 'blind');
  await expect(page.locator('.blind-note')).toContainText(
    "You're on your own!",
  );
  await expect(page.locator('.forecast-card')).toHaveCount(0);
  await expect(page.locator('.radio-message')).toHaveCount(0);
  await expect(page.locator('[role="meter"]')).toHaveCount(0);
  await expect(page.locator('[data-crew="bolt"]')).toHaveCount(0);
  await expect(page.locator('.crew-card')).toHaveCount(4);
  for (
    let n = 0;
    n < 6 &&
    (await page.locator('.shelter-screen').getAttribute('data-phase')) ===
      'shelter';
    n++
  )
    await completeShift(page);
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-phase',
    'ending',
  );
  await expect(page.locator('dialog')).toContainText('needs care back home');
  await expect(page.locator('.shift-log')).not.toContainText('Flare');
  expect(
    await page
      .locator('.journal-page')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.screenshot({ path: testInfo.outputPath('blind-ending.png') });
  await page
    .getByRole('button', { name: 'Back to title', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Fixture title' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('Flight Director hides forecast bands; Mara decodes issued forecasts', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await fixture(page, 'director');
  for (let n = 0; n < 4; n++) await completeShift(page);
  await expect(page.locator('.forecast-card').first()).toContainText(
    'uncertainty band hidden',
  );
  await expect(page.locator('.forecast-timeline rect')).toHaveCount(0);
  await expect(page.locator('.crew-card').first()).toContainText(
    'relative rad',
  );
  await page.screenshot({
    path: testInfo.outputPath('director-forecast.png'),
    fullPage: true,
  });
  await page.unroute('**/__journal_fixture__/**');
  await fixture(page, 'comms');
  for (let n = 0; n < 4; n++) await completeShift(page);
  await expect(page.locator('.comms-note').first()).toContainText(
    'Mara decodes',
  );
  await expect(page.locator('.forecast-card').first()).toContainText(
    'Issued UTC:',
  );
  await expect(page.locator('.forecast-timeline rect')).not.toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('mara-forecast.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('real scramble enters the first journal offline without a test fixture', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await page.goto('./?scramble=1&seed=orbit-a');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.getByRole('checkbox', { name: 'Use 2D map', exact: true }).check();
  await page
    .getByRole('button', { name: 'Start scramble', exact: true })
    .click();
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.getByRole('button', { name: 'Find Ria', exact: true }).click();
  await expect(page.locator('[data-crew="ria"]')).toBeDisabled({
    timeout: 9000,
  });
  await page.getByRole('button', { name: 'Hop to hatch', exact: true }).click();
  await expect(page.locator('[data-crew="ria"]')).toContainText('Inside', {
    timeout: 9000,
  });
  await page.getByRole('button', { name: 'Close hatch', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open shelter journal', exact: true })
    .click();
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-phase',
    'shelter',
  );
  await expect(page.locator('.crew-card')).toHaveCount(4);
  await expect(page.locator('.crew-card')).toContainText([
    'Ria',
    'Dom',
    'Aiko',
    'Tunde',
  ]);
  await completeShift(page);
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-shift-index',
    '1',
  );
  await page.screenshot({
    path: testInfo.outputPath('offline-real-handoff.png'),
    fullPage: true,
  });
  expect(
    await page
      .locator('.journal-page img')
      .evaluateAll((els) =>
        els.every((el) => el.complete && el.naturalWidth > 0),
      ),
  ).toBe(true);
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});
