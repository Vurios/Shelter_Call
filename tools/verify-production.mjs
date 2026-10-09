import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'https://shelter-call.pages.dev';
const output = process.argv[3] || 'docs/overhaul/production';
await mkdir(output, { recursive: true });
const localHtml = await readFile('dist/index.html', 'utf8');
const script = localHtml.match(/src="(\/bundles\/index-[^"]+\.js)"/)[1];
const fonts = [...localHtml.matchAll(/rel="preload"\s+href="([^"]+)"/g)].map(
  (match) => match[1],
);
let matched = false;
for (let attempt = 0; attempt < 55; attempt++) {
  const response = await fetch(base + '/?release=' + Date.now());
  assert.equal(response.status, 200);
  const html = await response.text();
  matched =
    html.includes(script) &&
    fonts.every((font) => html.includes(`href="${font}"`));
  if (matched) break;
  console.log('Waiting for deployed entry bundle: ' + script);
  await new Promise((resolve) => setTimeout(resolve, 30000));
}
assert(matched, 'Production entry matches the final local code bundle');
const api = base.startsWith('https:')
  ? await fetch(base + '/api/donki/FLR?startDate=2024-05-01&endDate=2024-05-31')
  : null;
let donki = null;
if (api) {
  assert.equal(api.status, 200);
  assert(api.headers.get('content-type').includes('application/json'));
  const rows = await api.json();
  assert(Array.isArray(rows));
  donki = {
    status: api.status,
    records: rows.length,
    contentType: api.headers.get('content-type'),
  };
}
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
  for (const [width, height] of [
    [1280, 720],
    [360, 640],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width === 360,
      isMobile: width === 360,
    });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (['warning', 'error'].includes(m.type())) errors.push(m.text());
    });
    await page.goto(base + '/');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${output}/title-${width}.png`,
      animations: 'disabled',
    });
    await page.goto(base + '/?judge=1');
    let keys = 0;
    async function activate(selector) {
      await page.locator(selector).waitFor({ state: 'visible' });
      if (width === 360) return page.locator(selector).tap();
      for (let n = 0; n < 250; n++) {
        if (
          await page
            .locator(selector)
            .evaluate((el) => el === document.activeElement)
        ) {
          await page.keyboard.press('Enter');
          keys++;
          return;
        }
        await page.keyboard.press('Tab');
        keys++;
      }
      throw new Error(`Keyboard could not reach ${selector}`);
    }
    await activate('[data-judge-start]');
    await page.waitForFunction(
      () =>
        document.querySelector('.scramble-screen')?.dataset.ready === 'true',
    );
    await activate('[data-crew="ria"]');
    await page.waitForFunction(
      () => document.querySelector('[data-crew="ria"]')?.disabled,
    );
    await activate('#home');
    await page.waitForFunction(
      () => document.querySelector('#close-hatch')?.disabled === false,
    );
    await activate('#close-hatch');
    await activate('#continue-shelter');
    await page.locator('.habitat-room').waitFor();
    await page.waitForFunction(
      () => document.querySelector('.habitat-room')?.dataset.renderer === '3d',
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `${output}/room-${width}.png`,
      animations: 'disabled',
    });
    const checkpoint = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('shelter-call.mission.v1')),
    );
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await context.setOffline(true);
    await page.reload();
    await page.locator('.habitat-room').waitFor();
    const resumed = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('shelter-call.mission.v1')),
    );
    assert.deepEqual(
      resumed.run,
      checkpoint.run,
      'Offline reload preserves the actual mission',
    );
    await activate('[data-crew="ria"]');
    await activate('[data-task="drill"]');
    await activate('[data-inspector="wall"]');
    await page.screenshot({
      path: `${output}/wall-${width}.png`,
      animations: 'disabled',
    });
    let shifts = 0;
    for (
      ;
      shifts < 40 && (await page.locator('.shelter-screen').count());
      shifts++
    ) {
      if (await page.locator('[data-choice="0"]').count())
        await activate('[data-choice="0"]');
      await activate('[data-action="end"]');
      while (await page.locator('[data-action="recall"]').count())
        await activate('[data-action="recall"]');
    }
    await activate('[data-reveal]');
    await page.locator('.decision-reflection').screenshot({
      path: `${output}/reflection-${width}.png`,
      animations: 'disabled',
    });
    await page.locator('.ending-card').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${output}/ending-${width}.png`,
      animations: 'disabled',
    });
    const science = page.locator('.real-panel > ul').last();
    await science.scrollIntoViewIfNeeded();
    await science.screenshot({
      path: `${output}/science-${width}.png`,
      animations: 'disabled',
    });
    assert((await science.innerText()).includes('Earth records, lunar story'));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      input: width === 360 ? 'touch' : 'keyboard only (Tab/Enter)',
      keys,
      offlineReload: true,
      offlineEnding: true,
      shifts,
      ending: await page.locator('.ending-card h1').innerText(),
      errors,
    });
    await context.close();
  }
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify({ base, script, donki, results }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ base, script, donki, results }));
} finally {
  await browser.close();
}
