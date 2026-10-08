import { expect, test } from '@playwright/test';

test.setTimeout(110000);
const seeds = ['orbit-a', 'orbit-b', 'orbit-c'];
function observe(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}
async function ready(page, seed, flat = false) {
  await page.goto(`./?seed=${seed}`);
  await page
    .getByRole('button', { name: 'Play scramble', exact: true })
    .click();
  if (flat)
    await page
      .getByRole('checkbox', { name: 'Use 2D map', exact: true })
      .check();
  await page
    .getByRole('button', { name: 'Start scramble', exact: true })
    .click();
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30000 },
  );
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-phase',
    'playing',
  );
}
for (const seed of seeds)
  test(`plays a seeded scramble for ${seed} through storm and core handoff`, async ({
    page,
  }, testInfo) => {
    const errors = observe(page);
    // Cloud runners have no hardware GPU. Their full countdown/rescue runs
    // use the supplied 2D briefing option; local GPU runs use 3D throughout.
    // The separate offline/switch test still loads 3D on CI.
    const flat = Boolean(process.env.CI);
    await ready(page, seed, flat);
    const root = page.locator('.scramble-screen');
    await expect(root).toHaveAttribute('data-renderer', flat ? '2d' : '3d');
    await expect(page.locator('#source-timer')).toContainText('YOU: 60 s');
    await expect(page.locator('#clamp-note')).toBeVisible();
    if (!flat)
      await expect
        .poll(async () => Number(await root.getAttribute('data-fps')))
        .toBeGreaterThan(0);
    expect(
      Number(await root.getAttribute('data-pixel-ratio')),
    ).toBeLessThanOrEqual(1.5);
    expect(Number(await root.getAttribute('data-draw-calls'))).toBeLessThan(
      220,
    );
    await page.screenshot({ path: testInfo.outputPath('outpost.png') });
    if (seed === 'orbit-a') {
      const x = await root.getAttribute('data-player-x');
      const canvas = page.locator('.scramble-canvas');
      const bounds = await canvas.boundingBox();
      await canvas.click({
        position: { x: bounds.width * 0.64, y: bounds.height * 0.52 },
      });
      await expect.poll(() => root.getAttribute('data-player-x')).not.toBe(x);
      await page.keyboard.down('d');
      await page.waitForTimeout(400);
      await page.keyboard.up('d');
    }
    for (const name of ['Ria', 'Dom', 'Aiko', 'Tunde']) {
      const button = page.getByRole('button', {
        name: `Find ${name}`,
        exact: true,
      });
      if (await button.isEnabled()) await button.click();
      await expect(button).toBeDisabled({ timeout: 9000 });
      if (name === 'Ria') {
        await expect
          .poll(() =>
            page
              .locator('.carry-slots img')
              .evaluateAll((images) =>
                images.every(
                  (image) => image.complete && image.naturalWidth > 0,
                ),
              ),
          )
          .toBe(true);
        await page.screenshot({
          path: testInfo.outputPath('crew-following.png'),
        });
      }
      await page
        .getByRole('button', { name: 'Hop to hatch', exact: true })
        .click();
      await expect(button).toContainText('Inside', { timeout: 9000 });
    }
    await expect(page.locator('#crew-saved')).toHaveText('4 / 4 inside');
    await expect(page.locator('#supplies-saved')).not.toHaveText('0 stashed');
    await page.screenshot({ path: testInfo.outputPath('crew-saved.png') });
    await testInfo.attach('frame-sample', {
      body: JSON.stringify(
        await root.evaluate((element) => ({ ...element.dataset })),
      ),
      contentType: 'application/json',
    });
    await expect
      .poll(async () => Number(await root.getAttribute('data-remaining')), {
        timeout: 60000,
      })
      .toBeLessThanOrEqual(10);
    await expect(root).toHaveClass(/timer-warning/);
    await page.screenshot({
      path: testInfo.outputPath('last-ten-seconds.png'),
    });
    await expect(root).toHaveAttribute('data-phase', 'result', {
      timeout: 17000,
    });
    await expect(root).toHaveAttribute('data-core-phase', 'shelter');
    await expect(root).toHaveAttribute('data-crew-saved', '4');
    await expect(root).toHaveAttribute('data-time-left', '0.00');
    await expect
      .poll(() =>
        page
          .locator('.scramble-result img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('hatch-report.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page
      .getByRole('button', { name: 'Back to title', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'SHELTER CALL' }),
    ).toBeVisible();
    await expect(page.locator('.scramble-canvas')).toHaveCount(0);
  });

test('first offline scramble loads, pauses, switches renderers and closes early', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?seed=orbit-a');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page
    .getByRole('button', { name: 'Play scramble', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Start scramble', exact: true })
    .click();
  const root = page.locator('.scramble-screen');
  await expect(root).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(root).toHaveAttribute('data-renderer', '3d');
  await page.keyboard.press('p');
  const remaining = await root.getAttribute('data-remaining');
  await page.waitForTimeout(500);
  expect(await root.getAttribute('data-remaining')).toBe(remaining);
  await page.getByRole('button', { name: 'Use 2D', exact: true }).click();
  await expect(root).toHaveAttribute('data-renderer', '2d');
  expect(await root.getAttribute('data-remaining')).toBe(remaining);
  await page.getByRole('button', { name: 'Use 3D', exact: true }).click();
  await expect(root).toHaveAttribute('data-renderer', '3d');
  expect(await root.getAttribute('data-remaining')).toBe(remaining);
  await page
    .getByRole('button', { name: 'Resume scramble', exact: true })
    .click();
  await page.getByRole('button', { name: 'Hop to hatch', exact: true }).focus();
  await page.keyboard.press('Enter');
  const close = page.getByRole('button', { name: 'Close hatch', exact: true });
  await expect(close).toBeEnabled({ timeout: 7000 });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-phase', 'result');
  expect(Number(await root.getAttribute('data-time-left'))).toBeGreaterThan(0);
  await expect(root).toHaveAttribute('data-core-phase', 'shelter');
  await page.screenshot({
    path: testInfo.outputPath('offline-early-report.png'),
    fullPage: true,
  });
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});

test('unavailable WebGL opens the same run in a keyboard-operable 2D map', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : get.call(this, type, ...args);
    };
  });
  const errors = observe(page);
  await ready(page, 'orbit-a');
  const root = page.locator('.scramble-screen');
  await expect(root).toHaveAttribute('data-renderer', '2d');
  await page.getByRole('button', { name: 'Find Ria', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-crew="ria"]')).toBeDisabled({
    timeout: 9000,
  });
  await page.getByRole('button', { name: 'Hop to hatch', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-crew="ria"]')).toContainText('Inside', {
    timeout: 9000,
  });
  await page.screenshot({ path: testInfo.outputPath('fallback-map.png') });
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'SHELTER CALL' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('sustained slow frames offer 2D without restarting the timer', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      request(() => setTimeout(() => callback(performance.now()), 70));
  });
  const errors = observe(page);
  await ready(page, 'orbit-a');
  const root = page.locator('.scramble-screen');
  await expect(page.locator('.slow-offer')).toBeVisible({ timeout: 9000 });
  expect(Number(await root.getAttribute('data-fps'))).toBeLessThan(25);
  const before = Number(await root.getAttribute('data-remaining'));
  await page
    .getByRole('button', { name: 'Switch to 2D mode', exact: true })
    .click();
  await expect(root).toHaveAttribute('data-renderer', '2d');
  expect(Number(await root.getAttribute('data-remaining'))).toBeLessThanOrEqual(
    before,
  );
  await expect(root).toHaveAttribute('data-phase', 'playing');
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  expect(errors).toEqual([]);
});
