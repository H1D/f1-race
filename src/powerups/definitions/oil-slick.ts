import type { PowerupDefinition } from "../../types";
import { createZoneEntity } from "../../entity";

/** Zone effect applied to boats caught in the oil slick. */
export const oilSlickZone: PowerupDefinition = {
  id: "oil-slick-zone",
  name: "Diesel Spill",
  category: "canal",
  rarity: 0, // never spawns as a pickup — applied by zone only

  spawn: {
    radius: 0,
    color: "#88ee22",
    icon: "🫧",
  },

  effect: {
    type: "duration",
    duration: 0.3, // short TTL — refreshed each frame while inside zone
    stacking: "refresh",
    maxStacks: 1,

    onApply(target, _source, state) {
      state.speedMult = 0.35;
      state.thrustMult = 0.4;
      target.boatPhysics!.maxSpeed *= state.speedMult;
      target.boatPhysics!.thrustForce *= state.thrustMult;
    },

    onTick() {
      // must exist for zone-effects.ts to apply this effect
    },

    onExpire(target, state) {
      target.boatPhysics!.maxSpeed /= state.speedMult ?? 1;
      target.boatPhysics!.thrustForce /= state.thrustMult ?? 1;
    },
  },
};

/** Pickup that drops an oil slick zone at the boat's position. */
export const oilSlick: PowerupDefinition = {
  id: "oil-slick",
  name: "Diesel Spill",
  category: "canal",
  rarity: 0.5,

  spawn: {
    radius: 18,
    color: "#88ee22",
    icon: "🫧",
  },

  effect: {
    type: "instant",
    duration: 0,
    stacking: "stack",
    maxStacks: 3,

    onApply() {},
    onExpire() {},

    onSpawn(boat, _map) {
      return [
        createZoneEntity(
          boat.transform.pos.x,
          boat.transform.pos.y,
          50,
          "oil-slick-zone",
          boat.id,
          8.0,
          false, // doesn't slow the boat that dropped it
          "#88ee22",
        ),
      ];
    },
  },

  visual: {
    hudIcon: "🫧",
  },
};
