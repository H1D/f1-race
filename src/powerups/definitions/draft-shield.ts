import type { PowerupDefinition } from "../../types";

export const draftShield: PowerupDefinition = {
  id: "draft-shield",
  name: "Draft Shield",
  category: "canal",
  rarity: 0.3,

  spawn: {
    radius: 18,
    color: "#44bbff",
    icon: "🛡️",
  },

  effect: {
    type: "duration",
    duration: 15.0,
    stacking: "replace",
    maxStacks: 1,

    onApply() {},
    onExpire() {},
  },

  visual: {
    boatTint: "#44bbff",
    hudIcon: "🛡️",
  },
};
