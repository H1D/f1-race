import type { PowerupDefinition } from "../../types";
import { createBridgeBarrierEntity } from "../../entity";

export const canalLock: PowerupDefinition = {
  id: "canal-lock",
  name: "Canal Lock",
  category: "canal",
  rarity: 0.4,

  spawn: {
    radius: 18,
    color: "#88ee22",
    icon: "🌉",
  },

  effect: {
    type: "instant",
    duration: 0,
    stacking: "stack",
    maxStacks: 3,

    onApply() {},
    onExpire() {},

    onSpawn(boat, map) {
      if (map.bridges.length === 0) return [];

      // Find the nearest bridge to the boat
      const bx = boat.transform.pos.x;
      const by = boat.transform.pos.y;

      let nearest = map.bridges[0]!;
      let nearestDist = Infinity;
      for (const bridge of map.bridges) {
        const mx = (bridge.start.x + bridge.end.x) / 2;
        const my = (bridge.start.y + bridge.end.y) / 2;
        const d = (mx - bx) ** 2 + (my - by) ** 2;
        if (d < nearestDist) {
          nearestDist = d;
          nearest = bridge;
        }
      }

      const midX = (nearest.start.x + nearest.end.x) / 2;
      const midY = (nearest.start.y + nearest.end.y) / 2;
      const dx = nearest.end.x - nearest.start.x;
      const dy = nearest.end.y - nearest.start.y;
      const angle = Math.atan2(dy, dx);
      const span = Math.sqrt(dx * dx + dy * dy);

      return [createBridgeBarrierEntity(midX, midY, angle, span)];
    },
  },

  visual: {
    hudIcon: "🌉",
  },
};
