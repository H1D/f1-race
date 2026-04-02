import type { PowerupDefinition } from "../../types";
import { drawStompotIcon } from "../../systems/powerup-icons";

export const mainCharacterSyndrome: PowerupDefinition = {
  id: "main-character-syndrome",
  name: "Main Character Syndrome",
  category: "flood",
  rarity: 0,  // never water-spawned — only from effendi attribute

  spawn: {
    radius: 20,
    color: "#ff44bb",
    icon: "👑",
  },

  effect: {
    type: "duration",
    duration: 3.0,
    stacking: "refresh",
    maxStacks: 1,

    onApply(_target, _source, _state) {
      // Camera follow + zoom is handled in RacingState by checking activeEffects
    },
    onExpire(_target, _state) {
      // Camera restore is handled in RacingState
    },
  },

  visual: {
    boatTint: "#ff44bb",
    hudIcon: "👑",
    drawIcon: drawStompotIcon,
  },
};
