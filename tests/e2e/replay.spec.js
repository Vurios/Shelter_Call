import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test.setTimeout(110000);
const raw = JSON.parse(readFileSync('tests/fixtures/live-donki.json', 'utf8'));
async function preferences(page) {
  await page.goto('./');
  await page.locator('[data-nav="settings"]').click();
  await page.locator('[name="flat"]').check();
  await page.locator('[name="tutorial"]').uncheck();
  await page.locator('[name="motion"]').selectOption('reduced');
  await page.locator('[data-nav="title"]').first().click();
}
async function saved(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('shelter-call.mission.v1')),
  );
}
test('daily attempt scores once, shares its checked code and replays as practice offline', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await preferences(page);
  await page.locator('[data-nav="daily"]').click();
  await page.locator('[data-daily]').click();
  const original = (await saved(page)).run;
  expect(original.mode).toBe('daily');
  await page.locator('[data-start]').click();
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.locator('#home').click();
  await expect(page.locator('#close-hatch')).toBeEnabled({ timeout: 9000 });
  await page.locator('#close-hatch').click();
  await page.locator('#continue-shelter').click();
  for (
    let n = 0;
    n < 40 && (await page.locator('[data-action="end"]').count());
    n++
  ) {
    if (await page.locator('[data-choice="1"]').count())
      await page.locator('[data-choice="1"]').click();
    await page.locator('[data-action="end"]').click();
    while (await page.locator('[data-action="recall"]').count())
      await page.locator('[data-action="recall"]').click();
  }
  await page.locator('[data-reveal]').click();
  await page.locator('[data-unlock]').click();
  const share = await page.locator('.share-text').inputValue(),
    code = share.split('\n').find((line) => line.startsWith('SC1.'));
  expect(share).toMatch(/[🟩🟨]/u);
  expect(code).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath('daily-share.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('[data-nav="almanac"]').click();
  await expect(page.locator('.card-flip').first()).toBeVisible();
  await page.locator('.card-flip').first().click();
  await expect(page.locator('.card-fact').first()).toBeVisible();
  await expect(page.locator('.card-fact').first()).toContainText(
    'NASA/CCMC DONKI',
  );
  await page.locator('[data-nav="title"]').first().click();
  await page.locator('[data-nav="endings"]').click();
  await expect(page.locator('.achievement-grid article')).toHaveCount(12);
  await page.locator('[data-nav="title"]').first().click();
  await page.locator('[data-nav="daily"]').click();
  await expect(page.locator('[data-daily]')).toHaveCount(0);
  await expect(page.locator('.share-text')).toHaveValue(share);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.reload();
  await page.locator('[data-nav="title"]').first().click();
  await page.locator('[data-nav="seed"]').click();
  await page.locator('[name="code"]').fill('SC1.bad.bad');
  await page.locator('.seed-form button').click();
  await expect(page.locator('.code-status')).toContainText('damaged');
  await page.locator('[name="code"]').fill(code);
  await page.locator('.seed-form button').click();
  const practice = (await saved(page)).run;
  expect(practice.mode).toBe('normal');
  for (const key of ['seed', 'windowId', 'crew', 'resupplyShift', 'rng'])
    expect(practice[key]).toEqual(original[key]);
  expect(practice.dailyDate).toBeNull();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('live source snapshots load through the relay, resume offline and use cached or archived fallback', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Date.now = () => Date.parse('2024-05-31T12:00:00Z');
  });
  await preferences(page);
  const requests = [];
  await page.context().route('**/api/donki/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(raw[url.pathname.split('/').at(-1)] ?? []),
    });
  });
  await page.locator('[data-nav="live"]').click();
  await page.locator('[data-live]').click();
  await expect(page.locator('.live-status')).toContainText(
    'complete recent window is ready',
  );
  expect(requests).toHaveLength(5);
  await page.locator('[data-live-play]').click();
  await expect(page.locator('.mission-source')).toContainText('LIVE');
  const live = (await saved(page)).run;
  expect(live.sourceData.meta.source).toBe('NASA/CCMC DONKI');
  await page.locator('[data-start]').click();
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.locator('#home').click();
  await expect(page.locator('#close-hatch')).toBeEnabled({ timeout: 9000 });
  await page.locator('#close-hatch').click();
  await expect(page.locator('.mission-source')).toContainText('LIVE');
  await page.locator('#continue-shelter').click();
  await expect(page.locator('.mission-source')).toContainText('LIVE');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.reload();
  expect((await saved(page)).run.sourceData).toEqual(live.sourceData);
  await expect(page.locator('.mission-source')).toContainText('LIVE');
  await page.locator('[data-action="exit"]').click();
  await page.context().unroute('**/api/donki/**');
  await page.context().route('**/api/donki/**', (route) => route.abort());
  await page.locator('[data-nav="live"]').click();
  await page.locator('[data-live]').click();
  await expect(page.locator('.live-status')).toContainText('cached LIVE Sun');
  await page.screenshot({
    path: testInfo.outputPath('live-cached.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.evaluate(() =>
    localStorage.removeItem('shelter-call.live-source.v1'),
  );
  await page.reload();
  await page.locator('[data-action="exit"]').click();
  await page.locator('[data-nav="live"]').click();
  await page.locator('[data-live]').click();
  await expect(page.locator('.live-ready')).toContainText('ARCHIVE FALLBACK');
});
test('Filipino replay menus use large text without motion or overflow', async ({
  page,
}) => {
  await preferences(page);
  await page.locator('[data-nav="settings"]').click();
  await page.locator('[name="language"]').selectOption('fil');
  await page.locator('[name="textSize"]').selectOption('largest');
  await page.locator('[data-nav="title"]').first().click();
  for (const menu of ['daily', 'seed', 'historic', 'almanac', 'endings']) {
    await page.locator(`[data-nav="${menu}"]`).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('main')
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');
    expect(await page.locator('main').textContent()).not.toContain(
      'achievement.condition.',
    );
    if (menu === 'seed')
      await expect(page.locator('.seed-form button')).toHaveText(
        'Laruin ang code na ito',
      );
    await page.locator('[data-nav="title"]').first().click();
  }
});
