import { expect, test } from '@playwright/test';

test('title menus, local music and a first offline art journal', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'SHELTER CALL', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('verified NASA records', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('#difficulty')).toHaveValue('Commander');
  for (const name of [
    'Daily Sun',
    'Sun Almanac',
    'Endings',
    'How it works',
    'Credits',
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    if (name === 'Endings')
      await expect(page.locator('.collected-ending img')).toHaveCount(10);
    if (name === 'How it works')
      await expect(page.locator('.how-grid article')).toHaveCount(5);
    await page
      .getByRole('button', { name: 'Title', exact: true })
      .first()
      .click();
  }
  await page.screenshot({
    path: testInfo.outputPath('title.png'),
    fullPage: true,
  });
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    );
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Title', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Play title music', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Stop title music', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Stop title music', exact: true })
    .click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'SHELTER CALL', exact: true }),
  ).toBeVisible();
  const source = await page.evaluate(
    async () => (await (await fetch('/data/episodes.json')).json()).meta.source,
  );
  expect(source).toBe('NASA/CCMC DONKI');
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
