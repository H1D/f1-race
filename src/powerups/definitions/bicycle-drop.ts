import type { PowerupDefinition } from "../../types";
import { createObstacleEntity } from "../../entity";
import { drawBicycleIcon } from "../../systems/powerup-icons";

export const bicycleDrop: PowerupDefinition = {
  id: "bicycle-drop",
  name: "Bicycle Drop",
  category: "canal",
  rarity: 0,  // never water-spawned — only from bike-shop attribute

  spawn: {
    radius: 18,
    color: "#ff7733",
    icon: "🚲",
  },

  effect: {
    type: "instant",
    duration: 0,
    stacking: "stack",
    maxStacks: 2,

    onApply(_target, _source, _state) {},
    onExpire(_target, _state) {},

    onSpawn(boat, _map) {
      // Drop perpendicular bicycle obstacle behind the boat
      const angle = boat.transform.angle;
      const backX = boat.transform.pos.x - Math.cos(angle) * 50;
      const backY = boat.transform.pos.y - Math.sin(angle) * 50;
      return [
        createObstacleEntity(backX, backY, angle + Math.PI / 2, {
          width: 44,
          height: 20,
          lifetime: 8.0,
          color: "#cc6622",
          radius: 22,
        }),
      ];
    },
  },

  visual: {
    hudIcon: "🚲",
    drawIcon: drawBicycleIcon,
  },
};
