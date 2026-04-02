import type { PowerupDefinition } from "../../types";
import { drawBicycleIcon } from "../../systems/powerup-icons";

export const anchorDrag: PowerupDefinition = {
  id: "anchor-drag",
  name: "Bicycle Drag",
  category: "canal",
  rarity: 0.3,

  spawn: {
    radius: 18,
    color: "#ee3344",
    icon: "⚓",
  },

  effect: {
    type: "duration",
    duration: 5.0,
    stacking: "ignore",
    maxStacks: 1,

    canApply(target) {
      const idx = target.activeEffects?.effects.findIndex(
        (e) => e.powerupId === "draft-shield",
      ) ?? -1;
      if (idx >= 0) {
        // Shield absorbs this — consume it
        target.activeEffects!.effects.splice(idx, 1);
        return false;
      }
      return true;
    },

    onApply(_target, _source, state) {
      const sm = anchorDrag.tunables!.speedMult!.value;
      const tm = anchorDrag.tunables!.thrustMult!.value;
      state.speedMult = sm;
      state.thrustMult = tm;
      _target.boatPhysics!.maxSpeed *= sm;
      _target.boatPhysics!.thrustForce *= tm;
    },

    onExpire(target, state) {
      target.boatPhysics!.maxSpeed /= state.speedMult ?? 1;
      target.boatPhysics!.thrustForce /= state.thrustMult ?? 1;
    },
  },

  visual: {
    trailEffect: "drag-bubbles",
    boatTint: "#ee3344",
    hudIcon: "⚓",
    drawIcon: drawBicycleIcon,
  },

  tunables: {
    speedMult: { value: 0.5, min: 0.1, max: 1.0, step: 0.05 },
    thrustMult: { value: 0.6, min: 0.1, max: 1.0, step: 0.05 },
  },
};
