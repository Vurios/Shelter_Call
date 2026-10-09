import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
// Three complete context creation/disposal cycles, including software-GPU CI.
test.setTimeout(90000);

const checkpoint = JSON.parse(
  await readFile('docs/overhaul/before/checkpoint-1280x720.json', 'utf8'),
);
test('3D scene changes release canvases, animation loops and geometry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window),
      active = new Set();
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => {
        active.delete(id);
        callback(time);
      });
      active.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      active.delete(id);
      cancel(id);
    };
    window.animationAudit = () => active.size;
  });
  await resume(page, { graphics: 'high' });
  const counts = [];
  for (let n = 0; n < 3; n++) {
    await expect(page.locator('.habitat-room')).toHaveAttribute(
      'data-renderer',
      '3d',
    );
    await page.locator('[data-crew="dom"]').click();
    await page.locator('[data-task="solar"]').click();
    await page.locator('[data-task="shelter"]').click();
    await page.waitForTimeout(150);
    counts.push(
      Number(
        await page.locator('.habitat-webgl').getAttribute('data-geometries'),
      ),
    );
    expect(
      await page.evaluate(() => window.animationAudit()),
    ).toBeLessThanOrEqual(1);
    await page.locator('[data-action="exit"]').click();
    await expect(page.locator('.habitat-webgl canvas')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.animationAudit()))
      .toBe(0);
    await page.locator('[data-continue]').click();
  }
  expect(new Set(counts).size).toBe(1);
  expect(counts[0]).toBeGreaterThan(0);
});
async function resume(page, settings = {}) {
  await page.goto('./');
  await page.evaluate(
    ({ checkpoint, settings }) => {
      localStorage.setItem(
        'shelter-call.mission.v1',
        JSON.stringify(checkpoint),
      );
      localStorage.setItem(
        'shelter-call.settings.v1',
        JSON.stringify({ ...settings, tutorial: false }),
      );
    },
    { checkpoint, settings },
  );
  await page.reload();
  await expect(page.locator('.habitat-room')).toBeVisible();
}
test('living shelter previews wall cost, retains slots and survives context loss', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await resume(page, { graphics: 'high' });
  await expect(page.locator('.habitat-room')).toHaveAttribute(
    'data-renderer',
    '3d',
  );
  await page.locator('[data-room-inspector="wall"]').click();
  await page.locator('[data-key="pantry-water"]').click();
  const preview = await page.locator('.item-tools .known-preview').innerText();
  expect(preview).toContain('Shield 0% → 31%');
  await page.locator('[data-slot="0"]').click();
  await expect(page.locator('#shield-value')).toHaveText('31%');
  await expect(page.locator('[data-slot="0"]')).toContainText('Water brick');
  await page.locator('[data-slot="0"]').click();
  await expect(page.locator('.item-tools .known-preview')).toContainText(
    'Shield 31% → 0%',
  );
  await page.locator('[data-action="use"]').click();
  await expect(page.locator('#shield-value')).toHaveText('0%');
  await expect(page.locator('[data-slot="0"]')).toContainText('Gap');
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run,
  );
  await page
    .locator('.habitat-webgl canvas')
    .evaluate((canvas) =>
      canvas
        .getContext('webgl2')
        .getExtension('WEBGL_lose_context')
        .loseContext(),
    );
  await expect(page.locator('.habitat-room')).toHaveAttribute(
    'data-renderer',
    'illustrated',
  );
  await expect(page.locator('.habitat-webgl canvas')).toHaveCount(0);
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run,
  );
  expect(after).toEqual(before);
  await page.locator('[data-crew="dom"]').click();
  await page.locator('[data-task="solar"]').click();
  await expect(page.locator('.known-preview').first()).toContainText('Power +');
  await page.reload();
  await expect(page.locator('[data-crew="dom"]')).toContainText('Solar repair');
  await expect(page.locator('[data-slot="0"]')).toContainText('Gap');
  expect(errors).toEqual([]);
});

test('illustrated room, large translated text and repeated resume preserve mission', async ({
  page,
}) => {
  await resume(page, {
    graphics: 'illustrated',
    flat: true,
    textSize: 'largest',
    language: 'fil',
    motion: 'reduced',
  });
  await expect(page.locator('.habitat-webgl canvas')).toHaveCount(0);
  await expect(page.locator('.habitat-illustration svg')).toBeVisible();
  await expect(page.locator('[data-inspector="wall"]')).toHaveText('Suplay');
  await expect(page.locator('[data-action="end"]')).toContainText(
    'Tapusin ang turno AM',
  );
  await expect(page.locator('.resupply-status')).toContainText('araw');
  await expect(page.locator('.journal-announcement')).toContainText(
    'Pumili ng gawain',
  );
  await expect
    .poll(async () => {
      const footer = await page.locator('.journal-footer').boundingBox();
      const status = await page.locator('.journal-announcement').boundingBox();
      return footer.y + footer.height <= status.y + 1;
    })
    .toBe(true);
  for (let n = 0; n < 3; n++) {
    await page.locator('[data-action="exit"]').click();
    await expect(page.locator('.habitat-room')).toHaveCount(0);
    await page.locator('[data-continue]').click();
    await expect(page.locator('.habitat-room')).toHaveCount(1);
    await expect(page.locator('.habitat-webgl canvas')).toHaveCount(0);
  }
  await page.locator('[data-inspector="wall"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#inspector-wall')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
