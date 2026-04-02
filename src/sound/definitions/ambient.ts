import type { SoundDefinition } from "../../types";

export const waterAmbientSound: SoundDefinition = {
  id: "water-ambient",
  category: "ambient",
  mode: "continuous",
  noise: { type: "pink", gainMultiplier: 0.8 },
  filter: { type: "lowpass", frequency: 300, Q: 0.7 },
  envelope: { attack: 1.0, decay: 0.5, sustain: 1.0, release: 1.0 },
  maxVoices: 1,
  mapParams: {
    gain: (p) => 0.02 + (p.speed / Math.max(p.maxSpeed, 1)) * 0.08,
    filterFreq: (p) => 200 + (p.speed / Math.max(p.maxSpeed, 1)) * 600,
  },
};
