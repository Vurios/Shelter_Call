import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { SOUND_CUES, THEMES, synthesize } from '../../src/audio/synth.js';

// Exhaustive image/model screenshots and a real offline audio render need a
// larger per-test budget than the small title smoke test, especially on CI.
test.setTimeout(90000);

test('gallery shows the entire kit, plays every cue, and works offline', async ({
  page,
}, testInfo) => {
  const errors = [],
    failures = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto('./?gallery=1');
  await expect(page.locator('.gallery')).toHaveAttribute('data-ready', 'true', {
    timeout: 30000,
  });
  await expect(page.locator('[data-model-state="loaded"]')).toHaveCount(29);
  expect(
    await page.evaluate(() => window.galleryAudio.getStatus().unlocked),
  ).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('gallery-cover.png') });
  await page
    .getByRole('button', { name: 'Pause rotation', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Resume rotation', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  // Every model gets a visible canvas snapshot, including lower-page cards.
  for (const card of await page.locator('[data-model]').all()) {
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await card.screenshot({
      path: testInfo.outputPath(
        `model-${await card.getAttribute('data-model')}.png`,
      ),
    });
  }
  for (const id of ['portraits', 'icons', 'endings', 'materials', 'sounds']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`gallery-${id}.png`) });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  // Load and validate every lazy image, not only those initially visible.
  for (const image of await page.locator('.gallery img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(
      await image.evaluate((element) => element.naturalWidth),
    ).toBeGreaterThan(0);
  }
  for (const [index, row] of (
    await page.locator('.crew-row').all()
  ).entries()) {
    await row.screenshot({
      path: testInfo.outputPath(`portraits-${index + 1}.png`),
    });
  }
  for (const selector of [
    'plant-grid',
    'ending-grid',
    'icon-grid',
    'type-samples',
    'texture-grid',
  ]) {
    await page
      .locator(`.${selector}`)
      .screenshot({ path: testInfo.outputPath(`${selector}.png`) });
  }
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return [
        '400 16px "Atkinson Hyperlegible"',
        '700 16px "Atkinson Hyperlegible"',
        '400 24px "Patrick Hand"',
      ].every((font) => document.fonts.check(font, 'Kumusta Ñ ñ'));
    }),
  ).toBe(true);
  for (const cue of SOUND_CUES) {
    await page.locator(`[data-sound="${cue.id}"]`).click();
    await expect(page.locator('#sound-caption')).toHaveText(cue.caption);
  }
  for (const theme of THEMES) {
    await page.locator(`[data-theme="${theme.id}"]`).click();
    await expect(page.locator(`[data-theme="${theme.id}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await page.locator('#demo-timer').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#timer-value')).toHaveText('0 seconds');
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Try timer ticks' }).click();
  await expect(
    page.getByRole('button', { name: 'Try timer ticks' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#demo-shield').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#shield-value')).toHaveText('0%');
  await page.locator('#volume-master').focus();
  await page.keyboard.press('Home');
  expect(
    await page.evaluate(() => window.galleryAudio.getStatus().settings.master),
  ).toBe(0);
  await page.locator('#mute').check();
  expect(
    await page.evaluate(() => window.galleryAudio.getStatus().settings.mute),
  ).toBe(true);
  await page.locator('[data-sound="storm"]').click();
  await expect(page.locator('#sound-caption')).toHaveText(
    'Particles detected. Shelter now.',
  );
  await page.getByRole('button', { name: 'Stop all sounds' }).click();
  await expect(page.locator('#sound-caption')).toHaveText(
    'All sounds stopped.',
  );
  // Defaults plus an eight-voice stress mix through real Web Audio offline rendering.
  const pcm = ['alarm-x', 'ending-triumphant', 'storm', 'scramble'].map(
    (id) => {
      const { samples, sampleRate } = synthesize(id);
      return {
        id,
        sampleRate,
        data: Buffer.from(samples.buffer).toString('base64'),
      };
    },
  );
  const mix = await page.evaluate(async (buffers) => {
    const context = new OfflineAudioContext(1, 48000 * 10, 48000);
    const master = context.createGain(),
      compressor = context.createDynamicsCompressor();
    master.gain.value = 1;
    compressor.threshold.value = -9;
    compressor.knee.value = 6;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    master.connect(compressor);
    compressor.connect(context.destination);
    for (const item of buffers) {
      const raw = Uint8Array.from(atob(item.data), (char) =>
        char.charCodeAt(0),
      );
      const samples = new Float32Array(raw.buffer),
        buffer = context.createBuffer(1, samples.length, item.sampleRate);
      buffer.copyToChannel(samples, 0);
      const count = item.id === 'scramble' ? 1 : item.id === 'alarm-x' ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const source = context.createBufferSource(),
          gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = item.id === 'scramble' ? 0.3 : 1;
        source.connect(gain);
        gain.connect(master);
        source.start();
      }
    }
    const result = (await context.startRendering()).getChannelData(0);
    let peak = 0,
      energy = 0,
      finite = true;
    for (const sample of result) {
      peak = Math.max(peak, Math.abs(sample));
      energy += sample ** 2;
      finite &&= Number.isFinite(sample);
    }
    return { peak, rms: Math.sqrt(energy / result.length), finite };
  }, pcm);
  expect(mix.finite).toBe(true);
  expect(mix.peak).toBeLessThan(1);
  expect(mix.rms).toBeGreaterThan(0);
  const audioReport = testInfo.outputPath('audio-headroom.json');
  await writeFile(audioReport, JSON.stringify(mix, null, 2));
  await testInfo.attach('audio-headroom.json', {
    path: audioReport,
    contentType: 'application/json',
  });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator('.gallery')).toHaveAttribute('data-ready', 'true', {
    timeout: 30000,
  });
  await expect(page.locator('[data-model-state="loaded"]')).toHaveCount(29);
  await page.locator('[data-sound="pickup"]').click();
  await expect(page.locator('#sound-caption')).toHaveText('Supply picked up.');
  await page.getByRole('button', { name: 'Stop all sounds' }).click();
  await page.context().setOffline(false);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

test('reduced motion and unavailable WebGL keep the journal usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?gallery=1');
  await expect(page.locator('.gallery')).toHaveAttribute('data-ready', 'true', {
    timeout: 30000,
  });
  await expect(
    page.getByRole('button', { name: 'Resume rotation' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : getContext.call(this, type, ...args);
    };
  });
  await page.reload();
  await expect(page.locator('[data-model-state="fallback"]')).toHaveCount(29);
  await expect(page.locator('.gallery')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-sound="tap"]').click();
  await expect(page.locator('#sound-caption')).toHaveText('Button pressed.');
});
