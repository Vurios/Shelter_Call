import { test, expect } from '@playwright/test';
test.setTimeout(110000);
function observe(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}
async function setup(
  page,
  seed,
  { tutorial = false, language = 'en', difficulty = 'Commander' } = {},
) {
  await page.goto(`./?seed=${seed}`);
  await page.locator('[data-nav="settings"]').click();
  await page.locator('[name="flat"]').check();
  if (!tutorial) await page.locator('[name="tutorial"]').uncheck();
  if (language !== 'en')
    await page.locator('[name="language"]').selectOption(language);
  await page.locator('[data-nav="title"]').first().click();
  await page.locator('#difficulty').selectOption(difficulty);
}
async function begin(page, difficulty = 'Commander') {
  await page.locator('[data-play]').click();
  if (difficulty !== 'Cadet') {
    await expect(page.locator('[data-draft][aria-pressed="true"]')).toHaveCount(
      4,
    );
    await page.locator('[data-draft="tunde"]').click();
    await page.locator('[data-draft="mara"]').click();
    await page.locator('[data-briefing]').click();
  }
  await page.locator('[data-start]').click();
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
async function closeToJournal(page) {
  // Real movement and pickups; no game-state injection or test fixture.
  await page.locator('[data-crew="ria"]').click();
  await expect(page.locator('[data-crew="ria"]')).toBeDisabled({
    timeout: 9000,
  });
  await page.locator('#home').click();
  await expect(page.locator('#close-hatch')).toBeEnabled({ timeout: 9000 });
  await page.locator('#close-hatch').click();
  await page.locator('#continue-shelter').click();
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-phase',
    'shelter',
  );
}
async function finish(page) {
  for (
    let n = 0;
    n < 40 && (await page.locator('[data-action="end"]').count());
    n++
  ) {
    if (await page.locator('[data-choice="1"]').count())
      await page.locator('[data-choice="1"]').click();
    await page.locator('[data-action="end"]').click();
    for (
      let j = 0;
      j < 100 && (await page.locator('[data-action="recall"]').count());
      j++
    )
      await page.locator('[data-action="recall"]').click();
    if (await page.locator('[data-choice="1"]').count())
      await page.locator('[data-choice="1"]').click();
  }
  await expect(page.locator('[data-reveal]')).toBeVisible();
  await page.locator('[data-reveal]').click();
  await expect(page.locator('.reveal-timeline')).toBeVisible();
}
for (const [seed, difficulty, language] of [
  ['orbit-a', 'Commander', 'en'],
  ['orbit-b', 'Cadet', 'en'],
  ['orbit-c', 'Flight Director', 'fil'],
])
  test(`complete ${difficulty} mission ${seed} in ${language}`, async ({
    page,
  }, testInfo) => {
    const errors = observe(page);
    await setup(page, seed, { difficulty, language });
    await begin(page, difficulty);
    await closeToJournal(page);
    if (await page.locator('[data-key="pantry-water"]').count()) {
      await page.locator('[data-key="pantry-water"]').click();
      await page.locator('[data-slot="6"]').click();
    }
    await page.locator('[data-crew="ria"]').click();
    await page.locator('[data-task="drill"]').click();
    await page.locator('[data-action="end"]').click();
    const before = await page
      .locator('.shelter-screen')
      .evaluate((el) => ({ ...el.dataset }));
    const slot = await page
      .locator('[data-slot="6"]')
      .getAttribute('data-item');
    await page.reload();
    await expect(page.locator('.shelter-screen')).toHaveAttribute(
      'data-shift-index',
      before.shiftIndex,
    );
    await expect(page.locator('[data-slot="6"]')).toHaveAttribute(
      'data-item',
      slot,
    );
    await expect(
      page.locator('[data-crew="ria"] .assignment-tag'),
    ).toContainText(language === 'fil' ? 'Maghukay ng yelo' : 'Ice drill');
    await finish(page);
    await page.locator('#reveal-scrub').focus();
    const earlier = await page.locator('#scrub-readout').textContent();
    await page.keyboard.press('End');
    await expect(page.locator('#scrub-readout')).not.toHaveText(earlier);
    await page.locator('.real-panel summary').click();
    await expect(page.locator('.real-panel code').first()).toBeVisible();
    expect(await page.locator('.real-panel').innerText()).toContain('mSv');
    await page.screenshot({
      path: testInfo.outputPath('reveal.png'),
      fullPage: true,
      animations: 'disabled',
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('[data-unlock]').click();
    await expect(page.locator('.unlock-mark')).toBeVisible();
    const previous = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run.seed,
    );
    await page.locator('[data-again]').click();
    await expect(page.locator('.scramble-screen')).toHaveAttribute(
      'data-ready',
      'true',
    );
    const next = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('shelter-call.mission.v1')).run.seed,
    );
    expect(next).not.toBe(previous);
    expect(errors).toEqual([]);
  });
test('separate practice, first offline full mission, reduced motion and reload', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, 'offline-full', { tutorial: true, difficulty: 'Cadet' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await begin(page, 'Cadet');
  await expect(page.locator('.practice-coach')).toBeVisible();
  await expect(page.locator('#source-timer')).toContainText('GAME practice');
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-remaining',
    /2\d\./,
  );
  await page.locator('#skip-practice').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.practice-coach')).toHaveCount(0);
  await expect(page.locator('#source-timer')).toContainText('REAL:');
  await closeToJournal(page);
  await expect(page.locator('.day-coach')).toContainText('①');
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-action="coach-next"]').focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('.day-coach')).toHaveCount(0);
  await finish(page);
  expect(
    await page
      .locator('.date-reveal h1')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.reload();
  await expect(page.locator('.reveal-screen')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('offline-reveal.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});
test('keyboard-only full flow with blocked storage and large text', async ({
  page,
}, testInfo) => {
  const errors = observe(page);
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked for acceptance');
      },
    }),
  );
  await page.goto('./?seed=keyboard-full');
  async function enter(locator) {
    await locator.focus();
    await page.keyboard.press('Enter');
  }
  await enter(page.locator('[data-nav="settings"]'));
  await page.locator('[name="flat"]').focus();
  await page.keyboard.press('Space');
  await page.locator('[name="tutorial"]').focus();
  await page.keyboard.press('Space');
  await page.locator('[name="textSize"]').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await enter(page.locator('[data-nav="title"]').first());
  await enter(page.locator('[data-play]'));
  await enter(page.locator('[data-briefing]'));
  await enter(page.locator('[data-start]'));
  await expect(page.locator('.scramble-screen')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.keyboard.press('p');
  await expect(page.locator('.pause-overlay')).toBeVisible();
  await page.keyboard.press('p');
  await enter(page.locator('#home'));
  await expect(page.locator('#close-hatch')).toBeEnabled({ timeout: 9000 });
  await enter(page.locator('#close-hatch'));
  await enter(page.locator('#continue-shelter'));
  await expect(page.locator('.shelter-screen')).toHaveAttribute(
    'data-phase',
    'shelter',
  );
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement.matches('button')),
  ).toBe(true);
  await enter(page.locator('[data-crew="ria"]'));
  await enter(page.locator('[data-task="drill"]'));
  for (
    let n = 0;
    n < 40 && (await page.locator('[data-action="end"]').count());
    n++
  ) {
    if (await page.locator('[data-choice="1"]').count())
      await enter(page.locator('[data-choice="1"]'));
    await enter(page.locator('[data-action="end"]'));
    for (
      let j = 0;
      j < 100 && (await page.locator('[data-action="recall"]').count());
      j++
    )
      await enter(page.locator('[data-action="recall"]'));
  }
  await enter(page.locator('[data-reveal]'));
  await page.locator('#reveal-scrub').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#reveal-scrub')).toHaveValue('1000');
  await enter(page.locator('[data-unlock]'));
  await enter(page.locator('[data-nav="endings"]'));
  await expect(page.getByText('1 of 10 endings collected')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('keyboard-collection.png'),
    animations: 'disabled',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
