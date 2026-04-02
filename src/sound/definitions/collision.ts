import type { SoundDefinition } from "../../types";

export const boatCollisionSound: SoundDefinition = {
  id: "boat-collision",
  category: "collision",
  mode: "oneshot",
  noise: { type: "white", gainMultiplier: 0.6 },
  oscillators: [
    { type: "sine", frequency: 200, gainMultiplier: 0.4 },
  ],
  filter: { type: "bandpass", frequency: 800, Q: 1.5 },
  envelope: { attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.15 },
  duration: 0.12,
  maxVoices: 3,
};

export const wallCollisionSound: SoundDefinition = {
  id: "wall-collision",
  category: "collision",
  mode: "oneshot",
  noise: { type: "brown", gainMultiplier: 0.5 },
  oscillators: [
    { type: "sine", frequency: 150, gainMultiplier: 0.5 },
  ],
  filter: { type: "lowpass", frequency: 600, Q: 1.0 },
  envelope: { attack: 0.003, decay: 0.06, sustain: 0.15, release: 0.2 },
  duration: 0.1,
  maxVoices: 3,
};
