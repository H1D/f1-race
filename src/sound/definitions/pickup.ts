import type { SoundDefinition } from "../../types";

export const pickupSound: SoundDefinition = {
  id: "pickup",
  category: "pickup",
  mode: "oneshot",
  oscillators: [
    { type: "sine", frequency: 523, gainMultiplier: 0.5 },  // C5
    { type: "sine", frequency: 659, gainMultiplier: 0.3 },  // E5
    { type: "sine", frequency: 784, gainMultiplier: 0.2 },  // G5
  ],
  envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.3 },
  duration: 0.25,
  maxVoices: 2,
};

export const expireSound: SoundDefinition = {
  id: "expire",
  category: "pickup",
  mode: "oneshot",
  oscillators: [
    { type: "triangle", frequency: 400, gainMultiplier: 0.4 },
    { type: "triangle", frequency: 300, gainMultiplier: 0.3 },
  ],
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.4 },
  duration: 0.2,
  maxVoices: 2,
};
