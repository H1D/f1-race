import type { SoundDefinition } from "../../types";

export const floodWarningSound: SoundDefinition = {
  id: "flood-warning",
  category: "flood",
  mode: "oneshot",
  oscillators: [
    { type: "square", frequency: 440, gainMultiplier: 0.3 },
  ],
  filter: { type: "lowpass", frequency: 1200 },
  envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
  duration: 0.3,
  maxVoices: 1,
};

export const floodStartSound: SoundDefinition = {
  id: "flood-start",
  category: "flood",
  mode: "oneshot",
  noise: { type: "pink", gainMultiplier: 0.4 },
  oscillators: [
    { type: "sine", frequency: 100, gainMultiplier: 0.5 },
  ],
  filter: { type: "lowpass", frequency: 500 },
  envelope: { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.8 },
  duration: 1.0,
  maxVoices: 1,
};

export const floodEndSound: SoundDefinition = {
  id: "flood-end",
  category: "flood",
  mode: "oneshot",
  noise: { type: "pink", gainMultiplier: 0.3 },
  oscillators: [
    { type: "sine", frequency: 200, gainMultiplier: 0.3 },
  ],
  filter: { type: "highpass", frequency: 300 },
  envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 1.0 },
  duration: 0.5,
  maxVoices: 1,
};
