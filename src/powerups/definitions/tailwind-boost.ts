import type { PowerupDefinition } from "../../types";

export const herringBoost: PowerupDefinition = {
  id: "herring-boost",
  name: "Herring Boost",
  category: "canal",
  rarity: 0.7,

  spawn: {
    radius: 20,
    color: "#22ee77",
    icon: "🐟",
  },

  effect: {
    type: "duration",
    duration: 4.0,
    stacking: "refresh",
    maxStacks: 1,

    onApply(_target, _source, state) {
      const sm = herringBoost.tunables!.speedMult!.value;
      const tm = herringBoost.tunables!.thrustMult!.value;
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
    trailEffect: "speed-lines",
    boatTint: "#22ee77",
    hudIcon: "🐟",
  },

  tunables: {
    speedMult: { value: 1.5, min: 1.0, max: 3.0, step: 0.1 },
    thrustMult: { value: 1.4, min: 1.0, max: 3.0, step: 0.1 },
  },
};
