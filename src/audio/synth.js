import { CREW } from '../core/config.js';
import { createRng } from '../core/rng.js';

/** Original GAME sonification. These pitches are not physical space sounds. */
export const SOUND_CUES = [
  ['hop', 'Moon hop', 'Hop!'],
  ['land', 'Soft landing', 'Boots land softly.'],
  ['pickup', 'Pick up supply', 'Supply picked up.'],
  ['deposit', 'Deposit supply', 'Supply stowed.'],
  ...CREW.map((crew) => [
    `crew-${crew.id}`,
    `${crew.name} chirp`,
    `${crew.name} is ready.`,
  ]),
  ['hatch', 'Close hatch', 'Hatch closed.'],
  ['tick', 'Timer tick', 'Time is running short.'],
  [
    'countdown-alarm',
    'Return to hatch alarm',
    'GAME timer: return to the hatch!',
  ],
  ['alarm-b', 'B-class alarm sample', 'GAME alarm: B-class example.'],
  ['alarm-c', 'C-class alarm sample', 'GAME alarm: C-class example.'],
  ['alarm-m', 'M-class alarm sample', 'GAME alarm: M-class example.'],
  ['alarm-x', 'X-class alarm sample', 'GAME alarm: X-class example.'],
  ['storm', 'Particle storm', 'Particles detected. Shelter now.'],
  ['radio', 'Radio message', 'Sun Watch message received.'],
  ['stamp', 'REAL stamp', 'Verified record stamped.'],
  ['page', 'Journal page', 'Journal page turned.'],
  ['drag', 'Lift item', 'Item lifted.'],
  ['drop', 'Place item', 'Item placed.'],
  ['tap', 'Button tap', 'Button pressed.'],
  ['ending-triumphant', 'Triumphant ending', 'Welcome home, crew!'],
  ['ending-bittersweet', 'Bittersweet ending', 'A gentle ride home.'],
  ['ending-silly', 'Silly ending', 'One more story for the journal.'],
].map(([id, name, caption]) => ({ id, name, caption }));
export const THEMES = [
  { id: 'title', name: 'Title · warm windows', caption: 'Calm title music.' },
  {
    id: 'scramble',
    name: 'Scramble · little moon steps',
    caption: 'Scramble music. Tempo follows the GAME timer.',
  },
  {
    id: 'shelter',
    name: 'Shelter · a quiet room',
    caption: 'Shelter music. Texture follows GAME shielding.',
  },
];
export function timerInterval(remaining, total = 60) {
  const fraction = Math.max(0, Math.min(1, remaining / Math.max(1, total)));
  return 0.16 + 0.84 * fraction;
}
export function tempoRate(remaining, total = 60) {
  return (
    0.85 + (1 - Math.max(0, Math.min(1, remaining / Math.max(1, total)))) * 0.85
  );
}

/** Render deterministic mono PCM with attack/release envelopes and no files/CDNs. */
export function synthesize(id, sampleRate = 22050) {
  const loop = THEMES.some((theme) => theme.id === id);
  if (!loop && !SOUND_CUES.some((cue) => cue.id === id))
    throw new Error(`Unknown sound: ${id}`);
  const duration = loop
    ? id === 'scramble'
      ? 8
      : 10
    : id.startsWith('ending-')
      ? 2.6
      : id === 'storm'
        ? 1.7
        : id === 'radio'
          ? 1.1
          : id.startsWith('alarm-') || id === 'countdown-alarm'
            ? 1.25
            : 0.65;
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  const random = createRng(`sound:${id}`);
  function tone(
    start,
    length,
    frequency,
    endFrequency = frequency,
    gain = 0.24,
    harmonic = 0.12,
  ) {
    const from = Math.round(start * sampleRate);
    const count = Math.round(length * sampleRate);
    let phase = 0;
    for (let i = 0; i < count && from + i < samples.length; i++) {
      const progress = i / count;
      phase +=
        (Math.PI * 2 * (frequency + (endFrequency - frequency) * progress)) /
        sampleRate;
      const envelope =
        Math.min(
          1,
          i / (sampleRate * 0.009),
          (count - i - 1) / (sampleRate * 0.04),
        ) * Math.exp(-progress * 2);
      samples[from + i] +=
        gain * envelope * (Math.sin(phase) + harmonic * Math.sin(phase * 2));
    }
  }
  function noise(start, length, gain) {
    let low = 0;
    const from = Math.round(start * sampleRate);
    const count = Math.round(length * sampleRate);
    for (let i = 0; i < count && from + i < samples.length; i++) {
      low = low * 0.87 + (random() * 2 - 1) * 0.13;
      const envelope = Math.sin((Math.PI * i) / count) ** 2;
      samples[from + i] += low * gain * envelope;
    }
  }
  if (loop) {
    const step = duration / 16;
    const notes =
      id === 'title'
        ? [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23]
        : id === 'scramble'
          ? [196, 246.94, 293.66, 392, 220, 261.63, 329.63, 440]
          : [130.81, 196, 164.81, 196, 146.83, 220, 174.61, 220];
    for (let i = 0; i < 16; i++) {
      tone(
        i * step,
        step * 0.85,
        notes[i % 8],
        notes[i % 8],
        0.17,
        id === 'scramble' ? 0.3 : 0.08,
      );
      if (i % 4 === 0)
        tone(
          i * step,
          step * 3.85,
          notes[i % 8] / 2,
          notes[i % 8] / 2,
          0.12,
          0.05,
        );
      if (id === 'scramble') tone(i * step, 0.08, 100, 65, 0.15, 0);
    }
  } else if (id.startsWith('crew-')) {
    const index = CREW.findIndex((crew) => `crew-${crew.id}` === id);
    const base = 330 + index * 35;
    [1, 1.25, 1.5]
      .slice(0, 2 + (index % 2))
      .forEach((ratio, i) =>
        tone(i * 0.14, 0.17, base * ratio, base * ratio * 1.02, 0.22),
      );
  } else if (id.startsWith('alarm-') || id === 'countdown-alarm') {
    const level = {
      'countdown-alarm': 1,
      'alarm-b': -1,
      'alarm-c': 0,
      'alarm-m': 1,
      'alarm-x': 2,
    }[id];
    for (let i = 0; i <= level + 1; i++)
      tone(
        i * 0.24,
        0.2,
        280 + level * 80,
        360 + level * 90,
        0.15 + level * 0.045,
        0.08,
      );
  } else if (id.startsWith('ending-')) {
    const notes =
      id === 'ending-triumphant'
        ? [261.63, 329.63, 392, 523.25]
        : id === 'ending-bittersweet'
          ? [392, 349.23, 329.63, 261.63]
          : [293.66, 440, 329.63, 587.33, 293.66];
    notes.forEach((note, i) => tone(i * 0.36, 0.65, note, note, 0.22));
  } else {
    const recipe = {
      hop: () => tone(0, 0.23, 160, 440),
      land: () => {
        tone(0, 0.14, 130, 60, 0.27);
        noise(0, 0.16, 0.2);
      },
      pickup: () => {
        tone(0, 0.18, 440, 550);
        tone(0.12, 0.25, 660);
      },
      deposit: () => {
        tone(0, 0.18, 330);
        tone(0.13, 0.25, 440);
      },
      hatch: () => {
        noise(0, 0.36, 0.4);
        tone(0.24, 0.17, 110, 90);
      },
      tick: () => tone(0, 0.065, 540, 500, 0.13),
      storm: () => {
        noise(0, 1.65, 0.5);
        tone(0.08, 1.4, 90, 65, 0.12);
      },
      radio: () => {
        noise(0, 0.43, 0.25);
        tone(0.4, 0.11, 620, 620, 0.14);
        tone(0.58, 0.11, 440, 440, 0.14);
      },
      stamp: () => {
        noise(0, 0.09, 0.3);
        tone(0, 0.17, 165, 65, 0.3);
      },
      page: () => noise(0, 0.38, 0.36),
      drag: () => tone(0, 0.12, 190, 260, 0.14),
      drop: () => tone(0, 0.13, 260, 190, 0.14),
      tap: () => tone(0, 0.07, 350, 330, 0.13),
    };
    recipe[id]();
  }
  // Every buffer has <=0.45 peak. Bus gains and compressor add mix headroom.
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  if (peak > 0.45)
    for (let i = 0; i < samples.length; i++) samples[i] *= 0.45 / peak;
  return { samples, sampleRate, duration: samples.length / sampleRate, loop };
}
