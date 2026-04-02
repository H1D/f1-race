import type { PowerupDefinition } from "../../types";

export const anchorDrag: PowerupDefinition = {
  id: "anchor-drag",
  name: "Anchor Drag",
  category: "canal",
  rarity: 0.3,

  spawn: {
    radius: 18,
    color: "#ff8844",
    icon: "⚓",
  },

  effect: {
    type: "duration",
    duration: 5.0,
    stacking: "ignore",
    maxStacks: 1,

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
    boatTint: "#ff8844",
    hudIcon: "⚓",
  },

  tunables: {
    speedMult: { value: 0.5, min: 0.1, max: 1.0, step: 0.05 },
    thrustMult: { value: 0.6, min: 0.1, max: 1.0, step: 0.05 },
  },
};
