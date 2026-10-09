import { test, expect } from '@playwright/test';

test('judge tour preserves real controls and completes offline', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) errors.push(m.text());
  });
  await page.goto('./?judge=1');
  await expect(page.locator('.judge-guide').first()).toContainText(
    '60 minutes',
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-judge-start]').click();
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run,
  );
  expect(saved.mode).toBe('judge');
  expect(saved.seed).toBe('shelter-call-judge-2024');
  expect(saved.windowId).toBe('2024-05-11T02:10:00-WINDOW-001');
  await expect(page.locator('[data-coach]')).toHaveCount(0);
  await page.locator('[data-crew="ria"]').click();
  await expect(page.locator('[data-crew="ria"]')).toBeDisabled({
    timeout: 15000,
  });
  await page.locator('#home').click();
  await expect(page.locator('#close-hatch')).toBeEnabled({ timeout: 15000 });
  await page.locator('#close-hatch').click();
  await page.locator('#continue-shelter').click();
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-phase',
    'shelter',
  );
  await expect(page.locator('.day-coach')).toHaveCount(0);
  for (
    let n = 0;
    n < 40 && (await page.locator('.shelter-screen').count());
    n++
  ) {
    if (await page.locator('[data-choice="0"]').count())
      await page.locator('[data-choice="0"]').click();
    await page.locator('[data-action="end"]').click();
    while (await page.locator('[data-action="recall"]').count())
      await page.locator('[data-action="recall"]').click();
  }
  await page.locator('[data-reveal]').click();
  await expect(page.locator('.real-panel')).toHaveAttribute('open', '');
  await expect(page.locator('.judge-closing')).toContainText(
    '124 independent clean',
  );
  await expect(page.locator('.real-panel')).toContainText(
    '2024-05-11T02:10:00-SEP-001',
  );
  await page.screenshot({
    path: testInfo.outputPath('judge-reveal.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
