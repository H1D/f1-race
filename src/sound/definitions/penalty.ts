import type { SoundDefinition } from "../../types";

export const penaltySound: SoundDefinition = {
  id: "penalty",
  category: "penalty",
  mode: "oneshot",
  oscillators: [
    { type: "sawtooth", frequency: 200, gainMultiplier: 0.4 },
    { type: "sawtooth", frequency: 150, gainMultiplier: 0.3 },
  ],
  filter: { type: "lowpass", frequency: 800 },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.5 },
  duration: 0.4,
  maxVoices: 2,
};
