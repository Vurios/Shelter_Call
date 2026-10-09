import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:4173';
const output = process.argv[3] || 'docs/overhaul/performance.json';
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/chromium',
  ].find(existsSync);
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
});
const report = {
  base,
  browser: browser.version(),
  environment:
    'Headless Chrome on Windows; desktop and touch viewport emulation, not a physical Android device.',
  samples: [],
};
async function frames(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [];
        let last;
        function frame(now) {
          if (last) samples.push(now - last);
          last = now;
          if (samples.length < 180) requestAnimationFrame(frame);
          else {
            const sorted = [...samples].sort((a, b) => a - b);
            resolve({
              frames: samples.length,
              fps: (1000 * samples.length) / samples.reduce((a, b) => a + b),
              medianMs: sorted[90],
              p95Ms: sorted[171],
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
}
try {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ]) {
    for (const graphics of ['high', 'low']) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 600,
        isMobile: width < 600,
      });
      const page = await context.newPage();
      const checkpoint = JSON.parse(
        await readFile('docs/overhaul/before/checkpoint-1280x720.json', 'utf8'),
      );
      await page.goto(base);
      await page.evaluate(
        ({ checkpoint, graphics }) => {
          localStorage.setItem(
            'shelter-call.mission.v1',
            JSON.stringify(checkpoint),
          );
          localStorage.setItem(
            'shelter-call.settings.v1',
            JSON.stringify({ graphics, tutorial: false }),
          );
        },
        { checkpoint, graphics },
      );
      await page.reload();
      await page.waitForFunction(
        () =>
          document.querySelector('.habitat-room')?.dataset.renderer === '3d',
      );
      await page.waitForTimeout(1500);
      const timing = await frames(page);
      const metrics = await page
        .locator('.habitat-webgl')
        .evaluate((el) => ({ ...el.dataset }));
      const gpu = await page
        .locator('.habitat-webgl canvas')
        .evaluate((canvas) => {
          const gl = canvas.getContext('webgl2'),
            info = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            renderer: info
              ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
              : 'unavailable',
            devicePixelRatio,
            hardwareConcurrency: navigator.hardwareConcurrency,
          };
        });
      report.samples.push({
        scene: 'shelter',
        width,
        height,
        graphics,
        ...timing,
        metrics,
        gpu,
      });
      // Use the ordinary test/setup entry and actual controls for the exterior.
      await page.goto(`${base}/?scramble=1&seed=orbit-a`);
      await page
        .getByRole('button', { name: 'Start scramble', exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector('.scramble-screen')?.dataset.ready === 'true',
      );
      await page.waitForTimeout(1500);
      const exterior = await frames(page);
      const scene = await page
        .locator('.scramble-screen')
        .evaluate((el) => ({ ...el.dataset }));
      assert.equal(scene.phase, 'playing');
      report.samples.push({
        scene: 'scramble',
        width,
        height,
        graphics,
        ...exterior,
        metrics: scene,
      });
      await context.close();
      console.log(JSON.stringify(report.samples.slice(-2)));
    }
  }
  await mkdir(output.substring(0, output.lastIndexOf('/')), {
    recursive: true,
  });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}
