import type {
  SoundSystem,
  SoundDefinition,
  SoundCategory,
  SoundParams,
  ActiveVoice,
} from "../types";
import {
  createNoiseBuffer,
  applyEnvelope,
  triggerRelease,
  createOsc,
  createFilter,
  createNoiseSource,
} from "./synth";
import { engineSound } from "./definitions/engine";
import { boatCollisionSound, wallCollisionSound } from "./definitions/collision";
import { pickupSound, expireSound } from "./definitions/pickup";
import { floodWarningSound, floodStartSound, floodEndSound } from "./definitions/flood";
import { waterAmbientSound } from "./definitions/ambient";
import { penaltySound } from "./definitions/penalty";

// --- Factory ---

export function createSoundSystem(): SoundSystem {
  return {
    ctx: null,
    masterGain: null,
    categoryGains: new Map(),
    definitions: new Map(),
    voices: [],
    nextVoiceId: 0,
    initialized: false,
    noiseBuffers: new Map(),
  };
}

// --- Registration ---

function registerSound(system: SoundSystem, def: SoundDefinition): void {
  system.definitions.set(def.id, def);
}

export function loadSoundDefinitions(system: SoundSystem): void {
  for (const def of [
    engineSound, boatCollisionSound, wallCollisionSound,
    pickupSound, expireSound,
    floodWarningSound, floodStartSound, floodEndSound,
    waterAmbientSound, penaltySound,
  ]) {
    registerSound(system, def);
  }
}

// --- AudioContext lifecycle ---

const ALL_CATEGORIES: SoundCategory[] = [
  "engine", "collision", "pickup", "flood", "ambient", "penalty",
];

export function initAudio(system: SoundSystem): void {
  if (system.initialized) return;

  const ctx = new AudioContext();
  system.ctx = ctx;

  // Master gain (default 0.3 — don't blast the user)
  system.masterGain = ctx.createGain();
  system.masterGain.gain.value = 0.3;
  system.masterGain.connect(ctx.destination);

  // Per-category gains
  for (const cat of ALL_CATEGORIES) {
    const g = ctx.createGain();
    g.gain.value = 1.0;
    g.connect(system.masterGain);
    system.categoryGains.set(cat, g);
  }

  // Pre-generate noise buffers
  for (const type of ["white", "pink", "brown"] as const) {
    system.noiseBuffers.set(type, createNoiseBuffer(ctx, type));
  }

  system.initialized = true;

  // Resume if suspended (Chrome autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

// --- Voice helpers ---

function voiceKey(definitionId: string, tag: string): string {
  return tag ? `${definitionId}:${tag}` : definitionId;
}

function findVoice(system: SoundSystem, definitionId: string, tag: string): ActiveVoice | undefined {
  const key = voiceKey(definitionId, tag);
  return system.voices.find(
    (v) => v.active && voiceKey(v.definitionId, v.tag) === key,
  );
}

function countVoicesForDef(system: SoundSystem, definitionId: string): number {
  let count = 0;
  for (const v of system.voices) {
    if (v.active && v.definitionId === definitionId) count++;
  }
  return count;
}

function stopVoiceImmediate(voice: ActiveVoice): void {
  voice.active = false;
  for (const osc of voice.oscillators) {
    try { osc.stop(); } catch { /* already stopped */ }
  }
  if (voice.noiseSource) {
    try { voice.noiseSource.stop(); } catch { /* already stopped */ }
  }
  voice.gainNode.disconnect();
}

function buildVoice(
  system: SoundSystem,
  def: SoundDefinition,
  tag: string,
  peakGain: number,
): ActiveVoice | null {
  const ctx = system.ctx;
  if (!ctx) return null;

  const categoryGain = system.categoryGains.get(def.category);
  if (!categoryGain) return null;

  const now = ctx.currentTime;

  // Voice gain → filter (optional) → category gain
  const voiceGain = ctx.createGain();
  voiceGain.gain.value = 0;

  let filterNode: BiquadFilterNode | null = null;
  let audioTarget: AudioNode;

  if (def.filter) {
    filterNode = createFilter(ctx, def.filter);
    filterNode.connect(categoryGain);
    audioTarget = filterNode;
  } else {
    audioTarget = categoryGain;
  }

  voiceGain.connect(audioTarget);

  // Oscillators
  const oscillators: OscillatorNode[] = [];
  if (def.oscillators) {
    for (const config of def.oscillators) {
      oscillators.push(createOsc(ctx, config, voiceGain));
    }
  }

  // Noise source
  let noiseSource: AudioBufferSourceNode | null = null;
  if (def.noise) {
    const buffer = system.noiseBuffers.get(def.noise.type);
    if (buffer) {
      noiseSource = createNoiseSource(ctx, buffer, voiceGain, def.noise.gainMultiplier);
    }
  }

  // ADSR envelope
  applyEnvelope(voiceGain, def.envelope, now, peakGain);

  // For oneshots, schedule the release; for continuous just start sources
  const duration = def.mode === "oneshot" ? (def.duration ?? 0.2) : -1;
  if (def.mode === "oneshot") {
    const releaseStart = now + duration;
    voiceGain.gain.cancelScheduledValues(releaseStart);
    voiceGain.gain.setValueAtTime(peakGain * def.envelope.sustain, releaseStart);
    voiceGain.gain.linearRampToValueAtTime(0, releaseStart + def.envelope.release);

    const stopTime = releaseStart + def.envelope.release + 0.05;

    // Start first — Web Audio requires start() before stop()
    for (const osc of oscillators) osc.start(now);
    if (noiseSource) noiseSource.start(now);

    for (const osc of oscillators) osc.stop(stopTime);
    if (noiseSource) noiseSource.stop(stopTime);
  } else {
    // Continuous — just start
    for (const osc of oscillators) osc.start(now);
    if (noiseSource) noiseSource.start(now);
  }

  const voice: ActiveVoice = {
    id: system.nextVoiceId++,
    definitionId: def.id,
    tag,
    oscillators,
    noiseSource,
    gainNode: voiceGain,
    filterNode,
    startTime: now,
    duration,
    releaseTime: def.mode === "oneshot" ? now + duration : -1,
    releaseDuration: def.envelope.release,
    active: true,
  };

  system.voices.push(voice);
  return voice;
}

// --- Public API ---

export function playSound(
  system: SoundSystem,
  soundId: string,
  options?: { intensity?: number; volume?: number },
): number {
  if (!system.initialized) return -1;

  const def = system.definitions.get(soundId);
  if (!def || def.mode !== "oneshot") return -1;

  // Voice stealing if at max
  const count = countVoicesForDef(system, soundId);
  if (count >= def.maxVoices) {
    const oldest = system.voices.find(
      (v) => v.active && v.definitionId === soundId,
    );
    if (oldest) stopVoiceImmediate(oldest);
  }

  const intensity = Math.max(0.05, Math.min(1, options?.intensity ?? 1));
  const volume = options?.volume ?? 1;
  const peakGain = intensity * volume;

  const voice = buildVoice(system, def, "", peakGain);
  return voice ? voice.id : -1;
}

export function startContinuous(
  system: SoundSystem,
  soundId: string,
  tag = "",
): number {
  if (!system.initialized) return -1;

  // Idempotent — if already playing, return existing voice
  const existing = findVoice(system, soundId, tag);
  if (existing) return existing.id;

  const def = system.definitions.get(soundId);
  if (!def || def.mode !== "continuous") return -1;

  const voice = buildVoice(system, def, tag, 0.15);
  return voice ? voice.id : -1;
}

export function updateContinuous(
  system: SoundSystem,
  soundId: string,
  params: SoundParams,
  tag = "",
): void {
  if (!system.initialized || !system.ctx) return;

  const voice = findVoice(system, soundId, tag);
  if (!voice) return;

  const def = system.definitions.get(soundId);
  if (!def?.mapParams) return;

  const now = system.ctx.currentTime;
  const smoothing = 0.016; // ~1 frame time constant

  // Update oscillator frequencies
  if (def.mapParams.frequency && voice.oscillators.length > 0) {
    const baseFreq = def.mapParams.frequency(params);
    for (let i = 0; i < voice.oscillators.length; i++) {
      const osc = voice.oscillators[i]!;
      const oscDef = def.oscillators?.[i];
      // Scale relative to original ratio
      const ratio = oscDef ? oscDef.frequency / (def.oscillators?.[0]?.frequency ?? oscDef.frequency) : 1;
      osc.frequency.setTargetAtTime(baseFreq * ratio, now, smoothing);
    }
  }

  // Update gain
  if (def.mapParams.gain) {
    const gain = def.mapParams.gain(params);
    voice.gainNode.gain.setTargetAtTime(gain, now, smoothing);
  }

  // Update filter frequency
  if (def.mapParams.filterFreq && voice.filterNode) {
    const freq = def.mapParams.filterFreq(params);
    voice.filterNode.frequency.setTargetAtTime(freq, now, smoothing);
  }
}

export function stopContinuous(
  system: SoundSystem,
  soundId: string,
  tag = "",
): void {
  if (!system.ctx) return;

  const voice = findVoice(system, soundId, tag);
  if (!voice) return;

  const def = system.definitions.get(soundId);
  if (!def) return;

  const now = system.ctx.currentTime;
  triggerRelease(voice.gainNode, def.envelope, now);

  const stopTime = now + def.envelope.release + 0.05;
  for (const osc of voice.oscillators) {
    try { osc.stop(stopTime); } catch { /* already scheduled */ }
  }
  if (voice.noiseSource) {
    try { voice.noiseSource.stop(stopTime); } catch { /* already scheduled */ }
  }

  voice.releaseTime = now;
}

// --- Per-tick housekeeping ---

export function updateSound(system: SoundSystem, _dt: number): void {
  if (!system.ctx) return;

  const now = system.ctx.currentTime;
  let writeIdx = 0;

  for (let i = 0; i < system.voices.length; i++) {
    const v = system.voices[i]!;
    if (!v.active) continue;

    // Check if oneshot/released voice has finished
    if (v.releaseTime >= 0) {
      const endTime = v.releaseTime + v.releaseDuration + 0.1;
      if (now > endTime) {
        v.active = false;
        v.gainNode.disconnect();
        continue;
      }
    }

    system.voices[writeIdx++] = v;
  }
  system.voices.length = writeIdx;
}

// --- Volume controls ---

export function setCategoryGain(
  system: SoundSystem,
  category: SoundCategory,
  gain: number,
): void {
  const node = system.categoryGains.get(category);
  if (node) node.gain.value = Math.max(0, Math.min(1, gain));
}

export function setMasterGain(system: SoundSystem, gain: number): void {
  if (system.masterGain) {
    system.masterGain.gain.value = Math.max(0, Math.min(1, gain));
  }
}

// --- Cleanup ---

export function destroySound(system: SoundSystem): void {
  for (const voice of system.voices) {
    stopVoiceImmediate(voice);
  }
  system.voices.length = 0;

  if (system.ctx) {
    system.ctx.close();
    system.ctx = null;
  }

  system.masterGain = null;
  system.categoryGains.clear();
  system.noiseBuffers.clear();
  system.initialized = false;
}
