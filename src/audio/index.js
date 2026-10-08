import {
  SOUND_CUES,
  THEMES,
  synthesize,
  tempoRate,
  timerInterval,
} from './synth.js';

export { SOUND_CUES, THEMES };
export const DEFAULT_SETTINGS = {
  master: 0.55,
  music: 0.3,
  sfx: 0.6,
  mute: false,
};
export const MAX_VOICES = 8;

/** Gesture-owned Web Audio controller. Construction never starts browser audio. */
export function createAudio({
  contextFactory = () => new AudioContext(),
  onCaption = () => {},
} = {}) {
  let context, master, musicBus, sfxBus, filter, compressor, unlocking;
  let disposed = false,
    activeTheme = null,
    timer = null;
  let remaining = 60,
    total = 60,
    shield = 0.9;
  const settings = { ...DEFAULT_SETTINGS };
  const buffers = new Map(),
    voices = [],
    musicVoices = new Set(),
    fadingEffects = new Set();
  function ramp(parameter, value, duration = 0.05) {
    parameter.cancelScheduledValues(context.currentTime);
    parameter.setValueAtTime(parameter.value, context.currentTime);
    parameter.linearRampToValueAtTime(value, context.currentTime + duration);
  }
  function updateGains() {
    if (!context) return;
    ramp(master.gain, settings.mute ? 0 : settings.master);
    ramp(sfxBus.gain, settings.sfx);
    ramp(
      musicBus.gain,
      settings.music *
        (activeTheme?.id === 'shelter' ? 0.25 + (0.75 * shield) / 0.9 : 1),
    );
    ramp(
      filter.frequency,
      activeTheme?.id === 'shelter' ? 400 + (shield / 0.9) * 2500 : 9000,
    );
  }
  async function unlock() {
    if (disposed) throw new Error('Audio is disposed.');
    if (!context) {
      context = contextFactory();
      master = context.createGain();
      musicBus = context.createGain();
      sfxBus = context.createGain();
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.2;
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -9;
      compressor.knee.value = 6;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      sfxBus.connect(master);
      musicBus.connect(filter);
      filter.connect(master);
      master.connect(compressor);
      compressor.connect(context.destination);
      master.gain.value = settings.mute ? 0 : settings.master;
      musicBus.gain.value = settings.music;
      sfxBus.gain.value = settings.sfx;
      updateGains();
    }
    if (!unlocking)
      unlocking = context.resume().finally(() => {
        unlocking = null;
      });
    await unlocking;
    if (disposed) throw new Error('Audio is disposed.');
  }
  function buffer(id) {
    if (!buffers.has(id)) {
      const rendered = synthesize(id);
      const audioBuffer = context.createBuffer(
        1,
        rendered.samples.length,
        rendered.sampleRate,
      );
      audioBuffer.copyToChannel(rendered.samples, 0);
      buffers.set(id, audioBuffer);
    }
    return buffers.get(id);
  }
  function voice(id, bus, looping = false) {
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer(id);
    source.loop = looping;
    source.connect(gain);
    gain.connect(bus);
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.02);
    const entry = { source, gain, id, stopping: false };
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      musicVoices.delete(entry);
      fadingEffects.delete(entry);
      const index = voices.indexOf(entry);
      if (index >= 0) voices.splice(index, 1);
    };
    source.start();
    return entry;
  }
  function stopVoice(entry, seconds = 0.04, shorten = false) {
    if (entry.stopping && !shorten) return;
    entry.stopping = true;
    ramp(entry.gain.gain, 0, seconds);
    entry.source.stop(context.currentTime + seconds + 0.01);
  }
  function play(id) {
    const cue = SOUND_CUES.find((sound) => sound.id === id);
    if (!cue) throw new Error(`Unknown sound: ${id}`);
    onCaption(cue.caption);
    if (!context || context.state !== 'running' || disposed || settings.mute)
      return false;
    if (voices.length >= MAX_VOICES) {
      // Keep at most one tiny release tail during a burst of inputs.
      for (const fading of fadingEffects) {
        fading.source.stop(context.currentTime);
        fading.source.disconnect();
      }
      fadingEffects.clear();
      const oldest = voices.shift();
      fadingEffects.add(oldest);
      stopVoice(oldest, 0.01);
    }
    voices.push(voice(id, sfxBus));
    return true;
  }
  function alarm(flareClass) {
    const letter = String(flareClass).toLowerCase()[0];
    if (!['b', 'c', 'm', 'x'].includes(letter))
      throw new Error('Flare class must start with B, C, M, or X.');
    return play(`alarm-${letter}`);
  }
  function setTheme(id) {
    if (id !== null && !THEMES.some((theme) => theme.id === id))
      throw new Error(`Unknown theme: ${id}`);
    if (id === activeTheme?.id) return;
    if (activeTheme) stopVoice(activeTheme, 0.6);
    activeTheme = null;
    // Repeated theme taps cannot accumulate an unlimited crossfade stack.
    for (const entry of musicVoices) {
      if (musicVoices.size < 2) break;
      entry.source.stop(context.currentTime);
      entry.source.disconnect();
      musicVoices.delete(entry);
    }
    if (id) {
      onCaption(THEMES.find((theme) => theme.id === id).caption);
      if (context?.state === 'running' && !disposed) {
        activeTheme = voice(id, musicBus, true);
        musicVoices.add(activeTheme);
        activeTheme.gain.gain.cancelScheduledValues(context.currentTime);
        activeTheme.gain.gain.setValueAtTime(0, context.currentTime);
        activeTheme.gain.gain.linearRampToValueAtTime(
          1,
          context.currentTime + 0.6,
        );
        if (id === 'scramble')
          activeTheme.source.playbackRate.value = tempoRate(remaining, total);
      }
    }
    updateGains();
  }
  function setTimer(seconds, max = 60) {
    if (!Number.isFinite(seconds) || !Number.isFinite(max) || max <= 0)
      throw new Error('Timer needs finite seconds and a positive total.');
    remaining = Math.max(0, seconds);
    total = max;
    if (activeTheme?.id === 'scramble')
      ramp(activeTheme.source.playbackRate, tempoRate(remaining, total));
  }
  function setShield(value) {
    if (!Number.isFinite(value)) throw new Error('Shield must be finite.');
    shield = Math.max(0, Math.min(0.9, value));
    updateGains();
  }
  function setSettings(next) {
    for (const key of ['master', 'music', 'sfx'])
      if (key in next) {
        if (!Number.isFinite(next[key]))
          throw new Error(`${key} volume must be finite.`);
        settings[key] = Math.max(0, Math.min(1, next[key]));
      }
    if ('mute' in next) settings.mute = Boolean(next.mute);
    updateGains();
    return { ...settings };
  }
  function startTicks() {
    clearTimeout(timer);
    function tick() {
      if (disposed || remaining <= 0) return;
      play('tick');
      timer = setTimeout(tick, timerInterval(remaining, total) * 1000);
    }
    tick();
  }
  function stopAll() {
    clearTimeout(timer);
    timer = null;
    if (context) {
      for (const entry of [...voices, ...musicVoices, ...fadingEffects])
        stopVoice(entry, 0.04, true);
    }
    activeTheme = null;
    updateGains();
  }
  async function dispose() {
    stopAll();
    disposed = true;
    buffers.clear();
    if (context && context.state !== 'closed') await context.close();
  }
  return {
    unlock,
    play,
    alarm,
    setTheme,
    setTimer,
    setShield,
    setSettings,
    startTicks,
    stopAll,
    dispose,
    getStatus: () => ({
      unlocked: Boolean(context?.state === 'running'),
      disposed,
      theme: activeTheme?.id || null,
      voices: voices.length,
      musicVoices: musicVoices.size,
      settings: { ...settings },
      remaining,
      shield,
    }),
  };
}
