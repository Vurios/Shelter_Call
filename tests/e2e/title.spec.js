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
    page.getByText('verified NASA records', { exact: false }),
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
  await expect(page.getByText('60 minutes')).toBeVisible();
  const episodes = await page.evaluate(async () => {
    const response = await fetch(
      new URL('./data/episodes.json', document.baseURI),
    );
    if (!response.ok) throw new Error('Real episode data did not load.');
    return response.json();
  });
  expect(episodes.meta.source).toBe('NASA/CCMC DONKI');
  expect(episodes.windows.length).toBeGreaterThanOrEqual(30);
  const music = page.getByRole('button', { name: 'Play title music' });
  await music.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Stop title music' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Stop title music' }).click();
  await expect(
    page.getByRole('button', { name: 'Play title music' }),
  ).toHaveAttribute('aria-pressed', 'false');
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
  await expect(page.getByText('60 minutes')).toBeVisible();
  const offlineSource = await page.evaluate(async () => {
    const response = await fetch(
      new URL('./data/episodes.json', document.baseURI),
    );
    return (await response.json()).meta.source;
  });
  expect(offlineSource).toBe('NASA/CCMC DONKI');
  // First gallery visit is offline: its lazy renderer and complete art kit must
  // have been cached from the title's first load, not warmed by a gallery visit.
  await page
    .getByRole('link', { name: 'Open the art & sound journal' })
    .click();
  await expect(page.locator('.gallery')).toHaveAttribute('data-ready', 'true', {
    timeout: 30000,
  });
  await expect(page.locator('[data-model-state="loaded"]')).toHaveCount(29);
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});
