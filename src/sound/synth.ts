import type { SoundEnvelope, OscillatorConfig, FilterConfig } from "../types";

// --- Noise buffer generation ---

export function createNoiseBuffer(
  ctx: AudioContext,
  type: "white" | "pink" | "brown",
  durationSec = 2,
): AudioBuffer {
  const length = ctx.sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5; // normalize amplitude
    }
  } else {
    // Pink noise — Voss-McCartney approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  return buffer;
}

// --- ADSR envelope ---

export function applyEnvelope(
  gain: GainNode,
  env: SoundEnvelope,
  startTime: number,
  peakGain: number,
): void {
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + env.attack);
  gain.gain.linearRampToValueAtTime(
    peakGain * env.sustain,
    startTime + env.attack + env.decay,
  );
}

export function triggerRelease(
  gain: GainNode,
  env: SoundEnvelope,
  now: number,
): void {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + env.release);
}

// --- Node builders ---

export function createOsc(
  ctx: AudioContext,
  config: OscillatorConfig,
  destination: AudioNode,
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = config.type;
  osc.frequency.value = config.frequency;
  if (config.detune) osc.detune.value = config.detune;

  if (config.gainMultiplier !== undefined && config.gainMultiplier < 1) {
    const g = ctx.createGain();
    g.gain.value = config.gainMultiplier;
    osc.connect(g).connect(destination);
  } else {
    osc.connect(destination);
  }

  return osc;
}

export function createFilter(
  ctx: AudioContext,
  config: FilterConfig,
): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = config.type;
  filter.frequency.value = config.frequency;
  if (config.Q !== undefined) filter.Q.value = config.Q;
  return filter;
}

export function createNoiseSource(
  ctx: AudioContext,
  buffer: AudioBuffer,
  destination: AudioNode,
  gainMultiplier: number,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  if (gainMultiplier < 1) {
    const g = ctx.createGain();
    g.gain.value = gainMultiplier;
    source.connect(g).connect(destination);
  } else {
    source.connect(destination);
  }

  return source;
}
