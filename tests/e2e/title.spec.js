import { expect, test } from '@playwright/test';

test('title loads, mission setup opens, and screenshots are saved', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'SHELTER CALL' }),
  ).toBeVisible();
  await expect(
    page.getByText('not NASA records', { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('title.png'),
    fullPage: true,
  });
  const button = page.getByRole('button', { name: 'Check mission setup' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('60 seconds')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('mission-setup.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'SHELTER CALL' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Check mission setup' }).click();
  await expect(page.getByText('60 seconds')).toBeVisible();
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});
