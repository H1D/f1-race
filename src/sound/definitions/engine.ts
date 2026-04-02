import type { SoundDefinition } from "../../types";

export const engineSound: SoundDefinition = {
  id: "engine",
  category: "engine",
  mode: "continuous",
  oscillators: [
    { type: "sawtooth", frequency: 80, gainMultiplier: 0.3 },
    { type: "square", frequency: 40, detune: 5, gainMultiplier: 0.2 },
  ],
  filter: { type: "lowpass", frequency: 400, Q: 2 },
  envelope: { attack: 0.3, decay: 0.1, sustain: 1.0, release: 0.5 },
  maxVoices: 2,
  mapParams: {
    frequency: (p) => 60 + p.voltage * 120,
    gain: (p) => 0.05 + p.voltage * 0.2,
    filterFreq: (p) => 200 + (p.speed / Math.max(p.maxSpeed, 1)) * 800,
  },
};
