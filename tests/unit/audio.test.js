import { describe, expect, it, vi } from 'vitest';
import episodes from '../../public/data/episodes.json';
import {
  SOUND_CUES,
  THEMES,
  synthesize,
  timerInterval,
  tempoRate,
} from '../../src/audio/synth.js';
import {
  createAudio,
  audioSettings,
  DEFAULT_SETTINGS,
  MAX_VOICES,
} from '../../src/audio/index.js';

describe('original audio buffers', () => {
  it('maps saved independent levels without changing master mute', () => {
    expect(
      audioSettings({ sound: false, volume: 0.4, music: 0, sfx: 0.8 }),
    ).toEqual({
      master: 0.4,
      mute: true,
      music: 0,
      sfx: 0.8,
    });
    expect(audioSettings({ sound: true })).toEqual({
      ...DEFAULT_SETTINGS,
      mute: false,
    });
  });
  it('keeps every cue finite, quiet, deterministic, and smooth at boundaries', () => {
    for (const { id } of [...SOUND_CUES, ...THEMES]) {
      const { samples } = synthesize(id);
      let peak = 0,
        energy = 0,
        finite = true;
      for (const sample of samples) {
        finite &&= Number.isFinite(sample);
        peak = Math.max(peak, Math.abs(sample));
        energy += sample ** 2;
      }
      expect(finite).toBe(true);
      expect(peak).toBeLessThanOrEqual(0.450001);
      expect(energy).toBeGreaterThan(0);
      expect(samples[0]).toBe(0);
      expect(Math.abs(samples.at(-1))).toBeLessThan(0.00001);
      expect(
        Buffer.from(samples.buffer).equals(
          Buffer.from(synthesize(id).samples.buffer),
        ),
      ).toBe(true);
    }
  });
  it('makes eight crew signatures distinct and raises urgency with class and time', () => {
    const signatures = SOUND_CUES.filter((cue) =>
      cue.id.startsWith('crew-'),
    ).map((cue) =>
      Array.from(synthesize(cue.id).samples.slice(100, 115)).join(','),
    );
    expect(new Set(signatures).size).toBe(8);
    const energy = (id) =>
      synthesize(id).samples.reduce((sum, sample) => sum + sample ** 2, 0);
    expect(energy('alarm-x')).toBeGreaterThan(energy('alarm-m'));
    expect(energy('alarm-m')).toBeGreaterThan(energy('alarm-c'));
    expect(energy('alarm-c')).toBeGreaterThan(energy('alarm-b'));
    expect(timerInterval(1)).toBeLessThan(timerInterval(60));
    expect(tempoRate(1)).toBeGreaterThan(tempoRate(60));
    expect(() => synthesize('unknown')).toThrow();
  });
});

function fakeContext() {
  const parameter = () => ({
    value: 1,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: parameter(),
    frequency: parameter(),
    Q: parameter(),
  });
  return {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    sources: [],
    resume: vi.fn(async function () {
      this.state = 'running';
    }),
    close: vi.fn(async function () {
      this.state = 'closed';
    }),
    createGain: node,
    createBiquadFilter: node,
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: parameter(),
      knee: parameter(),
      ratio: parameter(),
      attack: parameter(),
      release: parameter(),
    }),
    createBuffer: () => ({ copyToChannel: vi.fn() }),
    createBufferSource() {
      const source = {
        ...node(),
        playbackRate: parameter(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      this.sources.push(source);
      return source;
    },
  };
}
describe('gesture-owned controller', () => {
  it('keeps warning captions readable over timer ticks, including when muted', async () => {
    const context = fakeContext();
    const caption = vi.fn();
    const audio = createAudio({
      contextFactory: () => context,
      onCaption: caption,
    });
    await audio.unlock();
    audio.setSettings({ mute: true });
    audio.play('storm');
    audio.startTicks();
    expect(caption).toHaveBeenLastCalledWith(
      'Particles detected. Shelter now.',
    );
    context.currentTime = 2;
    audio.startTicks();
    expect(caption).toHaveBeenLastCalledWith('Time is running short.');
    await audio.dispose();
  });
  it('supports every real flare class in the archived engine data', () => {
    const examples = new Map(
      episodes.flares.map((flare) => [flare.class[0], flare.class]),
    );
    const caption = vi.fn();
    const audio = createAudio({ onCaption: caption });
    for (const [prefix, flareClass] of examples) {
      expect(
        () => audio.alarm(flareClass),
        `Archived ${flareClass} must have a GAME cue`,
      ).not.toThrow();
      expect(caption).toHaveBeenLastCalledWith(
        `GAME alarm: ${prefix}-class example.`,
      );
    }
  });
  it('stays silent before unlock and under mute while retaining captions', async () => {
    const context = fakeContext(),
      factory = vi.fn(() => context),
      caption = vi.fn();
    const audio = createAudio({ contextFactory: factory, onCaption: caption });
    expect(factory).not.toHaveBeenCalled();
    expect(audio.play('storm')).toBe(false);
    expect(caption).toHaveBeenLastCalledWith(
      'Particles detected. Shelter now.',
    );
    audio.setSettings({ mute: true });
    await audio.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(audio.play('hop')).toBe(false);
    audio.setSettings({ mute: false });
    expect(audio.play('hop')).toBe(true);
    await audio.dispose();
    expect(context.close).toHaveBeenCalled();
    await expect(audio.unlock()).rejects.toThrow('disposed');
  });
  it('caps effect voices, crossfades music, validates inputs and stops every source', async () => {
    const context = fakeContext();
    const audio = createAudio({ contextFactory: () => context });
    expect(audio.getStatus().settings).toEqual(DEFAULT_SETTINGS);
    await audio.unlock();
    for (let i = 0; i < 30; i++) audio.play('pickup');
    expect(audio.getStatus().voices).toBe(MAX_VOICES);
    audio.setTheme('title');
    audio.setTheme('scramble');
    audio.setTimer(10);
    audio.setShield(0.1);
    expect(audio.getStatus().theme).toBe('scramble');
    audio.setTheme('shelter');
    for (let i = 0; i < 15; i++) audio.setTheme(THEMES[i % THEMES.length].id);
    expect(audio.getStatus().musicVoices).toBeLessThanOrEqual(2);
    audio.setSettings({ music: 9, sfx: -1 });
    expect(audio.getStatus().settings).toMatchObject({ music: 1, sfx: 0 });
    expect(() => audio.setSettings({ master: NaN })).toThrow();
    expect(() => audio.setTimer(Infinity)).toThrow();
    expect(() => audio.setShield(NaN)).toThrow();
    expect(() => audio.setTheme('missing')).toThrow();
    expect(() => audio.alarm('unknown')).toThrow();
    expect(audio.alarm('M2.4')).toBe(true);
    audio.stopAll();
    expect(
      context.sources.every((source) => source.stop.mock.calls.length > 0),
    ).toBe(true);
    expect(audio.getStatus().theme).toBe(null);
    await audio.dispose();
  });
});
